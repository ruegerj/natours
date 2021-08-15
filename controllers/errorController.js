const AppError = require('../utils/appError');

const handleCastErrorDb = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;

  return new AppError(message, 400);
};

const handleDuplicateFieldsDb = (err) => {
  let field;

  if (err.keyValue) {
    field = Object.values(err.keyValue)[0];
  } else {
    field = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  }

  const message = `Duplicate field value: "${field}". Please use another value!`;

  return new AppError(message, 400);
};

const handleValidationErrorDb = (err) => {
  const errors = Object.values(err.errors).map((ve) => ve.message);

  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJwtError = () =>
  new AppError('Invalid token, please login again', 401);

const handleJwtExpiredError = () =>
  new AppError('Your token has expired, please login again', 401);

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode);

  // API error
  if (req.originalUrl.startsWith('/api')) {
    return res.json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  console.error('Unexpected error occured', err);

  // View error
  res.render('error', {
    title: 'Something went wrong',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  const isApiError = req.originalUrl.startsWith('/api');

  // Operational error handling
  if (err.isOperational) {
    res.status(err.statusCode);

    // Operational api error
    if (isApiError) {
      return res.json({
        status: err.status,
        message: err.message,
      });
    }

    // Operational view error
    return res.render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  }

  // All non operational errors
  console.error('Unexpected error occured', err);

  res.status(500);

  // Api error
  if (isApiError) {
    return res.json({
      status: 'error',
      message: 'Somthing went wrong',
    });
  }

  // View error
  res.render('error', {
    title: 'Someting went wrong',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const env = process.env.NODE_ENV;

  if (env === 'development') {
    sendErrorDev(err, req, res);
  } else if (env === 'production') {
    let error = {
      ...err,
      message: err.message,
    };

    // Handle mongoose cast error
    if (error.name === 'CastError') {
      error = handleCastErrorDb(err);
    }

    // Handle duplicate fields error
    if (error.code === 11000) {
      error = handleDuplicateFieldsDb(error);
    }

    // Handle mongoose validation error
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDb(error);
    }

    // Handle jwt structure/signature errors
    if (error.name === 'JsonWebTokenError') {
      error = handleJwtError();
    }

    // Handle jwt expiration errors
    if (error.name === 'TokenExpiredError') {
      error = handleJwtExpiredError();
    }

    sendErrorProd(error, req, res);
  }
};
