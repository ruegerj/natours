const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authenticationController');

const router = express.Router();

// Auth routes
router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// Apply auth middleware to all following routes
router.use(authController.protect);

router.patch('/update-my-password', authController.updatePassword);

// Current user routes
router
  .route('/me')
  .get(userController.getMe, userController.getUser)
  .patch(
    userController.uploadProfileImage,
    userController.resizeProfileImage,
    userController.updateMe
  )
  .delete(userController.deleteMe);

// Apply authorization middleware to all following routes
router.use(authController.restrictTo('admin'));

// User routes
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
