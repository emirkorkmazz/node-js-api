const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const authenticateToken = require('../middleware/authenticateToken');



// 1. Restoran Ekleme (Kullanıcılar ve Restoran Sahipleri ekleyebilir)
router.post('/restaurant/add', authenticateToken, restaurantController.upload.single('logo'), restaurantController.addRestaurant);

// 2. Restoran Güncelleme (Sadece Restoran Sahipleri kendi restoranlarını güncelleyebilir)
router.post('/restaurant/update', authenticateToken, restaurantController.upload.single('logo'), restaurantController.updateRestaurant);

// 3. Restoran Silme (Sadece Restoran Sahipleri kendi restoranlarını silebilir)
router.delete('/restaurant/delete', authenticateToken, restaurantController.deleteRestaurant);

// 4. Restoran Detaylarını Getirme (Herkes bir restoranın detaylarını görüntüleyebilir)
router.get('/restaurant/:id', restaurantController.getRestaurantById);

// 5. Onaylanmış Restoranları Listeleme (Herkes tüm onaylanmış restoranları görebilir)
router.get('/restaurant/', restaurantController.listApprovedRestaurants);

// 6. Restoran Onaylama (Sadece Adminler restoranları onaylayabilir)
router.post('/restaurant/approve', authenticateToken, restaurantController.approveRestaurant);

module.exports = router;