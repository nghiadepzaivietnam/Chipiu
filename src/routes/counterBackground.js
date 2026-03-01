const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const stateFile = path.join(uploadDir, 'counter-background.json');

function buildDiskPathFromUrl(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;
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

async function readState() {
  try {
    const raw = await fs.promises.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.imageUrl === 'string' && parsed.imageUrl.length > 0) {
      return parsed;
    }
    return {};
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to read counter background state:', err.message);
    }
    return {};
  }
}

async function writeState(next) {
  const payload = {
    imageUrl: next?.imageUrl || null,
    updatedAt: new Date().toISOString(),
  };
  await fs.promises.writeFile(stateFile, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
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
    const background = await readState();
    res.json(background);
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

  const newImageUrl = `/uploads/${req.file.filename}`;

  try {
    const existing = await readState();
    const oldImagePath = buildDiskPathFromUrl(existing.imageUrl);
    const background = await writeState({ imageUrl: newImageUrl });

    await safeDeleteFile(oldImagePath);
    return res.status(201).json(background);
  } catch (err) {
    await safeDeleteFile(path.join(uploadDir, req.file.filename));
    return res.status(400).json({ error: err.message });
  }
});

// Remove current counter background
router.delete('/', async (_req, res) => {
  try {
    const existing = await readState();
    if (!existing.imageUrl) return res.json({ ok: true });

    const oldImagePath = buildDiskPathFromUrl(existing.imageUrl);
    await writeState({ imageUrl: null });
    await safeDeleteFile(oldImagePath);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Counter background delete error:', err.message);
    return res.status(500).json({ error: 'Could not remove counter background' });
  }
});

module.exports = router;
