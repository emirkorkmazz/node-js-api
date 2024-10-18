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
  const { restaurant_id, photosBase64 } = req.body;
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

    if (photoCount + photosBase64.length > 3) {
      return res.status(400).json({
        status: false,
        message: 'Bu restorana en fazla 3 fotoğraf ekleyebilirsiniz.'
      });
    }

    const photoUrls = [];
    for (const photoBase64 of photosBase64) {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const photoId = uuidv4();
      const photoUrl = `images/restaurants-pictures/${photoId}.png`;
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(photoUrl, buffer);
      photoUrls.push(photoUrl);
    }

    for (const photoUrl of photoUrls) {
      await db.execute(
        'INSERT INTO Restaurant_Photos (id, restaurant_id, photo_url) VALUES (?, ?, ?)',
        [uuidv4(), restaurant_id, photoUrl]
      );
    }

    res.json({
      status: true,
      message: 'Fotoğraflar başarıyla eklendi!',
      photoUrls
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Fotoğraflar eklenirken bir hata oluştu.'
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
