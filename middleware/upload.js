const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + path.extname(file.originalname).toLowerCase())
});
module.exports = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'))
});
