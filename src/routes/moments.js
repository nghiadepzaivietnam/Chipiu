const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { execFile } = require('child_process');
const { promisify } = require('util');
const Moment = require('../models/Moment');
const { cloudinary, isCloudinaryEnabled, toPublicIdFromUrl } = require('../lib/cloudinary');

const router = express.Router();

const execFileAsync = promisify(execFile);
let ffmpegChecked = false;
let ffmpegAvailable = false;
let ffmpegPath = 'ffmpeg';

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

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const baseDir = path.join(
      process.env.LOCALAPPDATA,
      'Microsoft',
      'WinGet',
      'Packages',
    );
    try {
      const packageDirs = fs.readdirSync(baseDir);
      const ffmpegPackage = packageDirs.find((dir) => dir.startsWith('Gyan.FFmpeg_'));
      if (ffmpegPackage) {
        const pkgRoot = path.join(baseDir, ffmpegPackage);
        const builds = fs.readdirSync(pkgRoot);
        const buildDir = builds.find((dir) => dir.startsWith('ffmpeg-') && dir.includes('full_build'));
        if (buildDir) {
          const candidate = path.join(pkgRoot, buildDir, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    } catch (_err) {
      return 'ffmpeg';
    }
  }

  return 'ffmpeg';
}

async function checkFfmpeg() {
  if (ffmpegChecked) return ffmpegAvailable;
  ffmpegChecked = true;
  ffmpegPath = resolveFfmpegPath();
  try {
    await execFileAsync(ffmpegPath, ['-version']);
    ffmpegAvailable = true;
  } catch (_err) {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

async function compressVideoIfPossible(inputPath) {
  const canRun = await checkFfmpeg();
  if (!canRun) return { path: inputPath, compressed: false };

  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const outputPath = path.join(path.dirname(inputPath), `${base}-compressed.mp4`);

  const args = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    'scale=min(1280,iw):-2',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '28',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  await execFileAsync(ffmpegPath, args);
  await safeDeleteFile(inputPath);
  return { path: outputPath, compressed: true };
}

function buildDiskPathFromUrl(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;
  if (!urlPath.startsWith('/uploads/')) return null;
  const filename = path.basename(urlPath);
  return path.join(uploadDir, filename);
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
      const userId = req.userId || 'default';
      const { owner, caption, allowCombined } = req.body;
      const normalizedOwner = normalizeOwnerInput(owner);
      let mediaType = 'none';
      let mediaUrl;

      if (req.file) {
        mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
        let localPath = req.file.path;

        if (mediaType === 'video') {
          try {
            const compressed = await compressVideoIfPossible(localPath);
            localPath = compressed.path;
          } catch (err) {
            console.error('Video compression failed:', err.message);
          }
        }

        if (isCloudinaryEnabled) {
          const uploadResult = await cloudinary.uploader.upload(localPath, {
            folder: 'hdha/moments',
            resource_type: mediaType === 'video' ? 'video' : 'image',
            ...(mediaType === 'video'
              ? {
                  eager: [
                    {
                      width: 1280,
                      height: 720,
                      crop: 'limit',
                      quality: 'auto',
                      fetch_format: 'mp4',
                      video_codec: 'h264',
                      audio_codec: 'aac',
                    },
                  ],
                }
              : {}),
          });
          mediaUrl = uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url;
          await safeDeleteFile(localPath);
        } else {
          const filename = path.basename(localPath);
          mediaUrl = `/uploads/${filename}`;
        }
      }

      const moment = await Moment.create({
        userId,
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
    const userId = req.userId || 'default';
    const { owner, combined } = req.query;
    const filter = { userId };
    if (owner) filter.owner = normalizeOwnerInput(owner);
    if (combined === 'true') filter.allowCombined = true;

    const moments = await Moment.find(filter).sort({ createdAt: -1 });
    res.json(moments);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch moments' });
  }
});

// Delete a moment by id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const moment = await Moment.findOne({ _id: req.params.id, userId });
    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    const oldDiskPath = buildDiskPathFromUrl(moment.mediaUrl);
    const oldPublicId = toPublicIdFromUrl(moment.mediaUrl);

    await Moment.deleteOne({ _id: moment._id, userId });
    await safeDeleteFile(oldDiskPath);

    if (isCloudinaryEnabled && oldPublicId) {
      const resourceType = moment.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: resourceType }).catch(() => {});
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Could not delete moment' });
  }
});

module.exports = router;
