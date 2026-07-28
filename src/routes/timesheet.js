const express = require('express');
const router = express.Router();
const TimesheetEntry = require('../models/TimesheetEntry');

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    const entries = await TimesheetEntry.find(filter).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dates', async (req, res) => {
  try {
    const dates = await TimesheetEntry.aggregate([
      { $group: { _id: '$date', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } }
    ]);
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const entry = new TimesheetEntry({
      date: req.body.date,
      text: req.body.text
    });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const entry = await TimesheetEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Deleted', entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
