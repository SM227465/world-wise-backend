const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
// const Email = require('../utils/email');
const dotenv = require('dotenv');

// setting path for .env file
dotenv.config({ path: './config.env' });

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const cookieOptions = {
  expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
  /* use secure: true when there is a https connection, otherwise not work */
  // secure: true,
  httpOnly: true,
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    // secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // remove password field before send to client
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // Destructuring required fields from req.body
  const { firstName, lastName, email, phoneNumber, password, confirmPassword } = req.body;

  // checking if user exists with this email
  const user = await User.findOne({ email: email });

  // if exists return error
  if (user) {
    return next(new AppError(`A user exists with this email; if it's you, please login.`, 400));
  }

  // if there is no user with this email, create a new user
  const newUser = await User.create({
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    confirmPassword,
  });

  const url = 'https://www.google.com/';

  // sending welcome email to new user
  //   await new Email(newUser, url).sendWelcome();

  // generating token
  const token = signToken(newUser._id);

  // removing password field before send response
  newUser.password = undefined;

  // sending token via cookie
  res.cookie('jwt', token, cookieOptions);

  res.status(201).json({
    status: true,
    message: 'Your account has been created successfully.',
    token: {
      access: token,
      refresh: null,
    },
    user: newUser,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // checking if email & password exist, if not return error
  if (!email || !password) {
    return next(new AppError('Please provide an email and password.', 400));
  }

  // finding user in DB by email
  const user = await User.findOne({ email }).select('+password');

  // if user dont exists or password is incorrect return error
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // everything is OK, generate token
  const token = signToken(user._id);

  // remove password field before send the response
  user.password = undefined;

  // sending token via cookie
  res.cookie('jwt', token, cookieOptions);

  res.status(200).json({
    success: true,
    token: {
      access: token,
      refresh: null,
    },
    user: user,
  });
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'logging out...', {
    expires: new Date(Date.now() + 1 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'You have been successfully logged out',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1st Check if there is a header with name of authorization and the authorization header starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // if exists grab the token
    token = req.headers.authorization.split(' ')[1];
  }
  // If there is no such things, then look into cookies for a cookie name jwt
  else if (req.cookies.jwt) {
    // if exist grab the token
    token = req.cookies.jwt;
  }

  // still, if there is no token anyhow just return an error
  if (!token) {
    return next(new AppError('You are not logged in! Please login to get access', 401));
  }

  //ok if here means token found: just do a verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_KEY);

  // finding the user who belongs to this token from decoded token
  const currentUser = await User.findById(decoded.id);

  // if no user found from decoded token return an error
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist', 401));
  }

  // check the timestamp if the user changed the password after token was issued, if true ask user to login again for new token
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please login again', 401));
  }

  // finally if everything is ok give access to protected route
  req.user = currentUser;
  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // Verify token
    const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET_KEY);

    // check if user still exists
    const currentUser = await User.findById(decoded.id);

    // if no user found from decoded token return to the next middleware
    if (!currentUser) {
      return next();
    }

    // check the timestamp if the user changed the password after token was issued, if true ask user to login again for new token
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    // there is a logged in user
    res.locals.user = currentUser;
    return next();
  }

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Destructuring email from req.body
  const { email } = req.body;

  // check if email is present, if not return error
  if (!email) {
    return next(new AppError('Email is required! Please provide your email address', 400));
  }

  // get the user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  // checking for user existence, if not return error
  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  // generating a passwrd reset token and save to the requested user profile
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // attaching token to a route for generate a password reset link
    const resetURl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    // trying to send email to the requested user with password reset link
    // await new Email(user, resetURl).sendPasswordReset();

    // if everything is ok, send the response
    res.status(200).json({
      status: 'success',
      message: 'Check your email for an instruction',
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error in sending the email, Try again later.', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // checking if token is expired, if true return error (true means there will be no user)
  if (!user) {
    return next(new AppError('Token is invalid or link has expired', 400));
  }

  // destructing required fields from req.body
  const { password, confirmPassword } = req.body;

  // checking if required fields are present, if not return error
  if (!password || !confirmPassword) {
    return next(new AppError('Password & Confirm Password are required', 400));
  }

  // updating passwords from req.body also upadting reset token and its expiry
  user.password = password;
  user.confirmPassword = confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // save to DB
  await user.save();

  // send the response
  res.status(200).json({
    status: 'success',
    message: 'Your password reset was successful. Now login',
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // destructing required fields from req.body
  const { currentPassword, password, confirmPassword } = req.body;

  // checking if required fields are present, if not return error
  if (!currentPassword || !password || !confirmPassword) {
    return next(new AppError('Current Password, Password, Confirm Password are required', 400));
  }

  // i). Get user from DB by id
  const user = await User.findById(req.user.id).select('+password');

  // ii). Check if POSTed current password is correct, if not return error
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  // iii) if correct, update the password
  user.password = password;
  user.confirmPassword = confirmPassword;

  // iv) save to DB
  await user.save();

  // v) Log user in, send JWT
  // createAndSendToken(user, 200, res);
  const token = signToken(user._id);

  // removing sensitive information before sending response
  user.password = undefined;
  user.passwordChangedAt = undefined;

  res.status(200).json({
    status: 'success',
    message: 'Your password has been updated successfully',
    token: token,
    user: user,
  });
});
