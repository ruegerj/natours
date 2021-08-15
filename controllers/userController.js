const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Utils
const filterObj = (obj, ...allowedFields) => {
  const filtered = {};

  Object.keys(obj)
    .filter((k) => allowedFields.includes(k))
    .forEach((k) => {
      filtered[k] = obj[k];
    });

  return filtered;
};

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

const profileImageUpload = multer({
  storage: imageMemoryStorage,
  fileFilter: imageFilter,
});

exports.uploadProfileImage = profileImageUpload.single('photo');

exports.resizeProfileImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Format: user-<id>-<timestamp>.<ext>
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({
      quality: 90,
    })
    .toFile(path.join('public', 'img', 'users', req.file.filename));

  next();
});

// Route handlers

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Strip critical data from body (which might be included)
  if (req.body.password || req.body.passwordConfirm) {
    throw new AppError(
      'This route is not for password updates. Please use /update-my-password',
      400
    );
  }

  // 2. Update user data
  const filteredBody = filterObj(req.body, 'name', 'email');

  if (req.file) {
    filteredBody.photo = req.file.filename;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined, please use /signup instead',
  });
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
