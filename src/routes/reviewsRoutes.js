const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/review/add', authenticateToken, reviewsController.addReview);

router.post('/review/reply', authenticateToken, reviewsController.replyToReview);

router.post('/review/restaurant', authenticateToken, reviewsController.getReviewsForRestaurant);

module.exports = router;