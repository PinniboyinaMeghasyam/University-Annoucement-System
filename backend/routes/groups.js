const express = require('express');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const {
  createGroup,
  getMyGroups,
  getGroupInfo,
  joinByToken,
  triggerYearProgression,
  deleteGroup,
  exitGroup,
  removeMember,
  getGroupsBySection
} = require('../controllers/groupController');
const {
  sendMessage,
  getMessages,
  deleteMessage,
  getSummary,
  toggleReaction,
  createPoll,
  votePoll,
  pinMessage,
  toggleStar,
  getMessageInfo
} = require('../controllers/groupMessageController');

const router = express.Router();

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
      folder: 'group_messages',
      resource_type: resource_type,
      use_filename: true,
      unique_filename: true
    };
  }
});

const upload = multer({ storage: storage });

// Group management routes
router.post('/', auth, createGroup);
router.get('/my', auth, getMyGroups);
router.get('/mine', auth, getMyGroups);
router.get('/by-section/:section', auth, getGroupsBySection);
router.get('/:id', auth, getGroupInfo);
router.delete('/:id', auth, deleteGroup);
router.post('/:id/exit', auth, exitGroup);
router.delete('/:id/members/:userId', auth, removeMember);
router.get('/join/:token', auth, joinByToken);

// Year progression (admin only)
router.post('/progression', auth, triggerYearProgression);

// Group message routes
router.get('/:id/messages', auth, getMessages);
router.post('/:id/messages', auth, upload.array('files', 10), sendMessage);
router.get('/:id/summary', auth, getSummary);
router.delete('/messages/:messageId', auth, deleteMessage);
router.post('/messages/:messageId/reaction', auth, toggleReaction);
router.post('/messages/:messageId/vote', auth, votePoll);
router.post('/messages/:messageId/pin', auth, pinMessage);
router.put('/messages/:messageId/star', auth, toggleStar);
router.get('/messages/:messageId/info', auth, getMessageInfo);
router.post('/poll', auth, createPoll);

module.exports = router;
