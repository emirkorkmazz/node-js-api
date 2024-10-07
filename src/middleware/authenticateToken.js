const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ 
      status: false,
      message: 'Yetkilendirme başarısız: Token bulunamadı.' 
    });
  }

  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        status: false,
        message: 'Yetkilendirme başarısız: Geçersiz token.' 
      });
    }
    req.user = user; 
    next(); 
  });
};

module.exports = authenticateToken;