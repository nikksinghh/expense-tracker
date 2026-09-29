const express = require('express');
const { body } = require('express-validator');
const { getBudgetStatus, setBudget } = require('../controllers/budgetController');
const { protect, requireRoom } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.use(requireRoom);

router
  .route('/')
  .get(getBudgetStatus)
  .post(
    [
      body('monthlyLimit')
        .isFloat({ min: 1 })
        .withMessage('Monthly budget limit must be at least ₹1'),
      validate
    ],
    setBudget
  );

module.exports = router;
