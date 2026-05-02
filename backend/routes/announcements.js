const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { auth, teacherAuth, studentAuth } = require('../middleware/auth');
const { 
  createAnnouncement, 
  getSectionAnnouncements, 
  getAllAnnouncements, 
  getGlobalAnnouncements,
  getAnnouncementById, 
  updateAnnouncement, 
  deleteAnnouncement,
  toggleReaction,
  votePoll,
  getDashboardStats
} = require('../controllers/announcementController');

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
      folder: 'university_announcements',
      allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'ppt', 'doc', 'docx'],
      use_filename: true,
      unique_filename: true,
      resource_type: resource_type
    };
  }
});

const upload = multer({ storage: storage });

// Create announcement (Teachers and Admins)
router.post('/', auth, (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
}, createAnnouncement);

// Get announcements for a specific section (Students, Teachers, and Admins)
router.get('/section/:section', auth, getSectionAnnouncements);

// Get all announcements (Admin)
router.get('/all', auth, getAllAnnouncements);

// Get global announcements
router.get('/global', auth, getGlobalAnnouncements);

// Get dashboard statistics
router.get('/dashboard-stats', auth, getDashboardStats);

// Get group announcements
router.get('/group/:groupId', auth, require('../controllers/announcementController').getGroupAnnouncements);

// Get announcement by ID
router.get('/:id', auth, getAnnouncementById);

// Update announcement (Teacher who posted it)
router.put('/:id', auth, teacherAuth, updateAnnouncement);

// Delete announcement (Teacher who posted it)
router.delete('/:id', auth, teacherAuth, deleteAnnouncement);

// Toggle reaction
router.post('/:id/reaction', auth, toggleReaction);

// Vote poll
router.post('/:id/vote', auth, votePoll);

module.exports = router;
