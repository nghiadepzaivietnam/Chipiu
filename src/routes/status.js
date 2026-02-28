const express = require('express');
const Status = require('../models/Status');

const router = express.Router();

// Get latest status
router.get('/', async (_req, res) => {
  try {
    const latest = await Status.findOne().sort({ createdAt: -1 });
    res.json(latest || {});
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch status' });
  }
});

// Create or update status
router.post('/', async (req, res) => {
  try {
    const { city, temperatureC, condition, note } = req.body;
    const status = await Status.create({ city, temperatureC, condition, note });
    res.status(201).json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
