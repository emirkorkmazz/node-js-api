const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

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
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'images/profile-pictures');
    },
    filename: function (req, file, cb) {
      const emailPrefix = req.user.email.split('@')[0];
      const ext = path.extname(file.originalname);
      cb(null, `${emailPrefix}${ext}`);
    }
  });
    
  const upload = multer({ storage: storage });

  const searchUser = async (req, res) => {
    const { page, pageSize } = req.body;
  
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: false,
          message: 'Yetkisiz kullanıcı'
        });
      }
  
      const [rows] = await db.execute(
        'SELECT id, name, email, phone_number, role, is_verified FROM Users LIMIT ?, ?', 
        [(page - 1) * pageSize, pageSize]
      );
      const [totalCount] = await db.execute('SELECT COUNT(*) as count FROM Users');
  
      res.json({
        status: true,
        totalCount: totalCount[0].count, 
        users: rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        status: false,
        message: 'Kullanıcı arama sırasında bir hata oluştu.' 
      });
    }
  };

  const registerUser = async (req, res) => {
    const { username, password, name, email, phone_number } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
  
      await db.execute(
        'INSERT INTO Users (id, name, email, password_hash, phone_number) VALUES (?, ?, ?, ?, ?)', 
        [userId, name, email, hashedPassword, phone_number]
      );
  
      res.json({ 
        status: true,
        message: 'Kullanıcı başarıyla kaydedildi!' 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        status: false,
        message: 'Kayıt sırasında bir hata oluştu.' 
      });
    }
  };

  const updateUser = async (req, res) => {
    const { name, phone_number } = req.body;
    let picturePath = null;
  
    try {
      const [existingUserRows] = await db.execute('SELECT name, phone_number, email, picture FROM Users WHERE id = ?', [req.user.id]);
      const existingUser = existingUserRows[0];
  
      if (!existingUser) {
        return res.status(404).json({
          status: false,
          message: 'Kullanıcı bulunamadı.'
        });
      }
  
      if (req.file) {
        const emailPrefix = existingUser.email.split('@')[0];
        picturePath = `images/profile-pictures/${emailPrefix}${path.extname(req.file.originalname)}`;
      }
  
      const newName = name || existingUser.name;
      const newPhoneNumber = phone_number || existingUser.phone_number;
      const newPicture = picturePath || existingUser.picture;
  
      const [result] = await db.execute(
        'UPDATE Users SET name = ?, phone_number = ?, picture = ? WHERE id = ?',
        [newName, newPhoneNumber, newPicture, req.user.id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: 'Kullanıcı bulunamadı.'
        });
      }
  
      res.json({
        status: true,
        message: 'Kullanıcı bilgileri başarıyla güncellendi!',
        picturePath: newPicture
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Güncelleme sırasında bir hata oluştu.' });
    }
  };

  const getUserDetails = async (req, res) => {
    try {
      const userId = req.user.id;
  
      const [rows] = await db.execute(
        'SELECT id, name, email, phone_number, role, is_verified, picture FROM Users WHERE id = ?', 
        [userId]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ 
          status: false,
          message: 'Kullanıcı bulunamadı.' 
        });
      }
  
      const user = rows[0];
  
      res.json({
        status: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          is_verified: user.is_verified,
          picture: user.picture
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        status: false,
        message: 'Kullanıcı bilgileri alınırken bir hata oluştu.' 
      });
    }
  };

  const deleteUser = async (req, res) => {
    try {
      const userId = req.user.id;
  
      const [userRows] = await db.execute('SELECT picture FROM Users WHERE id = ?', [userId]);
      const user = userRows[0];
  
      if (!user) {
        return res.status(404).json({ 
          status: false,
          message: 'Kullanıcı bulunamadı.' 
        });
      }
  
      const [result] = await db.execute('DELETE FROM Users WHERE id = ?', [userId]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          status: false,
          message: 'Kullanıcı bulunamadı.' 
        });
      }
  
      if (user.picture) {
        try {
          await fs.unlink(user.picture);
        } catch (unlinkError) {
          console.error('Profil resmi silinirken hata oluştu:', unlinkError);
        }
      }
  
      res.json({ 
        status: true,
        message: 'Kullanıcı başarıyla silindi.' 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        status: false,
        message: 'Kullanıcı silinirken bir hata oluştu.'
      });
    }
  };
  
  const changePassword = async (req, res) => {
    const { userId, password, confirmPassword } = req.body;
    const tokenUserId = req.user.id;
  
    if (tokenUserId.toString() !== userId) {
      return res.status(403).json({
        status: false,
        message: 'Token ile gelen kullanıcı ID\'si ile verilen kullanıcı ID\'si uyumsuz.'
      });
    }
  
    try {
      const [userRows] = await db.execute('SELECT password_hash FROM Users WHERE id = ?', [userId]);
      const user = userRows[0];
  
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        return res.status(400).json({
          status: false,
          message: 'Yeni şifre, mevcut şifre ile aynı olamaz.'
        });
      }
  
      if (password !== confirmPassword) {
        return res.status(400).json({
          status: false,
          message: 'Şifreler eşleşmiyor.'
        });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const [result] = await db.execute(
        'UPDATE Users SET password_hash = ? WHERE id = ?',
        [hashedPassword, userId]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: 'Kullanıcı bulunamadı.'
        });
      }
  
      res.json({
        status: true,
        message: 'Şifre başarıyla değiştirildi!'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        message: 'Şifre değiştirirken bir hata oluştu.'
      });
    }
  };
  module.exports = {
    authenticateToken,
    upload, 
    searchUser,
    registerUser,
    updateUser,
    getUserDetails,
    deleteUser,
    changePassword,
  };