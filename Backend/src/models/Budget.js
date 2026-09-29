const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means room-wide budget
      index: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly budget limit is required'],
      min: [1, 'Budget must be at least ₹1']
    },
    thresholds: {
      type: [Number],
      default: [75, 90, 100]
    },
    notifiedThresholds: {
      type: [Number],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// One budget per room/user per month/year
budgetSchema.index({ room: 1, user: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
