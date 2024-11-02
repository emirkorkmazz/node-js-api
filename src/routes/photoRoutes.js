const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/photo/add', authenticateToken, photoController.upload.single('photo'), photoController.addRestaurantPhoto);

router.delete('/photo/delete', authenticateToken, photoController.deleteRestaurantPhoto);

router.post('/photo/restaurant', authenticateToken, photoController.getRestaurantPhotos);

module.exports = router;