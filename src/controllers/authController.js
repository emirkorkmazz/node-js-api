const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;



const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ 
    status: false,
    message: 'Yetkilendirme başarısız: Token bulunamadı.' 
  });

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      console.log('Token verification error:', err); 
      return res.status(403).json({ 
        status: false,
        message: 'Yetkilendirme başarısız: Geçersiz token.' 
      });
    }
    req.user = user;
    next();
  });
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ 
        status: false,
        message: 'Kullanıcı bulunamadı!' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ 
        status: false,
        message: 'Geçersiz şifre!' 
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified }, 
      process.env.JWT_SECRET_KEY, 
      { expiresIn: '2h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      process.env.REFRESH_JWT_SECRET_KEY,
      { expiresIn: '7d' }
    );

    let restaurantId = null;

    if (user.role === 'BusinessOwner') {
      const [restaurantRows] = await db.execute('SELECT id FROM Restaurants WHERE ownerId = ?', [user.id]);
      if (restaurantRows.length > 0) {
        restaurantId = restaurantRows[0].id;
      }
    }

    res.json({
      status: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        token: token,
        refreshToken: refreshToken,
        restaurantId: restaurantId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Giriş sırasında bir hata oluştu.' 
    });
  }
};


const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ 
      status: false,
      message: 'Refresh token gereklidir.' 
    });
  }

  try {
    jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          status: false,
          message: 'Refresh token geçersiz veya süresi dolmuş.' 
        });
      } else {
        const [rows] = await db.execute('SELECT * FROM Users WHERE id = ?', [decoded.id]);
        const user = rows[0];

        if (!user) {
          return res.status(404).json({ 
            status: false,
            message: 'Kullanıcı bulunamadı.' 
          });
        } else {
          const newAccessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified }, 
            process.env.JWT_SECRET_KEY, 
            { expiresIn: '2h' } 
          );

          return res.json({ 
            status: true,
            token: newAccessToken,
            refreshToken: refreshToken
          });
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      status: false,
      message: 'Token yenileme sırasında bir hata oluştu.' 
    });
  }
};

const logoutUser = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ 
    status: false,
    message: 'Yetkilendirme başarısız: Token bulunamadı.' 
  });

  res.json({
    status: true,
    message: 'Başarıyla çıkış yapıldı.'
  });
};

module.exports = {
  authenticateToken,
  loginUser,
  refreshToken,
  logoutUser
};