const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    shareAmount: {
      type: Number,
      required: true,
      min: 0
    },
    sharePercent: {
      type: Number,
      default: 50
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Rent',
        'Food',
        'Grocery',
        'Electricity',
        'Internet',
        'Travel',
        'Household',
        'Maintenance',
        'Entertainment',
        'Others'
      ],
      default: 'Others',
      index: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
      index: true
    },
    type: {
      type: String,
      enum: ['shared', 'personal'],
      default: 'shared',
      required: true,
      index: true
    },
    splitMode: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal'
    },
    participants: [participantSchema],
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    receiptUrl: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound index for monthly queries on room
expenseSchema.index({ room: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
