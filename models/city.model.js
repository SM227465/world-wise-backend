const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const citySchema = new mongoose.Schema({
  cityName: {
    type: String,
    required: [true, 'Please provide a city name'],
  },

  country: {
    type: String,
    required: [true, 'Every city should belong to a country.'],
  },

  emoji: {
    type: String,
    required: [true, 'Every city should have a flag emoji of its country.'],
  },

  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Leave should belong to an employee'],
  },

  date: {
    type: Date,
    required: [true, 'Please provide a date when you visited.'],
  },

  notes: {
    type: String,
    required: [true, 'Please provide a short description of your experience or share a memory.'],
  },

  position: {
    lat: {
      type: Number,
      required: [true, 'Every location must have latitude.'],
    },
    lng: {
      type: Number,
      required: [true, 'Every location must have longitude'],
    },
  },

  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const City = mongoose.model('City', citySchema);

module.exports = City;
