const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
    },
  },
  {
    // Include virtual properties in conversions
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes

// Unique compound index -> enforce only one review per tour per user
reviewSchema.index(
  {
    tour: 1,
    user: 1,
  },
  {
    unique: true,
  }
);

// Query middleware

// Populate FKs
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // })

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// Pass review document from pre- to post-middleware
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // Obtain review document and store in query
  this.review = await this.findOne();

  next();
});

// Calculate statistics on create
reviewSchema.post('save', function () {
  // Access static methods via ctor
  this.constructor.calcAverageRatings(this.tour);
});

// Calculate statistics on update/delete
reviewSchema.post(/^findOneAnd/, async function () {
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

// Static schema methods
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: {
        tour: tourId,
      },
    },
    {
      $group: {
        _id: '$tour',
        nRating: {
          $sum: 1,
        },
        avgRating: {
          $avg: '$rating',
        },
      },
    },
  ]);

  const statsToApply = {
    ratingsQuantity: 0,
    ratingsAverage: 4.5,
  };

  if (stats.length) {
    statsToApply.ratingsQuantity = stats[0].nRating;
    statsToApply.ratingsAverage = stats[0].avgRating;
  }

  await Tour.findByIdAndUpdate(tourId, statsToApply);
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
