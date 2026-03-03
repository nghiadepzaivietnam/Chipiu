const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const Journey = require('../models/Journey');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Chi cho phep anh jpeg/png/webp/gif.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

function sanitizeJourneyPayload(payload = {}) {
  const avatars = payload?.avatars || {};
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];

  const items = rawItems
    .map((it) => ({
      date: String(it?.date || '').trim().slice(0, 80),
      role: ['haianh', 'toi', 'both'].includes(it?.role) ? it.role : 'haianh',
      title: String(it?.title || '').trim().slice(0, 180),
      desc: String(it?.desc || '').trim().slice(0, 700),
      future: Boolean(it?.future),
    }))
    .filter((it) => it.title.length > 0)
    .slice(0, 120);

  return {
    avatars: {
      haianh: String(avatars?.haianh || '/hai-anh.jpg').trim(),
      toi: String(avatars?.toi || '/uploads/1772244572266-5389.jpg').trim(),
    },
    items,
  };
}

async function getOrCreateJourney(userId = 'default') {
  let doc = await Journey.findOne({ userId, key: 'main' });
  if (!doc) {
    doc = await Journey.create({ userId, key: 'main' });
  }
  return doc;
}

router.get('/', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const doc = await getOrCreateJourney(userId);
    res.json({
      avatars: doc.avatars || { haianh: '/hai-anh.jpg', toi: '/uploads/1772244572266-5389.jpg' },
      items: doc.items || [],
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Khong the tai du lieu hanh trinh.' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const data = sanitizeJourneyPayload(req.body);
    const doc = await Journey.findOneAndUpdate(
      { userId, key: 'main' },
      { $set: { userId, avatars: data.avatars, items: data.items } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      ok: true,
      avatars: doc.avatars,
      items: doc.items,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Khong the luu hanh trinh.' });
  }
});

router.get('/draft', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const doc = await getOrCreateJourney(userId);
    return res.json({
      avatars: doc?.builderDraft?.avatars || doc.avatars,
      items: doc?.builderDraft?.items || [],
      updatedAt: doc?.builderDraft?.updatedAt || doc?.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Khong the tai ban nhap hanh trinh.' });
  }
});

router.put('/draft', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const data = sanitizeJourneyPayload(req.body);
    const doc = await Journey.findOneAndUpdate(
      { userId, key: 'main' },
      {
        $set: {
          userId,
          builderDraft: {
            avatars: data.avatars,
            items: data.items,
            updatedAt: new Date(),
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({
      ok: true,
      avatars: doc?.builderDraft?.avatars || data.avatars,
      items: doc?.builderDraft?.items || data.items,
      updatedAt: doc?.builderDraft?.updatedAt || doc?.updatedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Khong the luu ban nhap hanh trinh.' });
  }
});

router.post('/avatar', (req, res) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Upload avatar that bai.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Khong co file avatar.' });
    }
    return res.json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
