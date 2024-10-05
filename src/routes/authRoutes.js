const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

const multerMiddleware = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return authController.upload.single('picture')(req, res, next);
  }
  next();
};

router.post('/user/search', authController.authenticateToken, authController.searchUser);
router.post('/user/register', authController.registerUser);
router.post('/user/login', authController.loginUser);
router.post('/user/update', authController.authenticateToken, multerMiddleware, authController.updateUser);
router.get('/user/get-user-details', authController.authenticateToken, authController.getUserDetails);
router.delete('/user/delete', authController.authenticateToken, authController.deleteUser);
router.post('/user/refresh-token', authController.refreshToken);
router.post('/user/change-password', authController.authenticateToken, authController.changePassword);

module.exports = router;