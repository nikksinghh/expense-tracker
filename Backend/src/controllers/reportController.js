const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Room = require('../models/Room');
const Settlement = require('../models/Settlement');
const { calculateNetBalances, roundToPaise } = require('../services/calculationService');

// Predefined vibrant category colors matching reference design
const CATEGORY_COLORS = {
  Rent: '#1d72fe', // vibrant blue
  Food: '#00a3ff', // sky blue
  Grocery: '#00c9a7', // teal / mint
  Electricity: '#ff9800', // orange / amber
  Internet: '#ff6b8b', // pink / rose
  Travel: '#845ec2', // purple
  Household: '#4d8076', // green slate
  Maintenance: '#f3c5ff', // lilac
  Entertainment: '#ff9671', // coral
  Others: '#8492a6' // slate gray
};

// @desc    Get complete dashboard overview data for selected month
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardOverview = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    const room = await Room.findById(req.user.room).populate(
      'members',
      'name email avatar upiId'
    );
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const currentUserIdStr = req.user._id.toString();
    const roommate = room.members.find(
      (m) => m._id.toString() !== currentUserIdStr
    );
    const roommateIdStr = roommate ? roommate._id.toString() : null;

    // 1. Date ranges for selected month and previous month
    const startOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Previous month range
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();
    const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1);
    const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    // 2. Fetch expenses
    const [monthExpenses, prevExpenses, allSharedExpenses, allSettlements, budget] =
      await Promise.all([
        Expense.find({
          room: room._id,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        })
          .sort({ date: -1, createdAt: -1 })
          .populate('payer', 'name email avatar upiId'),
        Expense.find({
          room: room._id,
          date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
        }),
        Expense.find({ room: room._id, type: 'shared' }),
        Settlement.find({ room: room._id, status: 'completed' }),
        Budget.findOne({ room: room._id, user: null, month, year })
      ]);

    // 3. Compute Card 1: Total Expenses & % change from last month
    const totalMonthExpenses = roundToPaise(
      monthExpenses.reduce((sum, e) => sum + e.amount, 0)
    );
    const totalPrevExpenses = roundToPaise(
      prevExpenses.reduce((sum, e) => sum + e.amount, 0)
    );

    let monthlyChangePercent = 0;
    let monthlyChangeDirection = 'neutral';
    if (totalPrevExpenses > 0) {
      const diff = totalMonthExpenses - totalPrevExpenses;
      monthlyChangePercent = Math.round((Math.abs(diff) / totalPrevExpenses) * 100);
      monthlyChangeDirection = diff >= 0 ? 'up' : 'down';
    }

    // 4. Compute Card 2: Your Spending & % of total
    const yourMonthExpenses = monthExpenses.filter(
      (e) => (e.payer?._id || e.payer).toString() === currentUserIdStr
    );
    const yourSpending = roundToPaise(
      yourMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    );
    const yourSpendingPercent =
      totalMonthExpenses > 0
        ? Math.round((yourSpending / totalMonthExpenses) * 100)
        : 0;

    // 5. Compute Card 3: Roommate Spending & % of total
    let roommateSpending = 0;
    if (roommateIdStr) {
      const roommateExpenses = monthExpenses.filter(
        (e) => (e.payer?._id || e.payer).toString() === roommateIdStr
      );
      roommateSpending = roundToPaise(
        roommateExpenses.reduce((sum, e) => sum + e.amount, 0)
      );
    }
    const roommateSpendingPercent =
      totalMonthExpenses > 0
        ? Math.round((roommateSpending / totalMonthExpenses) * 100)
        : 0;

    // 6. Compute Card 4: Monthly Budget
    const monthlyLimit = budget ? budget.monthlyLimit : 0;
    const budgetRemaining =
      monthlyLimit > 0 ? Math.max(0, roundToPaise(monthlyLimit - totalMonthExpenses)) : 0;
    const budgetPercentUsed =
      monthlyLimit > 0
        ? Math.min(999, Math.round((totalMonthExpenses / monthlyLimit) * 100))
        : 0;

    // 7. Daily breakdown for Bar Chart (Day 1 to daysInMonth)
    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = { day: d, you: 0, roommate: 0, total: 0 };
    }

    monthExpenses.forEach((exp) => {
      const expDay = new Date(exp.date).getDate();
      if (dailyMap[expDay]) {
        const payerId = (exp.payer?._id || exp.payer).toString();
        const amt = roundToPaise(exp.amount);
        if (payerId === currentUserIdStr) {
          dailyMap[expDay].you = roundToPaise(dailyMap[expDay].you + amt);
        } else if (payerId === roommateIdStr) {
          dailyMap[expDay].roommate = roundToPaise(dailyMap[expDay].roommate + amt);
        }
        dailyMap[expDay].total = roundToPaise(dailyMap[expDay].total + amt);
      }
    });

    const dailyBreakdown = Object.values(dailyMap);

    // 8. Category breakdown for Doughnut Chart
    const categoryTotals = {};
    monthExpenses.forEach((exp) => {
      const cat = exp.category || 'Others';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
    });

    const categoryBreakdown = Object.keys(categoryTotals).map((cat) => {
      const amount = roundToPaise(categoryTotals[cat]);
      const percentage =
        totalMonthExpenses > 0
          ? Math.round((amount / totalMonthExpenses) * 100)
          : 0;
      return {
        category: cat,
        amount,
        percentage,
        color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Others
      };
    });

    // Sort categories descending by amount
    categoryBreakdown.sort((a, b) => b.amount - a.amount);

    // 9. Settlement Summary Card
    const settlementCalculation = calculateNetBalances(
      allSharedExpenses,
      allSettlements,
      room.members.map((m) => m._id),
      req.user._id
    );

    // 10. Recent Expenses (first 5)
    const recentExpenses = monthExpenses.slice(0, 5);

    // 11. Budget Status
    let budgetStatus = 'normal';
    let budgetMessage = 'You are within budget. Keep it up!';
    if (monthlyLimit > 0) {
      if (budgetPercentUsed >= 100) {
        budgetStatus = 'exceeded';
        budgetMessage = 'Budget exceeded! Please check your spending.';
      } else if (budgetPercentUsed >= 90) {
        budgetStatus = 'critical';
        budgetMessage = 'Critical! 90% of monthly budget reached.';
      } else if (budgetPercentUsed >= 75) {
        budgetStatus = 'warning';
        budgetMessage = 'Warning: 75% of budget reached.';
      }
    } else {
      budgetMessage = 'No budget configured for this month.';
    }

    res.status(200).json({
      success: true,
      month,
      year,
      room: {
        _id: room._id,
        name: room.name,
        code: room.code,
        currency: room.currency,
        symbol: room.symbol,
        members: room.members
      },
      cards: {
        totalExpenses: {
          value: totalMonthExpenses,
          changePercent: monthlyChangePercent,
          changeDirection: monthlyChangeDirection,
          prevMonthTotal: totalPrevExpenses
        },
        yourSpending: {
          value: yourSpending,
          percentageOfTotal: yourSpendingPercent
        },
        roommateSpending: {
          value: roommateSpending,
          percentageOfTotal: roommateSpendingPercent
        },
        monthlyBudget: {
          limit: monthlyLimit,
          remaining: budgetRemaining,
          percentageUsed: budgetPercentUsed
        }
      },
      charts: {
        dailyBreakdown,
        categoryBreakdown
      },
      recentExpenses,
      settlement: settlementCalculation,
      budgetStatus: {
        status: budgetStatus,
        message: budgetMessage,
        limit: monthlyLimit,
        spent: totalMonthExpenses,
        percentageUsed: budgetPercentUsed
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed multi-month reports and member comparisons
// @route   GET /api/reports/analytics
// @access  Private
const getReportsAnalytics = async (req, res, next) => {
  try {
    const room = await Room.findById(req.user.room).populate(
      'members',
      'name email avatar upiId'
    );
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const currentUserIdStr = req.user._id.toString();
    const roommate = room.members.find((m) => m._id.toString() !== currentUserIdStr);

    // 6-month historical monthly trend
    const historyMonths = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      historyMonths.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      });
    }

    const monthlyTrends = await Promise.all(
      historyMonths.map(async (m) => {
        const expenses = await Expense.find({
          room: room._id,
          date: { $gte: m.start, $lte: m.end }
        });

        const total = roundToPaise(expenses.reduce((s, e) => s + e.amount, 0));
        const youPaid = roundToPaise(
          expenses
            .filter((e) => (e.payer?._id || e.payer).toString() === currentUserIdStr)
            .reduce((s, e) => s + e.amount, 0)
        );
        const roommatePaid = roundToPaise(
          roommate
            ? expenses
                .filter(
                  (e) => (e.payer?._id || e.payer).toString() === roommate._id.toString()
                )
                .reduce((s, e) => s + e.amount, 0)
            : 0
        );

        return {
          month: m.month,
          year: m.year,
          label: m.label,
          total,
          youPaid,
          roommatePaid
        };
      })
    );

    // Overall category breakdown across all time or selected
    const allExpenses = await Expense.find({ room: room._id });
    const categoryTotals = {};
    allExpenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    res.status(200).json({
      success: true,
      monthlyTrends,
      categoryTotals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export expenses to CSV format
// @route   GET /api/reports/export-csv
// @access  Private
const exportExpensesCSV = async (req, res, next) => {
  try {
    const { month, year, type, category } = req.query;
    const query = { room: req.user.room };

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (type && type !== 'All') {
      query.type = type;
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .populate('payer', 'name email');

    // Build CSV Content
    let csv = 'Date,Title,Category,Type,Split Mode,Amount (INR),Paid By,Notes\n';

    expenses.forEach((e) => {
      const dateStr = new Date(e.date).toISOString().split('T')[0];
      const title = `"${(e.title || '').replace(/"/g, '""')}"`;
      const cat = e.category || 'Others';
      const expType = e.type;
      const split = e.splitMode;
      const amount = e.amount;
      const payer = `"${(e.payer?.name || 'Unknown').replace(/"/g, '""')}"`;
      const notes = `"${(e.notes || '').replace(/"/g, '""')}"`;

      csv += `${dateStr},${title},${cat},${expType},${split},${amount},${payer},${notes}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="roommates_expenses_${Date.now()}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getReportsAnalytics,
  exportExpensesCSV
};
