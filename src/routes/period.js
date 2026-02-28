const express = require('express');
const PeriodTracker = require('../models/PeriodTracker');

const router = express.Router();
const GLOBAL_KEY = 'global';

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeLoggedDates(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Set(values.filter(isIsoDate));
  return Array.from(unique).sort();
}

function toClientShape(doc) {
  return {
    anchorDate: doc?.anchorDate || '',
    periodLength: clampNumber(doc?.periodLength, 2, 10, 5),
    cycleLength: clampNumber(doc?.cycleLength, 20, 45, 28),
    loggedDates: sanitizeLoggedDates(doc?.loggedDates || []),
    updatedAt: doc?.updatedAt || null,
  };
}

router.get('/', async (_req, res) => {
  try {
    const doc = await PeriodTracker.findOne({ key: GLOBAL_KEY });
    return res.json(toClientShape(doc));
  } catch (_err) {
    return res.status(500).json({ error: 'Could not fetch period tracker' });
  }
});

router.put('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const update = {
      key: GLOBAL_KEY,
      anchorDate: isIsoDate(payload.anchorDate) ? payload.anchorDate : '',
      periodLength: clampNumber(payload.periodLength, 2, 10, 5),
      cycleLength: clampNumber(payload.cycleLength, 20, 45, 28),
      loggedDates: sanitizeLoggedDates(payload.loggedDates),
    };

    const doc = await PeriodTracker.findOneAndUpdate(
      { key: GLOBAL_KEY },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json(toClientShape(doc));
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not save period tracker' });
  }
});

module.exports = router;
