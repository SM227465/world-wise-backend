const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.confirmPassword) {
    return next(new AppError('This route is not for password updates, Please use /updateMyPassword', 400));
  }

  const filteredBody = filterObj(req.body, 'firstName', 'lastName', 'phoneNumber', 'email');

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Information updated successfully',
    data: {
      user: updatedUser,
    },
  });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: 'success',
    results: users.length,
    users: users,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    user: user,
  });
});

exports.updateRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return next(new AppError('Role is required', 400));
  }

  const roles = ['EMPLOYEE', 'HR', 'ADMIN', 'MANAGER'];

  if (!roles.includes(role)) {
    return next(
      new AppError(`Invalid role! Please choose among of these -> 'EMPLOYEE', 'HR', 'ADMIN', 'MANAGER' `, 400)
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  user.role = role;

  const updatedUser = await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User role has been updated',
    user: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  await user.remove();

  res.status(200).json({
    status: 'success',
    message: 'Your account was successfully deleted',
  });
});
