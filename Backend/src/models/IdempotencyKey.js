const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true
    },
    requestHash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'IN_PROGRESS'
    },
    responseStatus: {
      type: Number,
      default: null
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // Automatically expire after 24 hours (MongoDB TTL index)
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
