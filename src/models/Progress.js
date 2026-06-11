const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  streak: {
    type: Number,
    default: 0
  },
  lastDate: {
    type: String,
    default: ''
  },
  totalCompleted: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Progress', progressSchema);
