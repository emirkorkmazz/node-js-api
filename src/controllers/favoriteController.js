const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');


const addFavorite = async (req, res) => {
    const { restaurant_id } = req.body;
    const userId = req.user.id;
    const favoriteId = uuidv4();

    try {
        await db.execute(
            `INSERT INTO Favorites (id, user_id, restaurant_id) 
             VALUES (?, ?, ?)`,
            [favoriteId, userId, restaurant_id]
        );

        res.json({
            status: true,
            message: 'Restoran favorilere eklendi!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: 'Favori eklerken bir hata oluştu.'
        });
    }
};


const getFavorites = async (req, res) => {
    const userId = req.user.id; 

    try {
        const [rows] = await db.execute(
            `SELECT f.*, r.name AS restaurant_name
             FROM Favorites f
             JOIN Restaurants r ON f.restaurant_id = r.id
             WHERE f.user_id = ?`,
            [userId]
        );

        res.json({
            status: true,
            favorites: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: 'Favoriler alınırken bir hata oluştu.'
        });
    }
};


const removeFavorite = async (req, res) => {
    const { favorite_id } = req.body;
    const userId = req.user.id; 

    try {
        const result = await db.execute(
            `DELETE FROM Favorites 
             WHERE id = ? AND user_id = ?`,
            [favorite_id, userId]
        );

        if (result[0].affectedRows === 0) {
            return res.status(404).json({
                status: false,
                message: 'Favori bulunamadı.'
            });
        }

        res.json({
            status: true,
            message: 'Favori başarıyla kaldırıldı.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: 'Favori kaldırılırken bir hata oluştu.'
        });
    }
};

module.exports = {
    addFavorite,
    getFavorites,
    removeFavorite
};