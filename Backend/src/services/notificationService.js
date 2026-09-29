const Notification = require('../models/Notification');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

/**
 * Create a notification for a user
 */
const createNotification = async ({ userId, roomId, title, message, type, link }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      room: roomId,
      title,
      message,
      type,
      link: link || ''
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return null;
  }
};

/**
 * Check room budget thresholds and trigger alerts if crossed.
 * Guarantees no duplicate notifications for the same threshold and month.
 */
const checkBudgetThresholds = async (roomId, year, month) => {
  try {
    const budget = await Budget.findOne({ room: roomId, user: null, year, month });
    if (!budget || !budget.monthlyLimit || budget.monthlyLimit <= 0) return;

    // Calculate total spending for this room in this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      room: roomId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalSpending = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    const percentUsed = (totalSpending / budget.monthlyLimit) * 100;

    // Check each threshold (e.g. 75, 90, 100)
    for (const threshold of budget.thresholds) {
      if (percentUsed >= threshold && !budget.notifiedThresholds.includes(threshold)) {
        // Mark threshold as notified
        budget.notifiedThresholds.push(threshold);
        await budget.save();

        // Send notification to all room members
        const Room = require('../models/Room');
        const room = await Room.findById(roomId);
        if (room && room.members) {
          const formattedSpent = Math.round(totalSpending);
          const formattedLimit = Math.round(budget.monthlyLimit);

          for (const memberId of room.members) {
            await createNotification({
              userId: memberId,
              roomId,
              title: `⚠️ Budget Alert: ${threshold}% Reached`,
              message: `Your room has spent ₹${formattedSpent} of your ₹${formattedLimit} budget (${Math.round(
                percentUsed
              )}%).`,
              type: 'budget_alert',
              link: '/budget'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking budget thresholds:', error.message);
  }
};

module.exports = {
  createNotification,
  checkBudgetThresholds
};
