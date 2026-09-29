const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
      index: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Settlement amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Cash', 'Bank Transfer', 'Other'],
      default: 'UPI'
    },
    referenceNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters']
    },
    status: {
      type: String,
      enum: ['completed', 'pending'],
      default: 'completed'
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

settlementSchema.index({ room: 1, date: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
