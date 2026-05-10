require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const todoRoutes = require('./src/routes/todos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/todos', todoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;