const express = require('express');
const { body } = require('express-validator');
const {
  updateProfile,
  changePassword,
  updateTheme
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.put(
  '/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    validate
  ],
  updateProfile
);

router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validate
  ],
  changePassword
);

router.put(
  '/theme',
  [
    body('theme').isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
    validate
  ],
  updateTheme
);

module.exports = router;
