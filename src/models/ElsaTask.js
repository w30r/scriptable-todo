const mongoose = require('mongoose');

const elsaTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ElsaTask', elsaTaskSchema);
