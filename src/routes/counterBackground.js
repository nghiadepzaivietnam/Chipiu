const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const CounterBackground = require('../models/CounterBackground');
const { cloudinary, isCloudinaryEnabled, toPublicIdFromUrl } = require('../lib/cloudinary');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function buildDiskPathFromUrl(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;
  if (!urlPath.startsWith('/uploads/')) return null;
  const filename = path.basename(urlPath);
  return path.join(uploadDir, filename);
}

async function safeDeleteFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete old background file:', err.message);
    }
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

// Get current counter background
router.get('/', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const background = await CounterBackground.findOne({ userId }).sort({ updatedAt: -1 });
    res.json(background || {});
  } catch (err) {
    console.error('Counter background get error:', err.message);
    res.status(500).json({ error: 'Could not fetch counter background' });
  }
});

// Upload/replace counter background (single image only)
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image is required' });
  }

  try {
    const userId = req.userId || 'default';
    const existing = await CounterBackground.findOne({ userId }).sort({ updatedAt: -1 });

    let newImageUrl = `/uploads/${req.file.filename}`;
    let newImagePublicId = null;

    if (isCloudinaryEnabled) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'hdha/counter-background',
        resource_type: 'image',
      });
      newImageUrl = uploadResult.secure_url;
      newImagePublicId = uploadResult.public_id || null;
      await safeDeleteFile(req.file.path);
    }

    const oldImagePath = buildDiskPathFromUrl(existing?.imageUrl);

    let background;
    if (existing) {
      existing.imageUrl = newImageUrl;
      existing.imagePublicId = newImagePublicId;
      existing.userId = userId;
      background = await existing.save();
    } else {
      background = await CounterBackground.create({
        userId,
        imageUrl: newImageUrl,
        imagePublicId: newImagePublicId,
      });
    }

    await safeDeleteFile(oldImagePath);

    const oldPublicId = existing?.imagePublicId || toPublicIdFromUrl(existing?.imageUrl);
    if (isCloudinaryEnabled && oldPublicId && oldPublicId !== newImagePublicId) {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'image' }).catch(() => {});
    }

    return res.status(201).json(background);
  } catch (err) {
    await safeDeleteFile(path.join(uploadDir, req.file.filename));
    return res.status(400).json({ error: err.message });
  }
});

// Remove current counter background
router.delete('/', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const existing = await CounterBackground.findOne({ userId }).sort({ updatedAt: -1 });
    if (!existing) return res.json({ ok: true });

    const oldImagePath = buildDiskPathFromUrl(existing.imageUrl);
    await CounterBackground.deleteOne({ _id: existing._id });
    await safeDeleteFile(oldImagePath);

    const oldPublicId = existing.imagePublicId || toPublicIdFromUrl(existing.imageUrl);
    if (isCloudinaryEnabled && oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'image' }).catch(() => {});
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Counter background delete error:', err.message);
    return res.status(500).json({ error: 'Could not remove counter background' });
  }
});

module.exports = router;
