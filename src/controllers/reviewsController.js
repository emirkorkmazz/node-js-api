const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');


const addReview = async (req, res) => {
  const { restaurantId, rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const reviewId = uuidv4();
    await db.execute(
      `INSERT INTO Reviews (id, userId, restaurantId, rating, comment) 
       VALUES (?, ?, ?, ?, ?)`,
      [reviewId, userId, restaurantId, rating, comment]
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
    const { reviewId, reply } = req.body;
    const userId = req.user.id;
    const replyId = uuidv4();

    try {
        const [reviewRows] = await db.execute(
            `SELECT r.id AS restaurantId
             FROM Reviews re
             JOIN Restaurants r ON re.restaurantId = r.id
             WHERE re.id = ? AND r.ownerId = ?`,
            [reviewId, userId]
        );

        if (reviewRows.length === 0) {
            return res.status(403).json({
                status: false,
                message: 'Bu yoruma cevap vermek için yetkiniz yok.'
            });
        }

        await db.execute(
            `INSERT INTO Review_Replies (id, reviewId, ownerId, reply) 
             VALUES (?, ?, ?, ?)`,
            [replyId, reviewId, userId, reply]
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
    const { restaurantId } = req.body;
    const page = req.body.page || 1;
    const pageSize = req.body.pageSize || 20;

    try {
        const [totalCountRows] = await db.execute(
            `SELECT COUNT(*) AS totalCount FROM Reviews WHERE restaurantId = ?`,
            [restaurantId]
        );
        const totalCount = totalCountRows[0].totalCount;

        const offset = (page - 1) * pageSize;
        const [rows] = await db.execute(
            `SELECT re.*, u.name AS userName, u.surname AS userSurname,
                    IF(rr.id IS NOT NULL, 'true', 'false') AS isReviewReply
             FROM Reviews re
             JOIN Users u ON re.userId = u.id
             LEFT JOIN Review_Replies rr ON re.id = rr.reviewId
             WHERE re.restaurantId = ?
             LIMIT ?, ?`,
            [restaurantId, offset, pageSize]
        );

        const formattedRows = rows.map(row => ({
            ...row,
            isReviewReply: row.isReviewReply === 'true',
            createdAt: new Date(row.createdAt).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        }));

        res.json({
            status: true,
            totalCount: totalCount,
            reviews: formattedRows
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