const mongoose = require('mongoose');
const logger = require('../utils/logger');
const dotenv = require('dotenv');

// setting path for .env file
dotenv.config({ path: './config.env' });

const localDB = process.env.LOCAL_DB_URL;
const cloudDB = process.env.CLOUD_DB_URL.replace('<password>', process.env.CLOUD_DB_PASS);

const connectWithDB = () => {
  mongoose
    .set('strictQuery', false)
    .connect(cloudDB)
    .then(() => logger.info('Connected to MongoDB.'))
    .catch((err) => {
      logger.error('Failed to connect with MongoDB.');
      logger.error(err.message);
      process.exit(1);
    });
};

module.exports = connectWithDB;
