const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

async function saveUploadedMedia(file, folder = 'media') {
  if (!file?.buffer) throw new Error('No file uploaded');
  const ext = EXTENSIONS[file.mimetype] || path.extname(file.originalname || '') || '.bin';
  const safeFolder = String(folder).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'media';
  const uploadRoot = path.join(__dirname, '../../uploads', safeFolder);
  await fs.promises.mkdir(uploadRoot, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(uploadRoot, filename), file.buffer);
  return `/uploads/${safeFolder}/${filename}`;
}

module.exports = { saveUploadedMedia };
