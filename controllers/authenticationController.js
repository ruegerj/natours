const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

// Secret should be atleast 32 chars long (or longer)
const secret = process.env.JWT_SECRET;

const signToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

const createAndSendToken = (user, statusCode, res, payload) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 26 * 60 * 60 * 1000
    ),
    httpOnly: true, // Deny access from browser
  };

  // Enable HTTPS only in production
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    data: {
      token,
      ...payload,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const ctaUrl = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, ctaUrl).sendWelcome();

  createAndSendToken(newUser, 201, res, { user: newUser });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exists
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // 2. Check if user exists && password correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  // 3. Create and send token
  createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', '', {
    expires: new Date(),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
};

// Authentication middleware for validating JWT's
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  const { authorization } = req.headers;

  // 1. Get token from either header or cookie and check if it exists
  if (authorization && authorization.startsWith('Bearer')) {
    token = authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    throw new AppError('Access denied, please provide a valid token', 401);
  }

  // 2. Validate token
  const decoded = await promisify(jwt.verify)(token, secret);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    throw new AppError(
      "The user for which this token was issued doesn't longer exists",
      401
    );
  }

  // 4. Check if user changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    throw new AppError("This token isn't valid anymore", 401);
  }

  // Access granted
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Authentication middleware (check) for views
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt;

  // 1. Check if cookie/token exists
  if (!token) {
    return next();
  }

  // 2. Verify the token
  const decoded = await promisify(jwt.verify)(token, secret);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next();
  }

  // 4. Check if user changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next();
  }

  // User is currently logged in
  res.locals.user = currentUser;

  next();
});

// Authorization middleware
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        "You don't have the permission to perform this action",
        403
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on provided email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new AppError('There is no user with that email address', 404);
  }

  // 2. Generate the random token for user
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send token to user's email
  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.json({
      status: 'Success',
      message: 'Token sendt to email',
    });
  } catch (error) {
    // Reset token and expire
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    throw new AppError(
      'There was an error sending the email, Try again later',
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Filter user by token and expiration
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. If token not expired and there is a user => set new password
  if (!user) {
    throw new AppError('Token is invalid, or has already expired', 400);
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3. Log the user in => send new JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from db
  const user = await User.findById(req.user._id).select('+password');

  // 2. Verify if provided password is correct
  if (
    !req.body.passwordCurrent ||
    !req.body.password ||
    !req.body.passwordConfirm
  ) {
    throw new AppError(
      'Please provide your current password, your new password and the confirmation of the new password',
      400
    );
  }

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    throw new AppError('Invalid password', 400);
  }

  // 3. If so => update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4. Log user in => send JWT
  createAndSendToken(user, 200, res);
});
