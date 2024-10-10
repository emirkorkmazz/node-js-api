const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');


const addReview = async (req, res) => {
  const { restaurant_id, rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const reviewId = uuidv4();
    await db.execute(
      `INSERT INTO Reviews (id, user_id, restaurant_id, rating, comment) 
       VALUES (?, ?, ?, ?, ?)`,
      [reviewId, userId, restaurant_id, rating, comment]
    );

    res.json({
      status: true,
      message: 'Yorum başarıyla eklendi!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Yorum eklerken bir hata oluştu.'
    });
  }
};

const replyToReview = async (req, res) => {
    const { review_id, reply } = req.body;
    const userId = req.user.id;
    const replyId = uuidv4();

    try {
        const [reviewRows] = await db.execute(
            `SELECT r.id AS restaurant_id
             FROM Reviews re
             JOIN Restaurants r ON re.restaurant_id = r.id
             WHERE re.id = ? AND r.owner_id = ?`,
            [review_id, userId]
        );

        if (reviewRows.length === 0) {
            return res.status(403).json({
                status: false,
                message: 'Bu yoruma cevap vermek için yetkiniz yok.'
            });
        }

        await db.execute(
            `INSERT INTO Review_Replies (id, review_id, owner_id, reply) 
             VALUES (?, ?, ?, ?)`,
            [replyId, review_id, userId, reply]
        );

        res.json({
            status: true,
            message: 'Yoruma cevap başarıyla eklendi.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: 'Cevap eklenirken bir hata oluştu.'
        });
    }
};


const getReviewsForRestaurant = async (req, res) => {
    const { restaurant_id } = req.body;
    const page = req.body.page || 1;
    const pageSize = req.body.pageSize || 20;

    try {
        const [totalCountRows] = await db.execute(
            `SELECT COUNT(*) AS totalCount FROM Reviews WHERE restaurant_id = ?`,
            [restaurant_id]
        );
        const totalCount = totalCountRows[0].totalCount;

        const offset = (page - 1) * pageSize;
        const [rows] = await db.execute(
            `SELECT re.*, u.name AS user_name
             FROM Reviews re
             JOIN Users u ON re.user_id = u.id
             WHERE re.restaurant_id = ?
             LIMIT ?, ?`,
            [restaurant_id, offset, pageSize]
        );

        res.json({
            status: true,
            totalCount: totalCount,
            reviews: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: 'Yorumlar alınırken bir hata oluştu.'
        });
    }
};
module.exports = {
  addReview,
  replyToReview,
  getReviewsForRestaurant
};