const db = require('../config/db');

class User {
  static async findAll(page, pageSize) {
    const [rows] = await db.execute('SELECT id, username, name, surname, birthdate, city, district, picture FROM users LIMIT ?, ?', [(page - 1) * pageSize, pageSize]);
    return rows;
  }

  static async count() {
    const [totalCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    return totalCount[0].count;
  }
}

module.exports = User;