const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');

// GET /api/progress — returns the single progress document (creates one if none exists)
router.get('/', async (req, res) => {
  try {
    let progress = await Progress.findOne();
    if (!progress) {
      progress = await Progress.create({});
    }
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/progress — updates fields on the single progress document
router.put('/', async (req, res) => {
  try {
    const progress = await Progress.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(progress);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
