const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authenticateToken = require('../middleware/authenticateToken');


router.post('/menu/upload', authenticateToken, menuController.uploadMenu);
router.delete('/menu/delete', authenticateToken, menuController.deleteMenu);

module.exports = router;