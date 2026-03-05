const express = require("express");
const MoodMap = require("../models/MoodMap");

const router = express.Router();
const GLOBAL_KEY = "main";

const ALLOWED_MOODS = new Set(["great", "good", "okay", "tired", "sad", "stressed", "angry"]);

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeMood(value) {
  const v = String(value || "").trim().toLowerCase();
  return ALLOWED_MOODS.has(v) ? v : "okay";
}

function sanitizeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function normalizeEntry(raw = {}) {
  return {
    date: isIsoDate(raw.date) ? raw.date : "",
    mineMood: sanitizeMood(raw.mineMood),
    partnerMood: sanitizeMood(raw.partnerMood),
    mineReason: sanitizeText(raw.mineReason, 160),
    partnerReason: sanitizeText(raw.partnerReason, 160),
    note: sanitizeText(raw.note, 500),
    updatedAt: new Date(),
  };
}

function sortByDateDesc(entries) {
  return [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function getOrCreateDoc(userId = "default") {
  let doc = await MoodMap.findOne({ userId, key: GLOBAL_KEY });
  if (!doc) {
    doc = await MoodMap.create({ userId, key: GLOBAL_KEY, entries: [] });
  }
  return doc;
}

router.get("/", async (req, res) => {
  try {
    const userId = req.userId || "default";
    const doc = await getOrCreateDoc(userId);
    const entries = sortByDateDesc(doc.entries || []).slice(0, 180);
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = entries.find((e) => e.date === today) || null;
    return res.json({
      today,
      todayEntry,
      latestEntry: entries[0] || null,
      entries,
      updatedAt: doc.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Khong the tai mood map." });
  }
});

router.put("/", async (req, res) => {
  try {
    const userId = req.userId || "default";
    const payload = normalizeEntry(req.body || {});
    if (!payload.date) {
      return res.status(400).json({ error: "Ngay khong hop le (YYYY-MM-DD)." });
    }

    const doc = await getOrCreateDoc(userId);
    const list = Array.isArray(doc.entries) ? [...doc.entries] : [];
    const idx = list.findIndex((e) => e.date === payload.date);
    if (idx >= 0) list[idx] = payload;
    else list.push(payload);

    doc.entries = sortByDateDesc(list).slice(0, 365);
    await doc.save();

    return res.json({
      ok: true,
      entry: payload,
      latestEntry: doc.entries[0] || payload,
      entries: doc.entries,
      updatedAt: doc.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Khong the luu mood map." });
  }
});

router.delete("/:date", async (req, res) => {
  try {
    const userId = req.userId || "default";
    const date = String(req.params.date || "").trim();
    if (!isIsoDate(date)) {
      return res.status(400).json({ error: "Ngay khong hop le (YYYY-MM-DD)." });
    }

    const doc = await getOrCreateDoc(userId);
    const nextEntries = (doc.entries || []).filter((e) => e.date !== date);
    doc.entries = sortByDateDesc(nextEntries).slice(0, 365);
    await doc.save();

    return res.json({
      ok: true,
      latestEntry: doc.entries[0] || null,
      entries: doc.entries,
      updatedAt: doc.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Khong the xoa entry mood map." });
  }
});

module.exports = router;

