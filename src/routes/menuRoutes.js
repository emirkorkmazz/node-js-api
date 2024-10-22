const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authenticateToken = require('../middleware/authenticateToken');


router.post('/menu/upload', authenticateToken, menuController.uploadMenu);
router.delete('/menu/delete', authenticateToken, menuController.deleteMenu);
router.post('/menu/photos', authenticateToken, menuController.getRestaurantPhotos);


module.exports = router;