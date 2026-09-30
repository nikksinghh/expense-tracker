const express = require('express');
const { body } = require('express-validator');
const {
  register, login, googleLogin, logout, getMe,
  forgotPassword, resetPassword, checkPasswordStrength
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    validate
  ],
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  login
);

router.post(
  '/google',
  authLimiter,
  [
    body('credential').trim().notEmpty().withMessage('Google credential token is required'),
    validate
  ],
  googleLogin
);

router.post('/logout', logout);
router.get('/me', protect, getMe);

router.post(
  '/forgot-password',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid registered email address'),
    validate
  ],
  forgotPassword
);

router.put(
  '/reset-password/:token',
  authLimiter,
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validate
  ],
  resetPassword
);

router.post('/check-password', checkPasswordStrength);

module.exports = router;
