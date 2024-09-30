const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.username}${ext}`);
  }
});
  
  const upload = multer({ storage: storage });

  router.get('/user/all', authenticateToken, async (req, res) => {
    try {
      const [rows] = await db.execute('SELECT id, username, name, surname, birthdate, city, district, picture FROM users');
      
      res.json({
        status: true,
        users: rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        status: false,
        message: 'Kullanıcı listesi alınırken bir hata oluştu.' 
      });
    }
  });

  router.post('/user/register', async (req, res) => {
      const { username, password, name} = req.body;
    
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
    
        const [result] = await db.execute(
          `INSERT INTO users (username, password)
           VALUES (?, ?)`,
          [username, hashedPassword]
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
    });

router.post('/user/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
      const user = rows[0];
  
      if (!user) return res.status(400).json({ 
        status: false,
        message: 'Kullanıcı bulunamadı!' 
      });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ 
        status: false,
        message: 'Geçersiz şifre!' 
      });
  
      const token = jwt.sign({ id: user.id, username: user.username }, 'secret_key', { expiresIn: '1h' });
  
      res.json({
        status: true,
        user: {
          username: user.username,
          name: user.name,
          surname: user.surname,
          birthdate: user.birthdate,
          city: user.city,
          district: user.district,
          picture: user.picture,
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
  });


router.post('/user/update', authenticateToken, upload.single('picture'), async (req, res) => {
  console.log('Headers:', req.headers);
  console.log('User from token:', req.user);

  const { name, surname, birthdate, city, district } = req.body;
  let picturePath = null;

  try {
    if (req.file) {
      picturePath = `images/${req.user.username}${path.extname(req.file.originalname)}`;
    }

    const birthdateValue = birthdate === '' ? null : birthdate;

    const [result] = await db.execute(
      `UPDATE users SET name = ?, surname = ?, birthdate = ?, city = ?, district = ?, picture = ? WHERE username = ?`,
      [name, surname, birthdateValue, city, district, picturePath, req.user.username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        status: false,
        message: 'Kullanıcı bulunamadı.' 
      });
    }

    if (req.file) {
      res.json({ 
        status: true,
        message: 'Kullanıcı bilgileri ve resim başarıyla güncellendi!', 
        picturePath 
      });
    } else {
      res.json({ 
        status: true,
        message: 'Kullanıcı bilgileri başarıyla güncellendi!', 
        picturePath 
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Güncelleme sırasında bir hata oluştu.' });
  }
});

  router.get('/user/get-user-details', authenticateToken, async (req, res) => {
    try {
      const username = req.user.username;
  
      const [rows] = await db.execute('SELECT username, name, surname, birthdate, city, district, picture FROM users WHERE username = ?', [username]);
      
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
      res.status(500).json({ 
        status: false,
        message: 'Kullanıcı bilgileri alınırken bir hata oluştu.' 
      });
    }
  });

  router.delete('/user/delete', authenticateToken, async (req, res) => {
    try {
      const username = req.user.username;
  
      const [userRows] = await db.execute('SELECT picture FROM users WHERE username = ?', [username]);
      const user = userRows[0];
  
      const [result] = await db.execute('DELETE FROM users WHERE username = ?', [username]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          status: false,
          message: 'Kullanıcı bulunamadı.' 
        });
      }
  
      if (user && user.picture) {
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
  });

router.post('/user/refresh-token', async (req, res) => {
  const { token } = req.body;

  try {
    jwt.verify(token, 'secret_key', (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Token geçersiz veya süresi dolmuş.' });

      const newToken = jwt.sign({ id: decoded.id, username: decoded.username }, 'secret_key', { expiresIn: '1h' });

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
});

module.exports = router;