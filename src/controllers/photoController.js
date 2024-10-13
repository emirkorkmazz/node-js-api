const express = require('express');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/restaurants-pictures/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const photoId = uuidv4();
    cb(null, `${photoId}${ext}`);
  }
});

const upload = multer({ storage: storage });

const addRestaurantPhoto = async (req, res) => {
  const { restaurant_id } = req.body;
  const ownerId = req.user.id;

  try {
    const [rows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND owner_id = ?', [restaurant_id, ownerId]);
    if (rows.length === 0) {
      return res.status(403).json({
        status: false,
        message: 'Bu restorana fotoğraf ekleme yetkiniz yok.'
      });
    }

    const [photoCountRows] = await db.execute('SELECT COUNT(*) as count FROM Restaurant_Photos WHERE restaurant_id = ?', [restaurant_id]);
    const photoCount = photoCountRows[0].count;

    if (photoCount >= 3) {
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path);
      }
      return res.status(400).json({
        status: false,
        message: 'Bu restorana en fazla 3 fotoğraf ekleyebilirsiniz.'
      });
    }

    const photoUrl = `images/restaurants-pictures/${req.file.filename}`;
    const photoId = uuidv4();

    await db.execute(
      'INSERT INTO Restaurant_Photos (id, restaurant_id, photo_url) VALUES (?, ?, ?)',
      [photoId, restaurant_id, photoUrl]
    );

    res.json({
      status: true,
      message: 'Fotoğraf başarıyla eklendi!',
      photoUrl
    });
  } catch (error) {
    console.error(error);
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path);
    }
    res.status(500).json({
      status: false,
      message: 'Fotoğraf eklenirken bir hata oluştu.'
    });
  }
};

const deleteRestaurantPhoto = async (req, res) => {
    const { id } = req.body;
    const ownerId = req.user.id;
  
    try {
      const [photoRows] = await db.execute('SELECT * FROM Restaurant_Photos WHERE id = ?', [id]);
      if (photoRows.length === 0) {
        return res.status(404).json({
          status: false,
          message: 'Fotoğraf bulunamadı.'
        });
      }
  
      const restaurantId = photoRows[0].restaurant_id;
  
      const [restaurantRows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND owner_id = ?', [restaurantId, ownerId]);
      if (restaurantRows.length === 0) {
        return res.status(403).json({
          status: false,
          message: 'Bu restorana fotoğraf silme yetkiniz yok.'
        });
      }
  
      const photoUrl = photoRows[0].photo_url;
      await fs.unlink(photoUrl).catch(err => console.error('Dosya silinirken hata:', err));
  
      await db.execute('DELETE FROM Restaurant_Photos WHERE id = ?', [id]);
  
      res.json({
        status: true,
        message: 'Fotoğraf başarıyla silindi!'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        message: 'Fotoğraf silinirken bir hata oluştu.'
      });
    }
  };

module.exports = {
  upload,
  addRestaurantPhoto,
  deleteRestaurantPhoto
};
