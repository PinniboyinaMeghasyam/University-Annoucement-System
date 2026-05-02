const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { auth } = require('../middleware/auth');
const { 
  sendMessage, 
  getMessages, 
  deleteMessage, 
  getSummary,
  toggleReaction,
  createPoll,
  votePoll,
  pinMessage,
  toggleStar
} = require('../controllers/groupMessageController');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'group_messages',
    resource_type: 'raw',
    use_filename: true,
    unique_filename: true
  }
});

const upload = multer({ storage });

router.post('/', auth, (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
}, sendMessage);

router.get('/', auth, getMessages);
router.get('/summary', auth, getSummary);

router.delete('/:messageId', auth, deleteMessage);

// Toggle reaction on a group message
router.post('/:messageId/reaction', auth, toggleReaction);

// Create a poll in a group
router.post('/poll', auth, createPoll);

// Vote on a poll message
router.post('/:messageId/vote', auth, votePoll);

// Pin/unpin a group message (teacher/admin)
router.patch('/:messageId/pin', auth, pinMessage);

// Toggle star for a group message (any member)
router.patch('/:messageId/star', auth, toggleStar);

// Get message info
router.get('/:messageId/info', auth, require('../controllers/groupMessageController').getMessageInfo);

module.exports = router;
