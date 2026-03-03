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

function sanitizeScale(value) {
  return clampNumber(value, 0, 5, 0);
}

function sanitizeMedication(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 240);
}

function sanitizeSymptomLogs(mapLike) {
  if (!mapLike || typeof mapLike !== 'object') return {};
  const out = {};
  for (const [iso, raw] of Object.entries(mapLike)) {
    if (!isIsoDate(iso)) continue;
    if (!raw || typeof raw !== 'object') continue;
    out[iso] = {
      mood: sanitizeScale(raw.mood),
      cramps: sanitizeScale(raw.cramps),
      backPain: sanitizeScale(raw.backPain),
      acne: sanitizeScale(raw.acne),
      sleep: sanitizeScale(raw.sleep),
      discharge: sanitizeScale(raw.discharge),
      medication: sanitizeMedication(raw.medication),
      updatedAt: new Date(),
    };
  }
  return out;
}

function sanitizeLeadDays(values) {
  if (!Array.isArray(values)) return [1, 2, 3];
  const clean = Array.from(
    new Set(
      values
        .map((v) => clampNumber(v, 1, 3, 0))
        .filter((v) => v >= 1 && v <= 3)
    )
  ).sort((a, b) => a - b);
  return clean.length ? clean : [1, 2, 3];
}

function sanitizeTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return m ? value : fallback;
}

function sanitizeReminders(raw) {
  return {
    periodLeadDays: sanitizeLeadDays(raw?.periodLeadDays),
    pill: {
      enabled: Boolean(raw?.pill?.enabled),
      time: sanitizeTime(raw?.pill?.time, '21:00'),
    },
    iron: {
      enabled: Boolean(raw?.iron?.enabled),
      time: sanitizeTime(raw?.iron?.time, '08:00'),
    },
    padChange: {
      enabled: Boolean(raw?.padChange?.enabled),
      intervalHours: clampNumber(raw?.padChange?.intervalHours, 1, 8, 4),
    },
  };
}

function toClientShape(doc) {
  const symptomLogsObj = doc?.symptomLogs
    ? (doc.symptomLogs.toObject ? doc.symptomLogs.toObject() : doc.symptomLogs)
    : {};
  return {
    anchorDate: doc?.anchorDate || '',
    periodLength: clampNumber(doc?.periodLength, 2, 10, 5),
    cycleLength: clampNumber(doc?.cycleLength, 20, 45, 28),
    loggedDates: sanitizeLoggedDates(doc?.loggedDates || []),
    symptomLogs: sanitizeSymptomLogs(symptomLogsObj),
    reminders: sanitizeReminders(doc?.reminders || {}),
    updatedAt: doc?.updatedAt || null,
  };
}

router.get('/', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const doc = await PeriodTracker.findOne({ userId, key: GLOBAL_KEY });
    return res.json(toClientShape(doc));
  } catch (_err) {
    return res.status(500).json({ error: 'Could not fetch period tracker' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const payload = req.body || {};
    const update = {
      userId,
      key: GLOBAL_KEY,
      anchorDate: isIsoDate(payload.anchorDate) ? payload.anchorDate : '',
      periodLength: clampNumber(payload.periodLength, 2, 10, 5),
      cycleLength: clampNumber(payload.cycleLength, 20, 45, 28),
      loggedDates: sanitizeLoggedDates(payload.loggedDates),
      symptomLogs: sanitizeSymptomLogs(payload.symptomLogs || {}),
      reminders: sanitizeReminders(payload.reminders || {}),
    };

    const doc = await PeriodTracker.findOneAndUpdate(
      { userId, key: GLOBAL_KEY },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json(toClientShape(doc));
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not save period tracker' });
  }
});

module.exports = router;
