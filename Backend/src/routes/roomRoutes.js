const express = require('express');
const { body } = require('express-validator');
const {
  createRoom,
  joinRoom,
  getCurrentRoom,
  leaveRoom,
  updateRoom,
  resetRoomExpenses
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Room name is required')
      .isLength({ max: 60 })
      .withMessage('Room name cannot exceed 60 characters'),
    validate
  ],
  createRoom
);

router.post(
  '/join',
  [
    body('code').trim().notEmpty().withMessage('Room invite code is required'),
    validate
  ],
  joinRoom
);

router.get('/current', getCurrentRoom);
router.put('/update', updateRoom);
router.delete('/reset-expenses', resetRoomExpenses);
router.post('/leave', leaveRoom);

module.exports = router;
