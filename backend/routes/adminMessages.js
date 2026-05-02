const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { auth } = require('../middleware/auth');
const { 
  sendMessage, 
  getMessages,
  markAsRead,
  pinMessage,
  deleteMessage
} = require('../controllers/adminMessageController');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'admin_messages',
    // Force raw uploads to accept any file type
    resource_type: 'raw',
    use_filename: true,
    unique_filename: true
  }
});

const upload = multer({ storage: storage });

// Send admin message (Admins and Teachers only)
// Wrap multer to surface upload errors clearly when Cloudinary/multer fails
router.post('/', auth, (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      console.error('Admin message upload error:', err);
      const status = err.statusCode || 400;
      return res.status(status).json({
        message: 'File upload failed',
        error: err.message || String(err)
      });
    }
    return sendMessage(req, res, next);
  });
});

// Get all admin messages (All authenticated users)
router.get('/', auth, getMessages);

// Mark message as read
router.patch('/:messageId/read', auth, markAsRead);

// Pin/unpin message (Admins only)
router.patch('/:messageId/pin', auth, pinMessage);

// Delete message
router.delete('/:messageId', auth, deleteMessage);

// Toggle reaction
router.put('/:messageId/reaction', auth, require('../controllers/adminMessageController').toggleReaction);

// Toggle star
router.put('/:messageId/star', auth, require('../controllers/adminMessageController').toggleStar);

// Get message info
router.get('/:messageId/info', auth, require('../controllers/adminMessageController').getMessageInfo);

module.exports = router;
