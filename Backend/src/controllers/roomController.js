const Room = require('../models/Room');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res, next) => {
  try {
    const { name, currency, symbol } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid room name (e.g. Flat 402, Green Glen)'
      });
    }

    // Check if user is already in a room
    const user = await User.findById(req.user._id);
    if (user.room) {
      return res.status(400).json({
        success: false,
        message: 'You are already in a room. Leave your current room to create a new one.'
      });
    }

    // Generate unique room code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = Room.generateRoomCode();
      const existing = await Room.findOne({ code });
      if (!existing) isUnique = true;
    }

    const room = await Room.create({
      name: name.trim(),
      code,
      createdBy: req.user._id,
      members: [req.user._id],
      currency: currency || 'INR',
      symbol: symbol || '₹'
    });

    user.room = room._id;
    await user.save();

    await room.populate('members', 'name email phone upiId avatar');

    res.status(201).json({
      success: true,
      message: 'Room created successfully! Share your room code with your roommate.',
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join an existing room using invite code
// @route   POST /api/rooms/join
// @access  Private
const joinRoom = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-character room invite code.'
      });
    }

    const formattedCode = code.trim().toUpperCase();
    const room = await Room.findOne({ code: formattedCode });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `No room found with invite code "${formattedCode}". Please check with your roommate.`
      });
    }

    // Check if user is already in this room
    if (room.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this room.'
      });
    }

    // Check if user is in another room
    const user = await User.findById(req.user._id);
    if (user.room && user.room.toString() !== room._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You are already in another room. Please leave that room first before joining a new one.'
      });
    }

    // Enforce strict 2 roommates per room limit!
    if (room.members.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'This room is already full! RoomMates is strictly designed for 2 roommates per room.'
      });
    }

    // Add user as second roommate
    room.members.push(req.user._id);
    await room.save();

    user.room = room._id;
    await user.save();

    // Notify the first roommate that second roommate joined
    const firstMemberId = room.members[0];
    await createNotification({
      userId: firstMemberId,
      roomId: room._id,
      title: '🎉 Roommate Joined!',
      message: `${user.name} has joined "${room.name}". You can now track shared expenses together!`,
      type: 'room',
      link: '/members'
    });

    await room.populate('members', 'name email phone upiId avatar');

    res.status(200).json({
      success: true,
      message: `Successfully joined "${room.name}"!`,
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's room details
// @route   GET /api/rooms/current
// @access  Private
const getCurrentRoom = async (req, res, next) => {
  try {
    if (!req.user.room) {
      return res.status(200).json({
        success: true,
        room: null,
        message: 'User does not belong to any room yet.'
      });
    }

    const room = await Room.findById(req.user.room)
      .populate('members', 'name email phone upiId avatar createdAt')
      .populate('createdBy', 'name email');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or has been removed.'
      });
    }

    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave current room
// @route   POST /api/rooms/leave
// @access  Private
const leaveRoom = async (req, res, next) => {
  try {
    if (!req.user.room) {
      return res.status(400).json({
        success: false,
        message: 'You are not part of any room.'
      });
    }

    const room = await Room.findById(req.user.room);
    if (room) {
      room.members = room.members.filter(
        (m) => m.toString() !== req.user._id.toString()
      );
      if (room.members.length === 0) {
        await Room.findByIdAndDelete(room._id);
      } else {
        await room.save();
        // Notify remaining member
        await createNotification({
          userId: room.members[0],
          roomId: room._id,
          title: '👋 Roommate Left',
          message: `${req.user.name} has left the room.`,
          type: 'room',
          link: '/members'
        });
      }
    }

    const user = await User.findById(req.user._id);
    user.room = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'You have successfully left the room.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update room settings (Admin)
// @route   PUT /api/rooms/update
// @access  Private
const updateRoom = async (req, res, next) => {
  try {
    if (!req.user.room) {
      return res.status(400).json({ success: false, message: 'You are not part of any room.' });
    }

    const { name, currency, symbol } = req.body;
    const room = await Room.findById(req.user.room);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (name && name.trim()) room.name = name.trim();
    if (currency) room.currency = currency;
    if (symbol) room.symbol = symbol;

    await room.save();
    await room.populate('members', 'name email phone upiId avatar createdAt');

    res.status(200).json({
      success: true,
      message: 'Room details updated successfully!',
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset/Clear all expenses for room (Admin)
// @route   DELETE /api/rooms/reset-expenses
// @access  Private
const resetRoomExpenses = async (req, res, next) => {
  try {
    if (!req.user.room) {
      return res.status(400).json({ success: false, message: 'You are not part of any room.' });
    }

    const Expense = require('../models/Expense');
    const Settlement = require('../models/Settlement');

    await Expense.deleteMany({ room: req.user.room });
    await Settlement.deleteMany({ room: req.user.room });

    res.status(200).json({
      success: true,
      message: 'All expenses and settlement records for this room have been successfully cleared.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getCurrentRoom,
  leaveRoom,
  updateRoom,
  resetRoomExpenses
};
