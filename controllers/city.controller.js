const City = require('../models/city.model');
const User = require('../models/user.model');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.addCity = catchAsync(async (req, res, next) => {
  const { cityName, country, emoji, date, notes, position } = req.body;
  const { _id: user } = req.user;

  const newCIty = await City.create({ cityName, user, country, emoji, notes, date, position });

  res.status(201).json({
    success: true,
    message: 'City added ✔',
    city: newCIty,
  });
});

exports.getCities = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(City.find(), req.query).filter().sort().limitFields().paginate();

  const cities = await features.query;

  res.status(200).json({
    success: true,
    results: cities.length,
    cities: cities,
  });
});

exports.getCity = catchAsync(async (req, res, next) => {
  const cityId = req.params.id;

  if (!cityId) {
    return next(new AppError('Please provide a city id', 400));
  }

  const city = await City.findById(cityId);

  if (!city) {
    return next(new AppError(`No city found with this ID => ${cityId}`, 404));
  }

  res.status(200).json({
    success: true,
    city: city,
  });
});

exports.updateCity = catchAsync(async (req, res, next) => {
  return res.status(501).json({
    success: false,
    message: 'The request method is not supported by the server and cannot be handled',
  });
  // destructuring required fields
  const { status } = req.body;

  //
  if (status === 'Pending') {
    return next(new AppError('Please select Approve or Reject', 400));
  }

  // finding leave application
  const leave = await City.findById(req.params.id);

  if (!leave) {
    return next(new AppError('No leave application found with that ID', 404));
  }

  // checking if application is already in approved state
  if (leave.status === 'Approved') {
    console.log('Already Approved');
    return next(new AppError('Application already approved', 400));
  }

  if (leave.status === 'Rejected' && status === 'Approved') {
    return next(new AppError('Once an application is rejected can not be approved again', 403));
  }

  // finding user who applied for leave
  const user = await User.findById(leave.user);

  if (!user) {
    return next(new AppError('No user found belong to this application', 404));
  }

  // checking leave type and taking action to the corresponding leave
  if (status === 'Approved') {
    if (leave.leaveType === 'CL') {
      console.log('Casual Leave');
      const remaningCL = user.casualLeave - leave.numberOfDays;
      user.casualLeave = remaningCL;
    } else if (leave.leaveType === 'ML') {
      console.log('Medical Leave');
      const remaningML = user.medicalLeave - leave.numberOfDays;
      user.medicalLeave = remaningML;
    } else if (leave.leaveType === 'SL') {
      console.log('Special Leave');
      const takenSL = user.specialLeave + leave.numberOfDays;
      user.specialLeave = takenSL;
    }
  }

  /* we have to implement Transactions concept: MongoDB two phase commit */

  await user.save({ validateBeforeSave: false });

  leave.status = req.body.status;
  await leave.save();

  const url = 'https://www.google.com/';
  // await new Email(user, url).updatedLeaveApplication();

  res.status(200).json({
    status: 'success',
    message: 'Application updated',
    leave: leave,
  });
});

exports.deleteCity = catchAsync(async (req, res, next) => {
  const cityId = req.params.id;

  if (!cityId) {
    return next(new AppError('Please provide a city id', 400));
  }

  const city = await City.deleteOne({ _id: cityId });

  if (city?.deletedCount === 0) {
    return next(new AppError(`No city found with this ID => ${cityId}`, 404));
  }

  res.status(200).json({
    success: true,
    message: 'City deleted!',
  });
});
