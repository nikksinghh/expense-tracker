const express = require('express');
const { getAdminOverview, deleteUser, deleteRoom } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.email?.toLowerCase() === 'nikhiladmin@gmail.com' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Super Admin privileges required.'
  });
};

router.use(protect);
router.use(adminOnly);

router.get('/overview', getAdminOverview);
router.delete('/users/:id', deleteUser);
router.delete('/rooms/:id', deleteRoom);

module.exports = router;
