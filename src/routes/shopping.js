const express = require('express');
const router = express.Router();
const ShoppingItem = require('../models/ShoppingItem');

router.get('/', async (req, res) => {
  try {
    const items = await ShoppingItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = new ShoppingItem({
      name: req.body.name,
      category: req.body.category,
      completed: req.body.completed || false
    });
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.completed !== undefined) updates.completed = req.body.completed;

    const item = await ShoppingItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Shopping item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/completed', async (req, res) => {
  try {
    const result = await ShoppingItem.deleteMany({ completed: true });
    res.json({ message: 'Completed items cleared', count: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await ShoppingItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Shopping item not found' });
    res.json({ message: 'Shopping item deleted', item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
