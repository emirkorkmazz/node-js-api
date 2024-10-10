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
    cb(null, 'images/restaurants-pictures/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const restaurantId = uuidv4();
    cb(null, `${restaurantId}${ext}`);
  }
});

const upload = multer({ storage: storage });

const addRestaurant = async (req, res) => {
  const { name, address, contact_info, menu, city, district, latitude, longitude } = req.body;

  try {
    const restaurantId = uuidv4();
    const ownerId = req.user.id; 

    const isApproved = req.user.role === 'BusinessOwner' ? true : false;

    let logoPath = null;
    if (req.file) {
      logoPath = `images/restaurants-pictures/${req.file.filename}`;
    }

    await db.execute(
      `INSERT INTO Restaurants (id, name, address, contact_info, menu, logo_url, owner_id, is_approved, city, district, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, name, address, contact_info, menu, logoPath, ownerId, isApproved, city, district, latitude, longitude]
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
  const { id, name, address, contact_info, menu, city, district, latitude, longitude } = req.body;
  const ownerId = req.user.id;

  try {
    const [rows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND owner_id = ?', [id, ownerId]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Restoran bulunamadı veya yetkiniz yok.'
      });
    }

    let logoPath = rows[0].logo_url;
    if (req.file) {
      logoPath = `images/restaurants-pictures/${req.file.filename}`;
    }

    await db.execute(
      `UPDATE Restaurants SET name = ?, address = ?, contact_info = ?, menu = ?, logo_url = ?, city = ?, district = ?, latitude = ?, longitude = ? WHERE id = ?`,
      [name || rows[0].name, address || rows[0].address, contact_info || rows[0].contact_info, menu || rows[0].menu, logoPath, city || rows[0].city, district || rows[0].district, latitude || rows[0].latitude, longitude || rows[0].longitude, id]
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
    const [rows] = await db.execute('SELECT logo_url FROM Restaurants WHERE id = ? AND owner_id = ?', [id, ownerId]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Restoran bulunamadı veya yetkiniz yok.'
      });
    }

    await db.execute('DELETE FROM Restaurants WHERE id = ? AND owner_id = ?', [id, ownerId]);

    if (rows[0].logo_url) {
      await fs.unlink(rows[0].logo_url);
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
    const [rows] = await db.execute('SELECT * FROM Restaurants WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Restoran bulunamadı.'
      });
    }

    res.json({
      status: true,
      restaurant: rows[0]
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
  try {
    const [rows] = await db.execute('SELECT * FROM Restaurants WHERE is_approved = true');

    res.json({
      status: true,
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
    await db.execute('UPDATE Restaurants SET is_approved = true WHERE id = ?', [id]);

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