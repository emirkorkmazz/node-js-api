const express = require('express');
const { loginUser, refreshToken, logoutUser } = require('../controllers/authController');

const router = express.Router();

router.post('/user/login', loginUser);
router.post('/user/refresh-token', refreshToken);
router.post('/user/logout', logoutUser);

module.exports = router;