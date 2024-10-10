const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/favorite/add', authenticateToken, favoriteController.addFavorite);

router.get('/favorite', authenticateToken, favoriteController.getFavorites);

router.delete('/favorite/remove', authenticateToken, favoriteController.removeFavorite);

module.exports = router;