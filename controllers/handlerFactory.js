const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const QueryBuilder = require('../utils/queryBuilder');

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour
    let filter = {};

    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }

    // Execute query
    const builder = new QueryBuilder(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const documents = await builder.query;

    // Send response
    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        items: documents,
      },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const document = await query;

    if (!document) {
      return next(new AppError(`No tour found for id: ${req.params.id}`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        item: document,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDocument = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        item: newDocument,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      return next(
        new AppError(`No document found for id: ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        item: document,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(
        new AppError(`No document found for id: ${req.params.id}`, 404)
      );
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
