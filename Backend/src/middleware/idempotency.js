const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

/**
 * Robust Concurrency-Safe Idempotency Middleware
 * 
 * Flow:
 * 1. Checks 'Idempotency-Key' header or body 'idempotencyKey'.
 * 2. If present, creates an atomic reservation in MongoDB with unique index.
 * 3. If a duplicate concurrent request arrives:
 *    - If original request is COMPLETED: replays cached response with header 'Idempotent-Replayed: true'.
 *    - If original request is IN_PROGRESS: returns 409 Conflict.
 * 4. Intercepts res.json to capture response and atomically mark key COMPLETED.
 * 5. If operation errors out, marks key FAILED.
 */
const requireIdempotency = (actionName) => async (req, res, next) => {
  const rawKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;
  if (!rawKey) {
    return next();
  }

  const userId = req.user?._id;
  if (!userId) {
    return next();
  }

  const sanitizedKey = `${userId}:${String(rawKey).trim()}`;
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  try {
    const record = await IdempotencyKey.create({
      key: sanitizedKey,
      user: userId,
      action: actionName,
      requestHash,
      status: 'IN_PROGRESS'
    });

    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      try {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        await IdempotencyKey.findByIdAndUpdate(record._id, {
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          responseStatus: res.statusCode,
          responseBody: body
        });
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Idempotency update error:', err.message);
        }
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    // Duplicate key error (E11000) -> concurrent or duplicate request
    if (err.code === 11000) {
      const existing = await IdempotencyKey.findOne({ key: sanitizedKey });
      if (!existing) {
        return res.status(409).json({
          success: false,
          message: 'Concurrent request conflict detected. Please retry in a moment.'
        });
      }

      // Check request hash to prevent reusing key for a different payload
      if (existing.requestHash !== requestHash) {
        return res.status(422).json({
          success: false,
          message: 'Idempotency key reused with a different request payload.'
        });
      }

      if (existing.status === 'COMPLETED') {
        res.setHeader('Idempotent-Replayed', 'true');
        return res.status(existing.responseStatus || 200).json(existing.responseBody);
      }

      if (existing.status === 'IN_PROGRESS') {
        return res.status(409).json({
          success: false,
          message: 'A request with this idempotency key is currently processing. Please wait.'
        });
      }

      // If previous attempt was FAILED, allow re-execution by updating status to IN_PROGRESS
      existing.status = 'IN_PROGRESS';
      await existing.save();

      const originalJson = res.json.bind(res);
      res.json = async function (body) {
        try {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
          await IdempotencyKey.findByIdAndUpdate(existing._id, {
            status: isSuccess ? 'COMPLETED' : 'FAILED',
            responseStatus: res.statusCode,
            responseBody: body
          });
        } catch (updateErr) {
          if (process.env.NODE_ENV !== 'test') {
            console.error('Idempotency update error:', updateErr.message);
          }
        }
        return originalJson(body);
      };

      return next();
    }

    next(err);
  }
};

module.exports = { requireIdempotency };
