const multer = require('multer');

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
      if (!err) return next();

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
