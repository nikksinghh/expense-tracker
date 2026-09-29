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
      User.find().select('-password').populate('room', 'name code').sort('-createdAt').limit(50),
      Room.find().populate('members', 'name email').populate('createdBy', 'name email').sort('-createdAt').limit(50),
      Expense.find().populate('paidBy', 'name email').populate('room', 'name code').sort('-createdAt').limit(15)
    ]);

    const totalVolumeAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalVolume = totalVolumeAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalRooms,
        totalExpenses,
        totalVolume
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
        await room.save();
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
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

module.exports = {
  getAdminOverview,
  deleteUser,
  deleteRoom
};
