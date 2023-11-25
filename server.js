const dotenv = require('dotenv');
const app = require('./app');
const logger = require('./utils/logger');
const connectWithDB = require('./db/db');

// Handling uncaught exception
process.on('uncaughtException', (err) => {
  console.info('UNCAUGHT EXCEPTION!');
  console.error(err.name, err.message);
  process.exit(1);
});

// setting path for .env file
dotenv.config({ path: './config.env' });

// Environment Logging
if (process.env.NODE_ENV === 'production') logger.info('You are working on Production environment');
else logger.info('You are working on Development environment');

// getting port number from environment
const port = process.env.PORT || 8000;

// connecting to DB
connectWithDB();

// creating a server
const server = app.listen(port, () => {
  logger.info(`App is running at http://localhost:${port}`);
});

// Handling unhandle promise rejection
process.on('unhandledRejection', (err) => {
  console.warn('UNHANDLED REJECTION!');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});
