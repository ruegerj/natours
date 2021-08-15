const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authenticationController');

const reviewRouter = express.Router({
  mergeParams: true, // Give access to params from delegated requests
});

// Apply auth middleware to all following requests
reviewRouter.use(authController.protect);

reviewRouter
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourAndUserIds,
    reviewController.createReview
  );

reviewRouter
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = reviewRouter;
