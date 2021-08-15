const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const mongoose = require('mongoose');

// Global handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[Fatal error] ${err.name}: ${err.message}`);
  console.error('Shutting down app...');

  process.exit(1);
});

// Configure node from file
const config = dotenv.config({
  path: './config.env',
});
dotenvExpand(config); // Expand config with variables

// Connect to db
const connectionString = process.env.DATABASE_CONNECTION;
mongoose
  .connect(connectionString, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log('Connected to database'));

// Setup express app
const app = require('./app');

const port = process.env.PORT || 3000;
const server = app.listen(port, 'localhost', () =>
  console.log(`Listening on port ${port}...`)
);

// Global handler for promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Fatal error] ${err.name}: ${err.message}`);
  console.error('Shutting down app...');

  server.close(() => process.exit(1));
});
