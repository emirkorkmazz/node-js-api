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

  jwt.verify(token, 'secret_key', (err, user) => {
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
      { id: user.id, email: user.email, role: user.role, is_verified: user.is_verified }, 
      'secret_key', 
      { expiresIn: '1h' }
    );

    res.json({
      status: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone_number: user.phone_number,
        role: user.role,
        is_verified: user.is_verified,
        token: token
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
  const { token } = req.body;

  try {
    jwt.verify(token, 'secret_key', async (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Token geçersiz veya süresi dolmuş.' });

      const [rows] = await db.execute('SELECT * FROM Users WHERE id = ?', [decoded.id]);
      const user = rows[0];

      if (!user) {
        return res.status(404).json({ 
          status: false,
          message: 'Kullanıcı bulunamadı.' 
        });
      }

      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, is_verified: user.is_verified }, 
        'secret_key', 
        { expiresIn: '1h' }
      );

      res.json({ 
        status: true,
        token: newToken 
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
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