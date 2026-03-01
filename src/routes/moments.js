const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Moment = require('../models/Moment');
const { cloudinary, isCloudinaryEnabled } = require('../lib/cloudinary');

const router = express.Router();

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeOwnerInput(owner) {
  const key = normalizeText(owner);
  if (key.includes('hai') && key.includes('anh')) return 'Hải Anh';
  if (key.includes('trong') && key.includes('nghia')) return 'Trọng Nghĩa';
  return owner;
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/', 'video/'];
  if (allowed.some((type) => file.mimetype.startsWith(type))) {
    cb(null, true);
  } else {
    cb(new Error('Only image or video files are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

async function safeDeleteFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete temp upload file:', err.message);
    }
  }
}

// Create a new moment
router.post('/', (req, res) => {
  upload.single('media')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File quá lớn. Giới hạn hiện tại là 100MB.' });
      }
      return res.status(400).json({ error: uploadErr.message || 'Upload thất bại.' });
    }

    try {
      const { owner, caption, allowCombined } = req.body;
      const normalizedOwner = normalizeOwnerInput(owner);
      let mediaType = 'none';
      let mediaUrl;

      if (req.file) {
        mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

        if (isCloudinaryEnabled) {
          const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: 'hdha/moments',
            resource_type: mediaType === 'video' ? 'video' : 'image',
          });
          mediaUrl = uploadResult.secure_url;
          await safeDeleteFile(req.file.path);
        } else {
          mediaUrl = `/uploads/${req.file.filename}`;
        }
      }

      const moment = await Moment.create({
        owner: normalizedOwner,
        caption,
        mediaType,
        mediaUrl,
        allowCombined: allowCombined !== 'false', // string -> bool
      });

      return res.status(201).json(moment);
    } catch (err) {
      await safeDeleteFile(req.file?.path);
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  });
});

// List moments (optionally by owner or combined flag)
router.get('/', async (req, res) => {
  try {
    const { owner, combined } = req.query;
    const filter = {};
    if (owner) filter.owner = normalizeOwnerInput(owner);
    if (combined === 'true') filter.allowCombined = true;

    const moments = await Moment.find(filter).sort({ createdAt: -1 });
    res.json(moments);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch moments' });
  }
});

module.exports = router;
