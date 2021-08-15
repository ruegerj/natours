const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authenticationController');
const bookingController = require('../controllers/bookingController');

const viewRouter = express.Router();

viewRouter.get(
  '/',
  authController.isLoggedIn,
  bookingController.createBookingCheckout, // Temp hack
  viewController.getOverview
);
viewRouter.get(
  '/tour/:slug',
  authController.isLoggedIn,
  viewController.getTour
);
viewRouter.get(
  '/login',
  authController.isLoggedIn,
  viewController.getLoginForm
);
viewRouter.get('/me', authController.protect, viewController.getAccount);
viewRouter.get('/my-tours', authController.protect, viewController.getMyTours);

module.exports = viewRouter;
