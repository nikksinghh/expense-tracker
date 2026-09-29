const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const { roundToPaise } = require('../services/calculationService');
const { checkBudgetThresholds } = require('../services/notificationService');

// @desc    Get budget and spending status for month
// @route   GET /api/budgets
// @access  Private
const getBudgetStatus = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    // Find room budget
    let budget = await Budget.findOne({
      room: req.user.room,
      user: null,
      month,
      year
    });

    // If no budget explicitly created, look for previous month's budget to suggest, or null
    let monthlyLimit = budget ? budget.monthlyLimit : 0;
    const thresholds = budget ? budget.thresholds : [75, 90, 100];

    // Compute actual spending in that month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      room: req.user.room,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalSpending = roundToPaise(
      expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    );

    const remaining = monthlyLimit > 0 ? Math.max(0, roundToPaise(monthlyLimit - totalSpending)) : 0;
    const percentageUsed = monthlyLimit > 0 ? Math.min(999, Math.round((totalSpending / monthlyLimit) * 100)) : 0;

    let status = 'normal';
    let message = 'You are within budget. Keep it up!';

    if (monthlyLimit > 0) {
      if (percentageUsed >= 100) {
        status = 'exceeded';
        message = 'Budget limit exceeded! Reduce unnecessary expenses.';
      } else if (percentageUsed >= 90) {
        status = 'critical';
        message = 'Critical warning! Over 90% of budget consumed.';
      } else if (percentageUsed >= 75) {
        status = 'warning';
        message = 'Caution: Over 75% of budget consumed.';
      }
    } else {
      message = 'No budget set for this month. Set a budget to track spending.';
    }

    res.status(200).json({
      success: true,
      budget: budget || null,
      month,
      year,
      monthlyLimit,
      totalSpending,
      remaining,
      percentageUsed,
      status,
      message,
      thresholds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update monthly room budget
// @route   POST /api/budgets
// @access  Private
const setBudget = async (req, res, next) => {
  try {
    const { month, year, monthlyLimit, thresholds } = req.body;

    if (!monthlyLimit || monthlyLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid budget limit greater than zero'
      });
    }

    const now = new Date();
    const targetMonth = parseInt(month, 10) || now.getMonth() + 1;
    const targetYear = parseInt(year, 10) || now.getFullYear();

    const updatedBudget = await Budget.findOneAndUpdate(
      {
        room: req.user.room,
        user: null,
        month: targetMonth,
        year: targetYear
      },
      {
        monthlyLimit: roundToPaise(monthlyLimit),
        thresholds: thresholds || [75, 90, 100]
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Recheck thresholds immediately
    await checkBudgetThresholds(req.user.room, targetYear, targetMonth);

    res.status(200).json({
      success: true,
      message: 'Monthly budget updated successfully',
      budget: updatedBudget
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgetStatus,
  setBudget
};
