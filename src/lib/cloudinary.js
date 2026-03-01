const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryEnabled = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function toPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('res.cloudinary.com')) return null;

  const uploadToken = '/upload/';
  const uploadIdx = url.indexOf(uploadToken);
  if (uploadIdx === -1) return null;

  const afterUpload = url.slice(uploadIdx + uploadToken.length);
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  const lastDot = withoutVersion.lastIndexOf('.');
  return lastDot === -1 ? withoutVersion : withoutVersion.slice(0, lastDot);
}

module.exports = {
  cloudinary,
  isCloudinaryEnabled,
  toPublicIdFromUrl,
};
