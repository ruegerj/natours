const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a price'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be greater or equal then 1.0'],
      max: [5, 'Rating must be less or equal then 5.0'],
      set: (val) => Math.round(val * 10) / 10, // Round values to decimals
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // Validator can only be applied when a document is created
        validator: function (val) {
          // Check if discount is lower than the actual price
          return val < this.price;
        },
        message:
          'Discount price ({VALUE}) must be less or equal then the actual price',
      },
    },
    summary: {
      type: String,
      required: [true, 'A tour must have a summary'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    // Include virtual properties in conversions
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Define custom indexes

// Compound index on the fields 'price' and 'ratingsAverage'
tourSchema.index({
  price: 1,
  ratingsAverage: -1,
});

tourSchema.index({
  slug: 1,
});

// 2d sphere index for geolocation data
tourSchema.index({
  startLocation: '2dsphere',
});

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate, e.g. "JOIN" in sql
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// Document Middleware
tourSchema.pre('save', function (next) {
  // runs before .save() and .create()
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Query Middleware
tourSchema.pre(/^find/, function (next) {
  // Filter all "secret" tours for all "find*" queries
  this.find({ secretTour: { $ne: true } });

  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

// Aggregation Middleware
tourSchema.pre('aggregate', function (next) {
  const firstAggregate = this.pipeline()[0];

  // Filter secret tours before aggregate
  const secretToursFilter = {
    $match: {
      secretTour: { $ne: true },
    },
  };

  // Insert filter aggregate at position 1 when geo-spatial aggregate
  const insertIndex = firstAggregate && firstAggregate.$geoNear ? 1 : 0;

  this.pipeline().splice(insertIndex, 0, secretToursFilter);

  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
