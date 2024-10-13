const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const authenticateToken = require('../middleware/authenticateToken');


router.post('/restaurant/add', authenticateToken, restaurantController.upload.single('logo'), restaurantController.addRestaurant);

router.post('/restaurant/update', authenticateToken, restaurantController.upload.single('logo'), restaurantController.updateRestaurant);

router.delete('/restaurant/delete', authenticateToken, restaurantController.deleteRestaurant);

router.get('/restaurant/:id', restaurantController.getRestaurantById);

router.post('/restaurant/list', restaurantController.listApprovedRestaurants);

router.post('/restaurant/approve', authenticateToken, restaurantController.approveRestaurant);

module.exports = router;