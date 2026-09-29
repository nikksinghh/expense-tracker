const rateLimit = require('express-rate-limit');
const { NODE_ENV } = require('../config/env');

// General API rate limiter: 300 requests per 15 minutes
const apiLimiter =
  NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        message: {
          success: false,
          message: 'Too many requests from this IP, please try again after 15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
      });

// Stricter rate limiter for auth (login/register): 30 requests per 15 minutes
const authLimiter =
  NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        message: {
          success: false,
          message: 'Too many authentication attempts, please try again after 15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
      });

module.exports = { apiLimiter, authLimiter };
