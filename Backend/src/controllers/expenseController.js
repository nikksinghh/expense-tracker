const Expense = require('../models/Expense');
const Room = require('../models/Room');
const { calculateExpenseParticipants } = require('../services/calculationService');
const { checkBudgetThresholds, createNotification } = require('../services/notificationService');

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res, next) => {
  try {
    const {
      title,
      amount,
      category,
      date,
      payer,
      type = 'shared',
      splitMode = 'equal',
      participants = [],
      notes,
      receiptUrl
    } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and amount'
      });
    }

    const room = await Room.findById(req.user.room);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'You must belong to a room to add expenses'
      });
    }

    const payerId = payer || req.user._id;

    // Verify payer is a room member
    if (!room.members.some((m) => m.toString() === payerId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Payer must be an active room member'
      });
    }

    // Calculate participant shares
    const computedParticipants = calculateExpenseParticipants({
      amount: Number(amount),
      type,
      splitMode,
      payerId,
      roomMemberIds: room.members,
      customParticipants: participants
    });

    const expense = await Expense.create({
      room: room._id,
      title: title.trim(),
      amount: Number(amount),
      category: category || 'Others',
      date: date ? new Date(date) : new Date(),
      payer: payerId,
      type,
      splitMode,
      participants: computedParticipants,
      notes: notes || '',
      receiptUrl: receiptUrl || '',
      createdBy: req.user._id
    });

    await expense.populate('payer', 'name email avatar upiId');
    await expense.populate('participants.user', 'name email avatar');

    // Asynchronously trigger budget threshold alert if crossed
    const expDate = new Date(expense.date);
    checkBudgetThresholds(room._id, expDate.getFullYear(), expDate.getMonth() + 1);

    // Notify other roommate
    const otherMemberId = room.members.find(
      (m) => m.toString() !== req.user._id.toString()
    );
    if (otherMemberId) {
      const typeLabel = type === 'personal' ? 'personal' : 'shared';
      createNotification({
        userId: otherMemberId,
        roomId: room._id,
        title: `💸 New ${typeLabel} expense added`,
        message: `${req.user.name} added "${expense.title}" for ₹${expense.amount} (${expense.category}).`,
        type: 'expense',
        link: '/expenses'
      });
    }

    const expObj = expense.toObject();
    expObj.paidBy = expObj.payer; // Alias for frontend compatibility

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      expense: expObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all expenses for current room with filtering, search & pagination
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    const {
      month,
      year,
      startDate,
      endDate,
      category,
      payer,
      type,
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = { room: req.user.room };

    // Month & Year filter
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Payer filter
    if (payer && payer !== 'All') {
      query.payer = payer;
    }

    // Type filter (shared vs personal)
    if (type && type !== 'All') {
      query.type = type;
    }

    // Text search on title or notes
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { notes: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('payer', 'name email avatar upiId')
        .populate('participants.user', 'name email avatar')
        .populate('createdBy', 'name'),
      Expense.countDocuments(query)
    ]);

    const expensesWithAlias = expenses.map(e => {
      const obj = e.toObject();
      obj.paidBy = obj.payer;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      expenses: expensesWithAlias
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single expense by ID
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      room: req.user.room
    })
      .populate('payer', 'name email avatar upiId')
      .populate('participants.user', 'name email avatar')
      .populate('createdBy', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      room: req.user.room
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const room = await Room.findById(req.user.room);
    const {
      title,
      amount,
      category,
      date,
      payer,
      type,
      splitMode,
      participants,
      notes,
      receiptUrl
    } = req.body;

    const newAmount = amount !== undefined ? Number(amount) : expense.amount;
    const newType = type || expense.type;
    const newSplitMode = splitMode || expense.splitMode;
    const newPayer = payer || expense.payer;

    const computedParticipants = calculateExpenseParticipants({
      amount: newAmount,
      type: newType,
      splitMode: newSplitMode,
      payerId: newPayer,
      roomMemberIds: room.members,
      customParticipants: participants || expense.participants
    });

    expense.title = title !== undefined ? title.trim() : expense.title;
    expense.amount = newAmount;
    expense.category = category || expense.category;
    expense.date = date ? new Date(date) : expense.date;
    expense.payer = newPayer;
    expense.type = newType;
    expense.splitMode = newSplitMode;
    expense.participants = computedParticipants;
    if (notes !== undefined) expense.notes = notes;
    if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;

    await expense.save();

    await expense.populate('payer', 'name email avatar upiId');
    await expense.populate('participants.user', 'name email avatar');

    const expDate = new Date(expense.date);
    checkBudgetThresholds(room._id, expDate.getFullYear(), expDate.getMonth() + 1);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      room: req.user.room
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or already deleted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense statistics for dashboard & reports
// @route   GET /api/expenses/stats
// @access  Private
const getExpenseStats = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      room: req.user.room,
      date: { $gte: start, $lte: end }
    }).populate('payer', 'name email avatar upiId');

    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const count = expenses.length;
    const currentUserId = req.user._id.toString();

    let yourShare = 0;
    let roommateShare = 0;

    expenses.forEach(exp => {
      const isPayer = (exp.payer?._id || exp.payer)?.toString() === currentUserId;
      if (exp.type === 'personal') {
        if (isPayer) yourShare += exp.amount;
        else roommateShare += exp.amount;
      } else {
        // Shared expense
        const myPart = exp.participants?.find(p => (p.user?._id || p.user)?.toString() === currentUserId);
        if (myPart) {
          yourShare += (myPart.shareAmount || 0);
          roommateShare += (exp.amount - (myPart.shareAmount || 0));
        } else {
          // Default equal split
          const split = (exp.amount || 0) / 2;
          yourShare += split;
          roommateShare += split;
        }
      }
    });

    res.status(200).json({
      success: true,
      totalAmount: Math.round(totalAmount * 100) / 100,
      yourShare: Math.round(yourShare * 100) / 100,
      roommateShare: Math.round(roommateShare * 100) / 100,
      count,
      month,
      year
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get 6-month historical expense trend
// @route   GET /api/expenses/trend
// @access  Private
const getExpenseTrend = async (req, res, next) => {
  try {
    const monthsCount = parseInt(req.query.months, 10) || 6;
    const now = new Date();
    const currentUserId = req.user._id.toString();
    const trend = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);

      const expenses = await Expense.find({
        room: req.user.room,
        date: { $gte: start, $lte: end }
      });

      let total = 0;
      let yourShare = 0;
      let roommateShare = 0;

      expenses.forEach(exp => {
        total += exp.amount || 0;
        const isPayer = (exp.payer?._id || exp.payer)?.toString() === currentUserId;
        if (exp.type === 'personal') {
          if (isPayer) yourShare += exp.amount;
          else roommateShare += exp.amount;
        } else {
          const myPart = exp.participants?.find(p => (p.user?._id || p.user)?.toString() === currentUserId);
          if (myPart) {
            yourShare += (myPart.shareAmount || 0);
            roommateShare += (exp.amount - (myPart.shareAmount || 0));
          } else {
            const split = (exp.amount || 0) / 2;
            yourShare += split;
            roommateShare += split;
          }
        }
      });

      trend.push({
        month: m,
        year: y,
        total: Math.round(total * 100) / 100,
        yourShare: Math.round(yourShare * 100) / 100,
        roommateShare: Math.round(roommateShare * 100) / 100
      });
    }

    res.status(200).json({ success: true, trend });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense categories breakdown for month
// @route   GET /api/expenses/categories
// @access  Private
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      room: req.user.room,
      date: { $gte: start, $lte: end }
    });

    const catMap = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'Others';
      if (!catMap[cat]) catMap[cat] = { category: cat, total: 0, count: 0 };
      catMap[cat].total += exp.amount || 0;
      catMap[cat].count += 1;
    });

    const breakdown = Object.values(catMap).map(c => ({
      category: c.category,
      total: Math.round(c.total * 100) / 100,
      count: c.count
    })).sort((a, b) => b.total - a.total);

    res.status(200).json({ success: true, breakdown, month, year });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getExpenseTrend,
  getCategoryBreakdown
};
