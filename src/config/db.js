const mysql = require('mysql2');

// MySQL bağlantısı
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // Veritabanı Kullanıcı Adı
  password: '',  // XAMPP kullanıyorsan şifreyi boş bırak
  database: 'lezzet'  // Veritabanı adını burada belirt
});

module.exports = pool.promise();