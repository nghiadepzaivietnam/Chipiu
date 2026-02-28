const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hdha';

// Database
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('Mongo error:', err));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/moments', require('./routes/moments'));
app.use('/api/status', require('./routes/status'));
app.use('/api/counter-bg', require('./routes/counterBackground'));
app.use('/api/period', require('./routes/period'));
app.use('/api/period-ai', require('./routes/periodAi'));
app.use('/api/ai-chat', require('./routes/aiChat'));

// SPA fallback to serve index.html (anything not /api or /uploads)
app.get(/^\/(?!api|uploads).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
