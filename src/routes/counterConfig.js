const express = require('express');
const CounterConfig = require('../models/CounterConfig');

const router = express.Router();
const GLOBAL_KEY = 'global';

function normalizeIsoDateTime(value) {
  if (typeof value !== 'string') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function toClientShape(doc) {
  return {
    loveStartISO: normalizeIsoDateTime(doc?.loveStartISO),
    updatedAt: doc?.updatedAt || null,
  };
}

router.get('/', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const doc = await CounterConfig.findOne({ userId, key: GLOBAL_KEY });
    return res.json(toClientShape(doc));
  } catch (_err) {
    return res.status(500).json({ error: 'Could not fetch counter config' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const loveStartISO = normalizeIsoDateTime(req.body?.loveStartISO);
    const doc = await CounterConfig.findOneAndUpdate(
      { userId, key: GLOBAL_KEY },
      { userId, key: GLOBAL_KEY, loveStartISO },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json(toClientShape(doc));
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not save counter config' });
  }
});

module.exports = router;
