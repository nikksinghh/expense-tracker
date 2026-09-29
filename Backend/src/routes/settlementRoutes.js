const express = require('express');
const { body } = require('express-validator');
const {
  getSettlementStatus,
  recordSettlement,
  getSettlementHistory,
  deleteSettlement
} = require('../controllers/settlementController');
const { protect, requireRoom } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.use(requireRoom);

router.get('/status', getSettlementStatus);

router
  .route('/')
  .get(getSettlementHistory)
  .post(
    [
      body('receiver').notEmpty().withMessage('Receiver ID is required'),
      body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Settlement amount must be greater than zero'),
      body('paymentMethod')
        .optional()
        .isIn(['UPI', 'Cash', 'Bank Transfer', 'Other'])
        .withMessage('Invalid payment method'),
      validate
    ],
    recordSettlement
  );

router.delete('/:id', deleteSettlement);

module.exports = router;
