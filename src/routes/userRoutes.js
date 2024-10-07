const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

const multerMiddleware = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return userController.upload.single('picture')(req, res, next);
  }
  next();
};

router.post('/user/search', userController.authenticateToken, userController.searchUser);
router.post('/user/register', userController.registerUser);
router.post('/user/update', userController.authenticateToken, multerMiddleware, userController.updateUser);
router.get('/user/get-user-details', userController.authenticateToken, userController.getUserDetails);
router.delete('/user/delete', userController.authenticateToken, userController.deleteUser);
router.post('/user/change-password', userController.authenticateToken, userController.changePassword);


module.exports = router;