const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validatePhoneNumber = require('../utils/phoneNumberValidator');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    minlength: [2, 'First name should not be less than 2 characters'],
    maxlength: [50, 'First name should not be more than 50 characters'],
    trim: true,
  },

  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    minlength: [2, 'Last name should not be less than 2 characters'],
    maxlength: [50, 'Last name should not be more than 50 characters'],
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'Please provide your email address'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid Email! Please provide a valid email address'],
  },

  phoneNumber: {
    type: Number,
    required: [true, 'Please provide your phone number'],
    unique: true,
    validate: [validatePhoneNumber, 'Invalid phone number! Please provide a valid phone number'],
  },

  role: {
    type: String,
    enum: ['GUEST', 'USER', 'ADMIN'],
    default: 'USER',
    uppercase: true,
  },

  password: {
    type: String,
    required: true,
    minlength: [8, 'Password should contain at least 8 characters'],
    maxlength: [16, 'Password should not be more than 16 characters'],
    select: false,
  },

  confirmPassword: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This validation method works only on create() and save()
      validator: function (confirmPassword) {
        return confirmPassword === this.password;
      },
      message: 'Passwords are not same',
    },
  },

  passwordChangedAt: { type: Date, select: false },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// 1. Mongoose pre middleware hook

/*Note - Pre middleware functions are executed one after another, when each middleware calls next.*/

// i) Password Hashing - encrypt user's password before save to DB
userSchema.pre('save', async function (next) {
  // checking if password is modified, if not return to next()
  if (!this.isModified('password')) {
    return next();
  }

  // if password is modified, hash the password
  this.password = await bcrypt.hash(this.password, 12);

  // delete the confirmPassword before save to DB and calling next()
  this.confirmPassword = undefined;
  next();
});

// ii)
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// 2. Instance methods
// i) Password comparing between user password in DB and provided password by user
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// ii) checking if password is changed after JWT issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    return JWTTimestamp < changedTimestamp;
  }

  // By default false: means not changed
  return false;
};

// iii) Generating a password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
