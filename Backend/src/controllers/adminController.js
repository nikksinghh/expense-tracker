const User = require('../models/User');
const Room = require('../models/Room');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

// @desc    Get master admin dashboard statistics
// @route   GET /api/admin/overview
// @access  Private (Admin)
const getAdminOverview = async (req, res, next) => {
  try {
    const [totalUsers, totalRooms, totalExpenses, users, rooms, recentExpenses] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Expense.countDocuments(),
      User.find().select('-password').populate('room', 'name code members').sort('-createdAt').limit(100),
      Room.find().populate('members', 'name email upiId').populate('createdBy', 'name email').sort('-createdAt').limit(100),
      Expense.find().populate('payer', 'name email avatar').populate('room', 'name code').sort('-createdAt').limit(20)
    ]);

    const totalVolumeAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalVolume = totalVolumeAgg[0]?.total || 0;

    // Active rooms (rooms with 2 members)
    const activeRooms = rooms.filter(r => r.members?.length >= 2).length;
    // Blocked users
    const blockedUsers = users.filter(u => u.isBlocked).length;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalRooms,
        totalExpenses,
        totalVolume,
        activeRooms,
        blockedUsers
      },
      users,
      rooms,
      recentExpenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Delete any user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.room) {
      const room = await Room.findById(user.room);
      if (room) {
        room.members = room.members.filter(m => m.toString() !== user._id.toString());
        if (room.members.length === 0) {
          await Room.findByIdAndDelete(room._id);
        } else {
          await room.save();
        }
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Block/Unblock user
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin)
const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBlocked ? `User ${user.name} blocked` : `User ${user.name} unblocked`,
      isBlocked: user.isBlocked
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Delete any room
// @route   DELETE /api/admin/rooms/:id
// @access  Private (Admin)
const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await User.updateMany({ room: room._id }, { room: null });
    await Expense.deleteMany({ room: room._id });
    await Settlement.deleteMany({ room: room._id });
    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Room and its data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get room details with expenses
// @route   GET /api/admin/rooms/:id
// @access  Private (Admin)
const getRoomDetails = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('members', 'name email phone upiId avatar createdAt isBlocked')
      .populate('createdBy', 'name email');

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const expenses = await Expense.find({ room: req.params.id })
      .sort('-date')
      .limit(50)
      .populate('payer', 'name email');

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

    res.status(200).json({
      success: true,
      room,
      expenses,
      stats: {
        totalExpenses: expenses.length,
        totalSpent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getPlatformStats = async (req, res, next) => {
  try {
    const now = new Date();
    const thisMonth = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };

    const [newUsersThisMonth, newExpensesThisMonth, monthlyVolume] = await Promise.all([
      User.countDocuments({ createdAt: thisMonth }),
      Expense.countDocuments({ createdAt: thisMonth }),
      Expense.aggregate([
        { $match: { createdAt: thisMonth } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      newUsersThisMonth,
      newExpensesThisMonth,
      monthlyVolume: monthlyVolume[0]?.total || 0
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').populate('room', 'name code members').sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all rooms
// @route   GET /api/admin/rooms
// @access  Private (Admin)
const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().populate('members', 'name email upiId').populate('createdBy', 'name email').sort('-createdAt');
    res.status(200).json({ success: true, count: rooms.length, rooms });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview,
  getUsers,
  getRooms,
  deleteUser,
  toggleBlockUser,
  deleteRoom,
  getRoomDetails,
  getPlatformStats
};
