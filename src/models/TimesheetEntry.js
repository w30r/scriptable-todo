const mongoose = require('mongoose');

const timesheetEntrySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

timesheetEntrySchema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.model('TimesheetEntry', timesheetEntrySchema);
