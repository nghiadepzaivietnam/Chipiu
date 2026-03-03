const express = require('express');
const Status = require('../models/Status');

const router = express.Router();

// Get latest status
router.get('/', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const latest = await Status.findOne({ userId }).sort({ createdAt: -1 });
    res.json(latest || {});
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch status' });
  }
});

// Create or update status
router.post('/', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const { city, temperatureC, condition, note } = req.body;
    const status = await Status.create({ userId, city, temperatureC, condition, note });
    res.status(201).json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
