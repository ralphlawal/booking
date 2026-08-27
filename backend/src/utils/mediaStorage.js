// Store media as base64 data URLs directly in the database.
// Render's filesystem is ephemeral and not reachable from the frontend domain,
// so file-based storage would produce broken image URLs.
async function saveUploadedMedia(file) {
  if (!file?.buffer) throw new Error('No file uploaded');
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
}

module.exports = { saveUploadedMedia };
