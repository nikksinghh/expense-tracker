const express = require('express');
const {
  getAdminOverview, getUsers, getRooms, deleteUser, toggleBlockUser,
  deleteRoom, getRoomDetails, getPlatformStats
} = require('../controllers/adminController');
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
router.get('/users', getUsers);
router.get('/rooms', getRooms);
router.get('/stats', getPlatformStats);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/block', toggleBlockUser);
router.delete('/rooms/:id', deleteRoom);
router.get('/rooms/:id', getRoomDetails);

module.exports = router;
