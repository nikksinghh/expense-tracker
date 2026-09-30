const express = require('express');
const { body } = require('express-validator');
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getExpenseTrend,
  getCategoryBreakdown
} = require('../controllers/expenseController');
const { protect, requireRoom } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.use(requireRoom);

router.get('/stats', getExpenseStats);
router.get('/trend', getExpenseTrend);
router.get('/categories', getCategoryBreakdown);

router
  .route('/')
  .post(
    [
      body('title').trim().notEmpty().withMessage('Expense title is required'),
      body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
      body('category')
        .isIn([
          'Rent',
          'Food',
          'Grocery',
          'Electricity',
          'Internet',
          'Travel',
          'Household',
          'Maintenance',
          'Entertainment',
          'Others'
        ])
        .withMessage('Invalid category'),
      body('type')
        .optional()
        .isIn(['shared', 'personal'])
        .withMessage('Type must be shared or personal'),
      body('splitMode')
        .optional()
        .isIn(['equal', 'custom'])
        .withMessage('Split mode must be equal or custom'),
      validate
    ],
    createExpense
  )
  .get(getExpenses);

router
  .route('/:id')
  .get(getExpenseById)
  .put(
    [
      body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Title cannot be empty'),
      body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than zero'),
      validate
    ],
    updateExpense
  )
  .delete(deleteExpense);

module.exports = router;
