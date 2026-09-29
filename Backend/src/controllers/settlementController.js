const Settlement = require('../models/Settlement');
const Expense = require('../models/Expense');
const Room = require('../models/Room');
const { calculateNetBalances, roundToPaise } = require('../services/calculationService');
const { createNotification } = require('../services/notificationService');

// @desc    Get current settlement status and net balance
// @route   GET /api/settlements/status
// @access  Private
const getSettlementStatus = async (req, res, next) => {
  try {
    const room = await Room.findById(req.user.room).populate('members', 'name email avatar upiId');
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // 1. Fetch all shared expenses for this room (only shared expenses count towards settlement!)
    const sharedExpenses = await Expense.find({
      room: room._id,
      type: 'shared'
    });

    // 2. Fetch all completed settlements
    const settlements = await Settlement.find({
      room: room._id,
      status: 'completed'
    });

    // 3. Compute net balances
    const calculation = calculateNetBalances(
      sharedExpenses,
      settlements,
      room.members.map((m) => m._id),
      req.user._id
    );

    // 4. Calculate member payment contributions
    const memberStats = room.members.map((member) => {
      const memIdStr = member._id.toString();
      const totalPaid = sharedExpenses
        .filter((e) => e.payer.toString() === memIdStr)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalShare = sharedExpenses.reduce((sum, e) => {
        const participant = e.participants.find(
          (p) => (p.user?._id || p.user).toString() === memIdStr
        );
        return sum + (participant ? participant.shareAmount : 0);
      }, 0);

      return {
        user: member,
        totalPaid: roundToPaise(totalPaid),
        totalShare: roundToPaise(totalShare),
        netBalance: calculation.balances[memIdStr] || 0
      };
    });

    const roommate = room.members.find(
      (m) => m._id.toString() !== req.user._id.toString()
    );

    res.status(200).json({
      success: true,
      calculation,
      memberStats,
      roommate: roommate || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a settlement payment between roommates
// @route   POST /api/settlements
// @access  Private
const recordSettlement = async (req, res, next) => {
  try {
    const { receiver, amount, paymentMethod, referenceNote, date } = req.body;

    if (!receiver || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide receiver and amount'
      });
    }

    const room = await Room.findById(req.user.room);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Verify receiver is roommate
    if (receiver.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot record a settlement payment to yourself'
      });
    }

    if (!room.members.some((m) => m.toString() === receiver.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Receiver is not a member of this room'
      });
    }

    const numericAmount = roundToPaise(amount);
    if (numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Settlement amount must be greater than zero'
      });
    }

    const settlement = await Settlement.create({
      room: room._id,
      payer: req.user._id,
      receiver,
      amount: numericAmount,
      paymentMethod: paymentMethod || 'UPI',
      referenceNote: referenceNote || '',
      date: date ? new Date(date) : new Date(),
      status: 'completed',
      recordedBy: req.user._id
    });

    await settlement.populate('payer', 'name email avatar upiId');
    await settlement.populate('receiver', 'name email avatar upiId');

    // Notify receiver
    createNotification({
      userId: receiver,
      roomId: room._id,
      title: '💵 Settlement Received!',
      message: `${req.user.name} recorded a settlement payment of ₹${settlement.amount} via ${settlement.paymentMethod}.`,
      type: 'settlement',
      link: '/settlement'
    });

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      settlement
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get settlement history for room
// @route   GET /api/settlements
// @access  Private
const getSettlementHistory = async (req, res, next) => {
  try {
    const settlements = await Settlement.find({ room: req.user.room })
      .sort({ date: -1, createdAt: -1 })
      .populate('payer', 'name email avatar upiId')
      .populate('receiver', 'name email avatar upiId')
      .populate('recordedBy', 'name');

    res.status(200).json({
      success: true,
      count: settlements.length,
      settlements
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete settlement
// @route   DELETE /api/settlements/:id
// @access  Private
const deleteSettlement = async (req, res, next) => {
  try {
    const settlement = await Settlement.findOneAndDelete({
      _id: req.params.id,
      room: req.user.room
    });

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Settlement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettlementStatus,
  recordSettlement,
  getSettlementHistory,
  deleteSettlement
};
