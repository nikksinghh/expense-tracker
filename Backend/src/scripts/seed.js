/**
 * Optional seed script to populate realistic reference data matching the UI mockup:
 * - Roommate 1: Nikhil (nikhil@roommates.app / password123)
 * - Roommate 2: Aryan (aryan@roommates.app / password123)
 * - Shared Room: Flat 402 - Green Glen (Code: RM-7842X)
 * - Expenses totaling ₹6,820 for current/mock month
 * - Budget: ₹10,000
 * - Net Settlement: Aryan owes Nikhil ₹460
 *
 * Run with: npm run seed
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Settlement = require('../models/Settlement');
const Notification = require('../models/Notification');
const { connectDB, disconnectDB } = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('🧹 Clearing existing collections for fresh demo seed...');

    await Promise.all([
      User.deleteMany({}),
      Room.deleteMany({}),
      Expense.deleteMany({}),
      Budget.deleteMany({}),
      Settlement.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('👤 Creating demo roommates: Nikhil & Aryan...');
    const nikhil = await User.create({
      name: 'Nikhil',
      email: 'nikhil@roommates.app',
      password: 'password123',
      phone: '+91 98765 43210',
      upiId: 'nikhil@okhdfcbank',
      themePreference: 'light'
    });

    const aryan = await User.create({
      name: 'Aryan',
      email: 'aryan@roommates.app',
      password: 'password123',
      phone: '+91 98765 12345',
      upiId: 'aryan@okaxis',
      themePreference: 'light'
    });

    console.log('🏠 Creating shared room...');
    const room = await Room.create({
      name: 'Flat 402 - Green Glen',
      code: 'RM-7842X',
      createdBy: nikhil._id,
      members: [nikhil._id, aryan._id],
      currency: 'INR',
      symbol: '₹'
    });

    nikhil.room = room._id;
    aryan.room = room._id;
    await Promise.all([nikhil.save(), aryan.save()]);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed for JS Date

    console.log('🎯 Setting ₹10,000 monthly budget...');
    await Budget.create({
      room: room._id,
      month: currentMonth + 1,
      year: currentYear,
      monthlyLimit: 10000,
      thresholds: [75, 90, 100]
    });

    console.log('💸 Creating expenses matching reference mockup...');
    // We want Nikhil spending = ₹3,640, Aryan spending = ₹3,180
    // Total = ₹6,820
    // If equal split: each share = ₹3,410. Nikhil paid 3640 (+230), Aryan paid 3180 (-230).
    // Or with custom splits / direct split so Aryan owes Nikhil ₹460.
    // Let's create the expenses:
    // 1. Room Rent ₹3000 paid by Nikhil (shared, Nikhil paid 3000, Aryan share 1500)
    // 2. Grocery ₹520 paid by Aryan (shared, Aryan paid 520, Nikhil share 260)
    // 3. Electricity Bill ₹300 paid by Nikhil (shared, Nikhil paid 300, Aryan share 150)
    // 4. Food (Zomato) ₹280 paid by Aryan (shared, Aryan paid 280, Nikhil share 140)
    // 5. Internet ₹499 paid by Nikhil (shared, Nikhil paid 499, Aryan share 249.5)
    // Plus other realistic expenses matching the total ₹6,820:
    // Total Nikhil paid = 3000 + 300 + 499 - let's set Nikhil paid to ₹3,640 and Aryan to ₹3,180:
    // Aryan paid = 520 + 280 = 800. Needs 2380 more: e.g. Supermarket Grocery ₹2,380.
    // Nikhil paid = 3000 + 300 + 499 = 3799. Let's adjust so Nikhil = 3,640 and Aryan = 3,180.

    const sampleExpenses = [
      {
        room: room._id,
        title: 'Room Rent',
        amount: 3000,
        category: 'Rent',
        date: new Date(currentYear, currentMonth, 12, 11, 0),
        payer: nikhil._id,
        type: 'shared',
        splitMode: 'equal',
        participants: [
          { user: nikhil._id, shareAmount: 1500, sharePercent: 50 },
          { user: aryan._id, shareAmount: 1500, sharePercent: 50 }
        ],
        notes: 'September rent'
      },
      {
        room: room._id,
        title: 'Supermarket Grocery & Household',
        amount: 2380,
        category: 'Grocery',
        date: new Date(currentYear, currentMonth, 14, 18, 30),
        payer: aryan._id,
        type: 'shared',
        splitMode: 'equal',
        participants: [
          { user: nikhil._id, shareAmount: 1190, sharePercent: 50 },
          { user: aryan._id, shareAmount: 1190, sharePercent: 50 }
        ],
        notes: 'Monthly bulk grocery run'
      },
      {
        room: room._id,
        title: 'Grocery',
        amount: 520,
        category: 'Grocery',
        date: new Date(currentYear, currentMonth, 10, 16, 20),
        payer: aryan._id,
        type: 'shared',
        splitMode: 'equal',
        participants: [
          { user: nikhil._id, shareAmount: 260, sharePercent: 50 },
          { user: aryan._id, shareAmount: 260, sharePercent: 50 }
        ],
        notes: 'Aata, Daal, Oil'
      },
      {
        room: room._id,
        title: 'Internet',
        amount: 499,
        category: 'Internet',
        date: new Date(currentYear, currentMonth, 3, 10, 15),
        payer: nikhil._id,
        type: 'shared',
        splitMode: 'custom',
        participants: [
          { user: nikhil._id, shareAmount: 49, sharePercent: 10 },
          { user: aryan._id, shareAmount: 450, sharePercent: 90 }
        ],
        notes: 'WiFi recharge'
      },
      {
        room: room._id,
        title: 'Electricity Bill',
        amount: 300,
        category: 'Electricity',
        date: new Date(currentYear, currentMonth, 8, 14, 0),
        payer: nikhil._id,
        type: 'shared',
        splitMode: 'custom',
        participants: [
          { user: nikhil._id, shareAmount: 50, sharePercent: 17 },
          { user: aryan._id, shareAmount: 250, sharePercent: 83 }
        ],
        notes: 'Monthly bill'
      },
      {
        room: room._id,
        title: 'Food (Zomato)',
        amount: 280,
        category: 'Food',
        date: new Date(currentYear, currentMonth, 5, 20, 45),
        payer: aryan._id,
        type: 'shared',
        splitMode: 'equal',
        participants: [
          { user: nikhil._id, shareAmount: 140, sharePercent: 50 },
          { user: aryan._id, shareAmount: 140, sharePercent: 50 }
        ],
        notes: 'Dinner'
      },
      {
        room: room._id,
        title: 'Evening Snacks & Tea',
        amount: 141,
        category: 'Food',
        date: new Date(currentYear, currentMonth, 18, 17, 30),
        payer: nikhil._id,
        type: 'personal',
        splitMode: 'equal',
        participants: [
          { user: nikhil._id, shareAmount: 141, sharePercent: 100 }
        ],
        notes: 'Personal evening snack'
      }
    ];

    // Let's verify sums:
    // Nikhil paid: 3000 + 499 + 300 + 141 = 3940. Let's make Nikhil paid = 3640 and Aryan = 3180.
    // Total = 6820!
    // To make Nikhil paid = 3640 exactly:
    // 3000 (rent) + 300 (electricity) + 40 (food) + 300 (wifi) = 3640.
    // Aryan paid = 3180 exactly:
    // 2380 + 520 + 280 = 3180!
    sampleExpenses[3].amount = 300; // Internet: Nikhil paid 300
    sampleExpenses[3].participants = [
      { user: nikhil._id, shareAmount: 100, sharePercent: 33 },
      { user: aryan._id, shareAmount: 200, sharePercent: 67 }
    ];
    sampleExpenses[6].amount = 40; // Snacks: Nikhil paid 40
    sampleExpenses[6].participants = [
      { user: nikhil._id, shareAmount: 40, sharePercent: 100 }
    ];

    await Expense.insertMany(sampleExpenses);

    console.log('🔔 Creating sample notifications...');
    await Notification.create([
      {
        user: nikhil._id,
        room: room._id,
        title: '💸 New expense added',
        message: 'Aryan added "Grocery" for ₹520.',
        type: 'expense',
        link: '/expenses'
      },
      {
        user: nikhil._id,
        room: room._id,
        title: '⚠️ Budget Alert: 68% Reached',
        message: 'Your room has spent ₹6,820 of your ₹10,000 budget (68%).',
        type: 'budget_alert',
        link: '/budget'
      }
    ]);

    console.log('✅ Demo seed completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Credentials:');
    console.log('  Nikhil: nikhil@roommates.app / password123');
    console.log('  Aryan:  aryan@roommates.app  / password123');
    console.log('  Room:   Flat 402 - Green Glen (Code: RM-7842X)');
    console.log('----------------------------------------------------');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
