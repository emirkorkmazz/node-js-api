const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const multer = require('multer');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'images/restaurants-pictures/');
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const photoId = uuidv4();
      cb(null, `${photoId}${ext}`);
    }
  });
  
  const upload = multer({ storage: storage });

  const saveImage = async (base64Data, uploadDir) => {
    if (!base64Data) return null;
  
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileName = `${uuidv4()}.jpg`;
    const filePath = path.join(uploadDir, fileName);
  
    await fs.writeFile(filePath, imageBuffer);
  
    return `/images/restaurant-menu/${fileName}`;
  };
  
  const uploadMenu = async (req, res) => {
    try {
      const { restaurantId, menu1, menu2, menu3 } = req.body;
      const ownerId = req.user.id;
  
      const [ownerRows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND ownerId = ?', [restaurantId, ownerId]);
      if (ownerRows.length === 0) {
        return res.status(403).json({
          status: false,
          message: 'Bu restorana menü ekleme yetkiniz yok.'
        });
      }
  
      const uploadDir = path.join(__dirname, '..', '..', 'images', 'restaurant-menu');
      await fs.mkdir(uploadDir, { recursive: true });
  
      const updatedPaths = await Promise.all([
        saveImage(menu1, uploadDir),
        saveImage(menu2, uploadDir),
        saveImage(menu3, uploadDir)
      ]);
  
      const updateQuery = `
        UPDATE Restaurants 
        SET menu1 = COALESCE(?, menu1),
            menu2 = COALESCE(?, menu2),
            menu3 = COALESCE(?, menu3)
        WHERE id = ?
      `;
  
      const [result] = await db.execute(updateQuery, [...updatedPaths, restaurantId]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: 'Restoran bulunamadı veya menü güncellenemedi.'
        });
      }
  
      res.json({
        status: true,
        message: 'Menü resimleri başarıyla yüklendi.',
        updatedMenus: updatedPaths.filter(Boolean)
      });
    } catch (error) {
      console.error('Menü yükleme hatası:', error);
      res.status(500).json({
        status: false,
        message: 'Menü yüklenirken bir hata oluştu.'
      });
    }
  };

const deleteMenu = async (req, res) => {
    try {
      const { restaurantId, menuNumber } = req.body;
      const ownerId = req.user.id;

      const [ownerRows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND ownerId = ?', [restaurantId, ownerId]);
      if (ownerRows.length === 0) {
        return res.status(403).json({
          status: false,
          message: 'Bu restoranın menüsünü silme yetkiniz yok.'
        });
      }
  
      if (!['menu1', 'menu2', 'menu3'].includes(menuNumber)) {
        return res.status(400).json({
          status: false,
          message: 'Geçersiz menü numarası. menu1, menu2 veya menu3 olmalıdır.'
        });
      }
  
      const [rows] = await db.execute(
        `SELECT ${menuNumber} FROM Restaurants WHERE id = ?`,
        [restaurantId]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({
          status: false,
          message: 'Restoran bulunamadı.'
        });
      }
  
      const currentMenuPath = rows[0][menuNumber];
  
      if (currentMenuPath) {
        const fullPath = path.join(__dirname, '..', '..', currentMenuPath);
        await fs.unlink(fullPath);
      }
  
      const updateQuery = `
        UPDATE Restaurants 
        SET ${menuNumber} = NULL 
        WHERE id = ?
      `;
  
      const [result] = await db.execute(updateQuery, [restaurantId]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: 'Restoran bulunamadı veya menü güncellenemedi.'
        });
      }
  
      res.json({
        status: true,
        message: `${menuNumber} başarıyla silindi.`
      });
    } catch (error) {
      console.error('Menü silme hatası:', error);
      res.status(500).json({
        status: false,
        message: 'Menü silinirken bir hata oluştu.'
      });
    }
  };

  const getRestaurantPhotos = async (req, res) => {
    const { restaurantId } = req.body;
    const ownerId = req.user.id;
  
    try {
      const [ownerRows] = await db.execute('SELECT * FROM Restaurants WHERE id = ? AND ownerId = ?', [restaurantId, ownerId]);
      if (ownerRows.length === 0) {
        return res.status(403).json({
          status: false,
          message: 'Bu restorana ait fotoğrafları görüntüleme yetkiniz yok.'
        });
      }
  
      const [menuRows] = await db.execute('SELECT menu1, menu2, menu3 FROM Restaurants WHERE id = ?', [restaurantId]);
  
      if (menuRows.length === 0) {
        return res.status(404).json({
          status: false,
          message: 'Restoran bulunamadı.'
        });
      }

      res.json({
        status: true,
        menus: menuRows[0]
      });
    } catch (error) {
      console.error('Menü bilgileri alınırken hata:', error);
      res.status(500).json({
        status: false,
        message: 'Menü bilgileri alınırken bir hata oluştu.'
      });
    }
  };

module.exports = {
  uploadMenu,
  deleteMenu,
  getRestaurantPhotos
};