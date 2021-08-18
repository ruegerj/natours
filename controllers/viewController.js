const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;

  if (alert === 'booking') {
    res.locals.alert =
      "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediately, please come back later.";
  }

  next();
};

exports.getOverview = catchAsync(async (req, res) => {
  const tours = await Tour.find();

  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res) => {
  const { slug } = req.params;

  const tour = await Tour.findOne({
    slug,
  }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    throw new AppError('There is no tour with that name', 404);
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res) => {
  const bookings = await Booking.find({
    user: req.user.id,
  });

  const tourIds = bookings.map((booking) => booking.tour);

  const bookedTours = await Tour.find({
    _id: {
      $in: tourIds,
    },
  });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours: bookedTours,
  });
});
