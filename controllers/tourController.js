const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Image upload
const imageMemoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image');

  if (!isImage) {
    return cb(
      new AppError('Not an image! Please upload only images', 400),
      false
    );
  }

  cb(null, true);
};

const imageUpload = multer({
  storage: imageMemoryStorage,
  fileFilter: imageFilter,
});

exports.uploadTourImages = imageUpload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) {
    return next();
  }

  const resizeOperations = [];

  // 1. Cover image
  const coverImage = req.files.coverImage[0];

  if (coverImage) {
    const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    const coverImageResizeOperation = sharp(coverImage.buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({
        quality: 90,
      })
      .toFile(path.join('public', 'img', 'tours', imageCoverFilename));

    resizeOperations.push(coverImageResizeOperation);

    req.body.imageCover = imageCoverFilename;
  }

  // 2. Images
  req.body.images = [];

  const imageResizeOperations = req.files.images.map(async (file, i) => {
    const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

    await sharp(file.buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({
        quality: 90,
      })
      .toFile(path.join('public', 'img', 'tours', filename));

    req.body.images.push(filename);
  });

  resizeOperations.concat(imageResizeOperations);

  await Promise.all(resizeOperations);

  next();
});

// Aliases
exports.aliasTopTours = (req, res, next) => {
  // Prefill request query
  req.query = {
    ...req.query,
    limit: 5,
    sort: '-ratingsAverage,price',
    fields: 'name,price,ratingsAverage,summary,difficulty',
  };

  next();
};

// Route handlers
exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // avgPrice ASC
    },
    // {
    //   $match: { _id: { ne: 'easy' } },
    // },
  ]);

  res.status(200).json({
    stats: 'successful',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(year, 1, 1),
          $lte: new Date(year, 12, 31),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    stats: 'successful',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lnt] = latlng.split(',');

  if (!lat || !lnt) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format: lat,lng',
        400
      )
    );
  }

  // Get radius of the earth in miles or kilometers based on the unit
  const earthRadius = unit === 'mi' ? 3963.2 : 6378.1;

  // Calc sphere radius in radiant
  const radius = distance / earthRadius;

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lnt, lat], radius],
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lnt] = latlng.split(',');

  // Calculate unit multiplier for miles
  const unitMultiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lnt) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format: lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lnt * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: unitMultiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
        _id: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      distances,
    },
  });
});
