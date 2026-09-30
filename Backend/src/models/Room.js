const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [60, 'Room name cannot exceed 60 characters']
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    currency: {
      type: String,
      default: 'INR'
    },
    symbol: {
      type: String,
      default: '₹'
    }
  },
  {
    timestamps: true
  }
);

// Enforce max 5 members constraint on save
roomSchema.pre('save', function () {
  if (this.members && this.members.length > 5) {
    throw new Error('A room can have at most 5 roommates');
  }
});

// Helper static method to generate a clean, readable invite code
roomSchema.statics.generateRoomCode = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'RM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = mongoose.model('Room', roomSchema);
