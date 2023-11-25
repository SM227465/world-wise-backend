const AppError = require('../utils/appError');

// Helper functions for handle production error
// i) for cast error
const handleCastErrDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// ii) for duplicate value
const handleDuplicateFieldsDB = (err) => {
  /* For Number data type: 
  below code will not work for any Number data type,
  here i am checking an unique property of error that exits,
  if you found any production error on Number data types you have to do the same,
  or write a good RegEx that work for every Number data types :)
  */
  if (err.keyValue.phoneNumber) {
    const message = `${err.keyValue.phoneNumber} is already in use! try another number`;

    return new AppError(message, 400);
  }

  /* For String data type:  below codes will work fine for all String data types */
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}, Please use another value!`;

  return new AppError(message, 400);
};

// iii) for validation error
const handleValidationErrDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// iv) for JWT error
const handleJWTError = () => {
  return new AppError('Invalid token! Please login again', 401);
};

// v) for JWT expire
const handleJWTExpired = () => {
  return new AppError('Your token has expired! Please login again', 401);
};

// Error Handling
// i) Handling development error
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// ii) Handling production error
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

// Global Error Handling Module
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = false;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = err;
    if (error.name === 'CastError') error = handleCastErrDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpired();
    sendErrorProd(error, res);
  }
};
