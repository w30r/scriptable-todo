const mongoose = require('mongoose');

const elsaCardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['role', 'project', 'workflow', 'note']
  },
  content: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ElsaCard', elsaCardSchema);
