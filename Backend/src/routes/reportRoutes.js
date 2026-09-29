const express = require('express');
const {
  getDashboardOverview,
  getReportsAnalytics,
  exportExpensesCSV
} = require('../controllers/reportController');
const { protect, requireRoom } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(requireRoom);

router.get('/dashboard', getDashboardOverview);
router.get('/analytics', getReportsAnalytics);
router.get('/export-csv', exportExpensesCSV);

module.exports = router;
