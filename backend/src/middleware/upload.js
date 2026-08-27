const multer = require('multer');

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function hasExpectedSignature(file) {
  const bytes = file?.buffer;
  if (!bytes?.length) return false;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const isIsoVideo = bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp';
  const isWebm = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

  switch (file.mimetype) {
    case 'image/jpeg': return isJpeg;
    case 'image/png': return isPng;
    case 'image/webp': return isWebp;
    case 'video/mp4':
    case 'video/quicktime': return isIsoVideo;
    case 'video/webm': return isWebm;
    default: return false;
  }
}

function formatUploadTypes(mimeTypes) {
  return mimeTypes
    .map((type) => type.split('/').pop().replace('jpeg', 'jpg').replace('quicktime', 'mov').toUpperCase())
    .join(', ');
}

function createUpload({ fieldName, fileSize = 5 * 1024 * 1024, label = 'File', mimeTypes = [] }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize },
    fileFilter: (req, file, cb) => {
      if (!mimeTypes.length || mimeTypes.includes(file.mimetype)) return cb(null, true);
      const err = new Error(`Please upload one of these file types: ${formatUploadTypes(mimeTypes)}.`);
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    },
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) {
        // MIME types come from the client and are not trustworthy by themselves.
        // Verify the binary signature before persisting user-controlled media.
        if (req.file && mimeTypes.length && !hasExpectedSignature(req.file)) {
          return res.status(400).json({ error: `${label} contents do not match the selected file type.` });
        }
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = Math.round(fileSize / 1024 / 1024);
          return res.status(413).json({ error: `${label} must be ${maxMb}MB or less.` });
        }
        return res.status(400).json({ error: err.message || 'Upload failed.' });
      }

      return res.status(400).json({ error: err.message || 'Upload failed.' });
    });
  };
}

function createImageUpload(options) {
  return createUpload({ mimeTypes: IMAGE_MIME_TYPES, ...options });
}

module.exports = {
  IMAGE_MIME_TYPES,
  createUpload,
  createImageUpload,
};
