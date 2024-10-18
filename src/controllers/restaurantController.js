const express = require('express');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const router = express.Router();

const authenticateToken = require('../middleware/authenticateToken');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/restaurants-logos/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const restaurantId = uuidv4();
    cb(null, `${restaurantId}${ext}`);
  }
});

const upload = multer({ storage: storage });

const addRestaurant = async (req, res) => {
  const { name, address, contact, menu, city, district, latitude, longitude, logoBase64 } = req.body; 

  try {
    const restaurantId = uuidv4();
    const ownerId = req.user.id; 

    const isApproved = req.user.role === 'BusinessOwner' ? true : false;

    let logoPath = null;
    if (logoBase64) {
      const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      logoPath = `images/restaurants-logos/${restaurantId}.png`;
      await fs.writeFile(logoPath, buffer);
    }

    await db.execute(
      `INSERT INTO Restaurants (id, name, address, contact, menu, logoUrl, ownerId, isApproved, city, district, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, name, address, contact, menu, logoPath, ownerId, isApproved, city, district, latitude, longitude]
    );

    res.json({
      status: true,
      message: 'Restoran başarıyla eklendi!',
      restaurantId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Restoran eklenirken bir hata oluştu.' 
    });
  }
};


const updateRestaurant = async (req, res) => {
  const { id, name, address, contact, menu, city, district, latitude, longitude, logoBase64 } = req.body;
  const ownerId = req.user.id;

  try {
    const [rows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND ownerId = ?', [id, ownerId]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Restoran bulunamadı veya yetkiniz yok.'
      });
    }

    let logoPath = rows[0].logoUrl;
    if (logoBase64) {
      const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      logoPath = `images/restaurants-logos/${id}.png`;
      await fs.writeFile(logoPath, buffer);
    }

    await db.execute(
      `UPDATE Restaurants SET name = ?, address = ?, contact = ?, menu = ?, logoUrl = ?, city = ?, district = ?, latitude = ?, longitude = ? WHERE id = ?`,
      [name || rows[0].name, address || rows[0].address, contact || rows[0].contact, menu || rows[0].menu, logoPath, city || rows[0].city, district || rows[0].district, latitude || rows[0].latitude, longitude || rows[0].longitude, id]
    );

    res.json({
      status: true,
      message: 'Restoran başarıyla güncellendi!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Restoran güncellenirken bir hata oluştu.' 
    });
  }
};

const deleteRestaurant = async (req, res) => {
  const { id } = req.body;
  const ownerId = req.user.id;

  try {
    const [rows] = await db.execute('SELECT logoUrl FROM Restaurants WHERE id = ? AND ownerId = ?', [id, ownerId]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Restoran bulunamadı veya yetkiniz yok.'
      });
    }

    await db.execute('DELETE FROM Restaurants WHERE id = ? AND ownerId = ?', [id, ownerId]);

    if (rows[0].logoUrl) {
      await fs.unlink(rows[0].logoUrl);
    }

    res.json({
      status: true,
      message: 'Restoran başarıyla silindi.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Restoran silinirken bir hata oluştu.' 
    });
  }
};

const getRestaurantById = async (req, res) => {
  const { id } = req.params;

  try {
    const [restaurantRows] = await db.execute('SELECT * FROM Restaurants WHERE id = ?', [id]);

    if (restaurantRows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Restoran bulunamadı.'
      });
    }

    const [photoRows] = await db.execute('SELECT photoUrl FROM Restaurant_Photos WHERE restaurantId = ?', [id]);
    
    const [favoriteCountRows] = await db.execute('SELECT COUNT(*) as favoriteCount FROM Favorites WHERE restaurantId = ?', [id]);
    const favoriteCount = favoriteCountRows[0].favoriteCount;

    res.json({
      status: true,
      restaurant: {
        ...restaurantRows[0],
        favoriteCount: favoriteCount
      },
      photos: photoRows.map(photo => photo.photoUrl)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Restoran bilgileri alınırken bir hata oluştu.' 
    });
  }
};

const listApprovedRestaurants = async (req, res) => {
  const { page, pageSize, city, district } = req.body;

  if (!page || !pageSize) {
    return res.status(400).json({
      status: false,
      message: 'Page ve PageSize zorunludur.'
    });
  }

  const offset = (page - 1) * pageSize;
  let query = `
    SELECT r.*, COUNT(f.id) as favoriteCount 
    FROM Restaurants r 
    LEFT JOIN Favorites f ON r.id = f.restaurantId 
    WHERE r.isApproved = true
  `;
  const params = [];

  if (city) {
    query += ' AND r.city = ?';
    params.push(city);
  }
  if (district) {
    query += ' AND r.district = ?';
    params.push(district);
  }

  query += ' GROUP BY r.id';

  const [totalCountRows] = await db.execute('SELECT COUNT(*) as totalCount FROM Restaurants WHERE isApproved = true' + (city ? ' AND city = ?' : '') + (district ? ' AND district = ?' : ''), params);
  const totalCount = totalCountRows[0].totalCount;

  query += ' LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  try {
    const [rows] = await db.execute(query, params);

    res.json({
      status: true,
      totalCount: totalCount,
      restaurants: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Restoranlar alınırken bir hata oluştu.' 
    });
  }
};


const approveRestaurant = async (req, res) => {
  const { id } = req.body;

  try {
    await db.execute('UPDATE Restaurants SET isApproved = true WHERE id = ?', [id]);

    res.json({
      status: true,
      message: 'Restoran başarıyla onaylandı.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Restoran onaylanırken bir hata oluştu.' 
    });
  }
};

module.exports = {
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantById,
  listApprovedRestaurants,
  approveRestaurant,
  upload
};