const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');

router.get('/', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  console.log('POST /api/todos - body:', req.body);
  try {
    const todo = new Todo({
      title: req.body.title,
      completed: req.body.completed || false,
      dueDate: req.body.dueDate || undefined
    });
    const savedTodo = await todo.save();
    res.status(201).json(savedTodo);
  } catch (err) {
    console.error('POST /api/todos - error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const update = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.completed !== undefined) update.completed = req.body.completed;
    if (req.body.dueDate !== undefined) update.dueDate = req.body.dueDate;
    const todo = await Todo.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: 'after', runValidators: true }
    );
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json({ message: 'Todo deleted', todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;