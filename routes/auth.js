const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// JWT doğrulama middleware'i
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth Header:', authHeader); // Debug için log
  console.log('Token:', token); // Debug için log

  if (token == null) return res.status(401).json({ message: 'Yetkilendirme başarısız: Token bulunamadı.' });

  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) {
      console.log('Token verification error:', err); // Debug için log
      return res.status(403).json({ message: 'Yetkilendirme başarısız: Geçersiz token.' });
    }
    req.user = user;
    console.log('User from token:', user); // Debug için log
    next();
  });
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'images/'); 
    },
    filename: function (req, file, cb) {
      const username = req.body.username;
      cb(null, `${username}.jpg`);
    }
  });
  
  const upload = multer({ storage: storage });

  router.post('/register', async (req, res) => {
      const { username, password, name} = req.body;
    
      try {
        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);
    
        // Kullanıcıyı veritabanına kaydet
        const [result] = await db.execute(
          `INSERT INTO users (username, password)
           VALUES (?, ?)`,
          [username, hashedPassword]
        );
    
        res.json({ message: 'Kullanıcı başarıyla kaydedildi!' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
      }
    });

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Veritabanında kullanıcıyı bul
      const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
      const user = rows[0];
  
      if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı!' });
  
      // Şifreyi doğrula
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Geçersiz şifre!' });
  
      // JWT token oluştur ve yanıtla ek kullanıcı bilgilerini döndür
      const token = jwt.sign({ id: user.id, username: user.username }, 'secret_key', { expiresIn: '1h' });
  
      res.json({
        token,
        user: {
          username: user.username,
          name: user.name,
          surname: user.surname,
          birthdate: user.birthdate,
          city: user.city,
          district: user.district,
          picture: user.picture
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Giriş sırasında bir hata oluştu.' });
    }
  });


  router.post('/update', authenticateToken, upload.single('picture'), async (req, res) => {
    console.log('Headers:', req.headers);
    console.log('User from token:', req.user);
  
    const { name, surname, birthdate, city, district } = req.body;
    let picturePath = null;
  
    try {
      if (req.file) {
        picturePath = `images/${req.user.username}.jpg`;
      }
  
      // birthdate değerini kontrol et
      const birthdateValue = birthdate === '' ? null : birthdate;
  
      // Kullanıcı bilgilerini veritabanında güncelle
      const [result] = await db.execute(
        `UPDATE users SET name = ?, surname = ?, birthdate = ?, city = ?, district = ?, picture = ? WHERE username = ?`,
        [name, surname, birthdateValue, city, district, picturePath, req.user.username]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
      }
  
      if (req.file) {
        res.json({ message: 'Kullanıcı bilgileri ve resim başarıyla güncellendi!', picturePath });
      } else {
        res.json({ message: 'Kullanıcı bilgileri başarıyla güncellendi!' });
      }
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Güncelleme sırasında bir hata oluştu.' });
    }
  });

  router.get('/get-user-details', authenticateToken, async (req, res) => {
    try {
      // Token'dan gelen kullanıcı adını kullan
      const username = req.user.username;
  
      // Veritabanından kullanıcı bilgilerini al
      const [rows] = await db.execute('SELECT username, name, surname, birthdate, city, district, picture FROM users WHERE username = ?', [username]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
      }
  
      const user = rows[0];
  
      // Kullanıcı bilgilerini döndür
      res.json({
        user: {
          username: user.username,
          name: user.name,
          surname: user.surname,
          birthdate: user.birthdate,
          city: user.city,
          district: user.district,
          picture: user.picture
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Kullanıcı bilgileri alınırken bir hata oluştu.' });
    }
  });

router.post('/refresh-token', async (req, res) => {
  const { token } = req.body;

  try {
    jwt.verify(token, 'secret_key', (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Token geçersiz veya süresi dolmuş.' });

      // Yeni bir token oluştur
      const newToken = jwt.sign({ id: decoded.id, username: decoded.username }, 'secret_key', { expiresIn: '1h' });

      res.json({ token: newToken });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Token yenileme sırasında bir hata oluştu.' });
  }
});

module.exports = router;