const express = require('express');
const { getAdminOverview, deleteUser, deleteRoom } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/overview', getAdminOverview);
router.delete('/users/:id', deleteUser);
router.delete('/rooms/:id', deleteRoom);

module.exports = router;
