const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// Register "pug" as template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Global middleware

// Serving static content
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP Headers
app.use(
  // TODO: Set proper CSP configuration to allow *.mapbox.com cdn
  helmet({
    contentSecurityPolicy: false,
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Apply rate limiting to api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again in an hour',
  },
});
app.use('/api', limiter);

// Parse request body
app.use(
  express.json({
    limit: '10kb', // Limit body size
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);

// Parse cookies
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter polution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Use response compression
app.use(compression());

// Mount routers
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Global handlers
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find route: ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
