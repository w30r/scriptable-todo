const express = require('express');
const router = express.Router();
const ElsaCard = require('../models/ElsaCard');

router.get('/', async (req, res) => {
  try {
    const cards = await ElsaCard.find().sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const card = new ElsaCard({
      title: req.body.title,
      category: req.body.category,
      content: req.body.content || ''
    });
    const saved = await card.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.content !== undefined) updates.content = req.body.content;

    const card = await ElsaCard.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const card = await ElsaCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted', card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
