const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { auth } = require('../middleware/auth');
const { 
  sendMessage, 
  getMessages,
  deleteMessage
} = require('../controllers/personalMessageController');

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
  params: async (req, file) => {
    let resource_type = 'auto';
    if (file.mimetype === 'application/pdf' || 
        file.mimetype.includes('document') || 
        file.originalname.match(/\.(pdf|doc|docx|zip|ppt|pptx|xls|xlsx|txt)$/i)) {
      resource_type = 'raw';
    }
    return {
      folder: 'personal_messages',
      resource_type: resource_type,
      use_filename: true,
      unique_filename: true
    };
  }
});

const upload = multer({ storage: storage });

// Send personal message
router.post('/', auth, upload.array('files', 5), sendMessage);

// Get personal messages (Admins & Teachers)
router.get('/', auth, getMessages);

// Get conversation list (Admins & Teachers)
router.get('/conversations', auth, require('../controllers/personalMessageController').getConversations);

// Delete message
router.delete('/:messageId', auth, deleteMessage);

// Toggle reaction
router.put('/:messageId/reaction', auth, require('../controllers/personalMessageController').toggleReaction);

// Toggle star
router.put('/:messageId/star', auth, require('../controllers/personalMessageController').toggleStar);

// Pin/unpin message
router.patch('/:messageId/pin', auth, require('../controllers/personalMessageController').pinMessage);

// Get message info (read receipts)
router.get('/:messageId/info', auth, require('../controllers/personalMessageController').getMessageInfo);

module.exports = router;
