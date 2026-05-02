const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createSchedule, getSchedules, deleteSchedule } = require('../controllers/scheduledMessageController');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'scheduled_messages',
    resource_type: 'raw',
    use_filename: true,
    unique_filename: true
  }
});

const upload = multer({ storage });

router.post('/', auth, (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({
        message: 'File upload failed',
        error: err.message || String(err)
      });
    }
    return createSchedule(req, res, next);
  });
});
router.get('/', auth, getSchedules);
router.delete('/:id', auth, deleteSchedule);

module.exports = router;
