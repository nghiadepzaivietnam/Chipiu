const express = require("express");
const WaterReminder = require("../models/WaterReminder");

const router = express.Router();
const GLOBAL_KEY = "global";

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeTimes(list) {
  if (!Array.isArray(list)) return null;
  const cleaned = list
    .map((t) => String(t || "").trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t));
  return [...new Set(cleaned)].slice(0, 12);
}

function sanitizeGoal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(30, Math.max(1, Math.round(n)));
}

function sanitizeCounts(raw) {
  if (!raw || typeof raw !== "object") return null;
  const haiAnh = Math.max(0, Number(raw.haiAnh ?? raw["hai-anh"] ?? 0));
  const trongNghia = Math.max(0, Number(raw.trongNghia ?? raw["trong-nghia"] ?? 0));
  return { haiAnh, trongNghia };
}

function sortByDateDesc(entries) {
  return [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function getOrCreateDoc(userId = "default") {
  let doc = await WaterReminder.findOne({ userId, key: GLOBAL_KEY });
  if (!doc) {
    doc = await WaterReminder.create({ userId, key: GLOBAL_KEY });
  }
  return doc;
}

router.get("/", async (req, res) => {
  try {
    const userId = req.userId || "default";
    const doc = await getOrCreateDoc(userId);
    const entries = sortByDateDesc(doc.entries || []).slice(0, 365);
    const today = new Date().toISOString().slice(0, 10);
    const entry = entries.find((e) => e.date === today) || { date: today, counts: { haiAnh: 0, trongNghia: 0 } };
    return res.json({
      today,
      goal: doc.goal || 8,
      times: Array.isArray(doc.times) ? doc.times : [],
      entry,
      entries,
      updatedAt: doc.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Khong the tai nhac uong nuoc." });
  }
});

router.put("/", async (req, res) => {
  try {
    const userId = req.userId || "default";
    const payload = req.body || {};
    const date = isIsoDate(payload.date) ? payload.date : null;
    const nextGoal = sanitizeGoal(payload.goal);
    const nextTimes = sanitizeTimes(payload.times);
    const nextCounts = sanitizeCounts(payload.counts);

    if (!date && nextGoal === null && nextTimes === null) {
      return res.status(400).json({ error: "Du lieu khong hop le." });
    }

    const doc = await getOrCreateDoc(userId);

    if (nextGoal !== null) doc.goal = nextGoal;
    if (nextTimes !== null) doc.times = nextTimes;

    if (date) {
      const list = Array.isArray(doc.entries) ? [...doc.entries] : [];
      const idx = list.findIndex((e) => e.date === date);
      const safeCounts = nextCounts || { haiAnh: 0, trongNghia: 0 };
      const entry = { date, counts: safeCounts, updatedAt: new Date() };
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
      doc.entries = sortByDateDesc(list).slice(0, 365);
    }

    await doc.save();

    const entries = sortByDateDesc(doc.entries || []).slice(0, 365);
    const today = new Date().toISOString().slice(0, 10);
    const entry = entries.find((e) => e.date === today) || { date: today, counts: { haiAnh: 0, trongNghia: 0 } };

    return res.json({
      ok: true,
      today,
      goal: doc.goal || 8,
      times: Array.isArray(doc.times) ? doc.times : [],
      entry,
      entries,
      updatedAt: doc.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Khong the luu nhac uong nuoc." });
  }
});

module.exports = router;
