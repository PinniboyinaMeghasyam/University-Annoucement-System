const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const Announcement = require('../models/Announcement');
const User = require('../models/User');

// Create announcement
const createAnnouncement = async (req, res) => {
  try {
    const { title, description, section, isGlobal, isPinned, expiryDate, poll } = req.body;
    const { groupId } = req.body;
    
    // Process uploaded files
    const files = [];
    if (req.files) {
      for (const file of req.files) {
        // Handle Cloudinary response format
        if (file.path || file.secure_url) {
          files.push({
            url: file.path || file.secure_url,
            publicId: file.filename || file.public_id,
            fileType: file.mimetype ? file.mimetype.split('/')[1] || file.mimetype : (file.format || 'unknown'),
            fileName: file.originalname || file.name || undefined,
            fileSize: Number(file.bytes || file.size || 0)
          });
        }
      }
    }
    
    // For teachers, section is an array of sections they teach
    // For students/admins, section is a single section
    // If admin selects 'All-Sections', we'll set isGlobal to true
    let announcementSections = req.user.role === 'teacher' ? req.user.section : section;
    let isGlobalFlag = isGlobal === 'true' || isGlobal === true;
    
    // If admin selected 'All-Sections', treat as global announcement
    if (req.user.role === 'admin' && section === 'All-Sections') {
      isGlobalFlag = true;
      announcementSections = 'All-Sections'; // Still store the section for reference
    }
    
    // Parse poll if it exists (it might be a JSON string if sent via FormData)
    let parsedPoll = undefined;
    if (poll) {
      try {
        parsedPoll = typeof poll === 'string' ? JSON.parse(poll) : poll;
        // Ensure options have votes array
        if (parsedPoll.options) {
            parsedPoll.options = parsedPoll.options.map(o => ({ text: o.text || o, votes: [] }));
        }
      } catch (e) {
        console.error('Failed to parse poll data', e);
      }
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      description,
      files,
      section: announcementSections,
      postedBy: req.user._id,
      groupId: groupId || undefined,
      isGlobal: isGlobalFlag,
      isPinned: isPinned === 'true' || isPinned === true,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      poll: parsedPoll
    });
    
    await announcement.save();
    
    // Populate postedBy field
    await announcement.populate('postedBy', 'name email');
    
    // Emit socket event for real-time update
    const io = req.app.get('socketio');
    io.emit('newAnnouncement', { announcement });
    
    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Failed to create announcement: ' + error.message });
  }
};

// Get announcements for a specific section
const getSectionAnnouncements = async (req, res) => {
  try {
    const { section } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Get current date for filtering expired announcements
    const currentDate = new Date();
    
    // Find announcements that are either for this section or global
    // and have not expired
    // For teachers with multiple sections, we need to check if any of their sections match
    let sectionQuery;
    
    if (req.user.role === 'admin') {
      // Admins should see all section-specific announcements except those from teachers
      // For now, we'll keep the existing logic but we might need to refine this later
      sectionQuery = { section: { $exists: true, $ne: 'All-Sections' } };
    } else if (Array.isArray(req.user.section)) {
      sectionQuery = { $or: [
          { section: { $in: req.user.section } },
          { section: { $elemMatch: { $in: req.user.section } } }
        ] };
    } else {
      // For single section users (students and some teachers), use their section
      sectionQuery = { section: req.user.section };
    }
    
    // Build query based on user role
    let announcementQuery;
    
    if (req.user.role === 'admin') {
      // Admins can see:
      // 1. All global announcements (from anyone - these are visible to all)
      // Note: Section-specific announcements from teachers are NOT visible to admins
      
      // First, get all admin users to identify admin-created announcements
      const adminUsers = await User.find({ role: 'admin' }).select('_id');
      const adminUserIds = adminUsers.map(user => user._id);
      
      announcementQuery = {
        $and: [
          {
            $or: [
              { isGlobal: true }, // Global announcements from anyone
              { 
                section: { $exists: true },
                postedBy: { $in: adminUserIds } // Section-specific announcements created by any admin
              }
            ]
          },
          {
            $or: [
              { expiryDate: { $exists: false } },
              { expiryDate: null },
              { expiryDate: { $gt: currentDate } }
            ]
          }
        ]
      };
    } else {
      // Teachers and students can see:
      // 1. Global announcements (visible to everyone)
      // 2. Their section-specific announcements
      announcementQuery = {
        $and: [
          {
            $or: [
              sectionQuery,
              { isGlobal: true }
            ]
          },
          {
            $or: [
              { expiryDate: { $exists: false } },
              { expiryDate: null },
              { expiryDate: { $gt: currentDate } }
            ]
          }
        ]
      };
    }
    
    const announcements = await Announcement.find(announcementQuery)
      .populate('postedBy', 'name email')
      .sort({ isPinned: -1, createdAt: -1 }) // Pinned announcements first, then by creation date
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Announcement.countDocuments(announcementQuery);
    
    res.json({
      announcements,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all announcements
const getAllAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { groupId } = req.query;
    
    // Get current date for filtering expired announcements
    const currentDate = new Date();
    
    // Find all announcements that have not expired
    const baseQuery = {
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: currentDate } }
      ]
    };
    const query = groupId ? { ...baseQuery, groupId } : baseQuery;
    const announcements = await Announcement.find(query)
      .populate('postedBy', 'name email')
      .sort({ isPinned: -1, createdAt: -1 }) // Pinned announcements first, then by creation date
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Announcement.countDocuments(query);
    
    res.json({
      announcements,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get global announcements
const getGlobalAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Get current date for filtering expired announcements
    const currentDate = new Date();
    
    // Find all global announcements that have not expired
    const announcements = await Announcement.find({
      isGlobal: true,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: currentDate } }
      ]
    })
      .populate('postedBy', 'name email')
      .sort({ isPinned: -1, createdAt: -1 }) // Pinned announcements first, then by creation date
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Announcement.countDocuments({
      isGlobal: true,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: currentDate } }
      ]
    });
    
    res.json({
      announcements,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get announcement by ID
const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('postedBy', 'name email');
      
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update announcement
const updateAnnouncement = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Check if user is the author
    if (announcement.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only edit your own announcements.' });
    }
    
    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;
    
    await announcement.save();
    
    // Populate postedBy field
    await announcement.populate('postedBy', 'name email');
    
    res.json({
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Check if user is the author
    if (announcement.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own announcements.' });
    }
    
    // Delete files from Cloudinary
    for (const file of announcement.files) {
      if (file.publicId) {
        await cloudinary.uploader.destroy(file.publicId);
      }
    }
    
    await Announcement.findByIdAndDelete(req.params.id);
    
    // Emit socket event for real-time update
    const io = req.app.get('socketio');
    io.emit('deleteAnnouncement', { id: req.params.id });
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get group announcements (visible only to teacher admin or joined students)
const getGroupAnnouncements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentDate = new Date();
    const Group = require('../models/Group');
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isTeacher = group.teacherId.toString() === req.user._id.toString();
    const isMember = group.studentIds.map(id => id.toString()).includes(req.user._id.toString());
    if (!isTeacher && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    const { page = 1, limit = 10 } = req.query;
    const announcements = await Announcement.find({
      groupId,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: currentDate } }
      ]
    })
      .populate('postedBy', 'name email')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Announcement.countDocuments({
      groupId,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: currentDate } }
      ]
    });
    res.json({
      announcements,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const announcement = await Announcement.findById(id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    const existingIndex = announcement.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      announcement.reactions.splice(existingIndex, 1);
    } else {
      announcement.reactions.push({ user: req.user._id, emoji });
    }

    await announcement.save();
    
    // Emit socket event
    const io = req.app.get('socketio');
    io.emit('announcementReaction', { announcementId: announcement._id, reactions: announcement.reactions });

    res.json({ message: 'Reaction updated', reactions: announcement.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to react: ' + error.message });
  }
};

const votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    const announcement = await Announcement.findById(id);
    if (!announcement || !announcement.poll || !announcement.poll.options) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    const poll = announcement.poll;
    const userId = req.user._id;

    if (!poll.allowMultipleAnswers) {
      poll.options.forEach((opt, idx) => {
        if (idx !== optionIndex) {
          const vIndex = opt.votes.indexOf(userId);
          if (vIndex > -1) opt.votes.splice(vIndex, 1);
        }
      });
    }

    const targetOption = poll.options[optionIndex];
    if (!targetOption) return res.status(400).json({ message: 'Invalid option' });

    const vIndex = targetOption.votes.indexOf(userId);
    if (vIndex > -1) {
      targetOption.votes.splice(vIndex, 1);
    } else {
      targetOption.votes.push(userId);
    }

    await announcement.save();

    const io = req.app.get('socketio');
    io.emit('announcementPollUpdate', { announcementId: announcement._id, poll: announcement.poll });

    res.json({ message: 'Vote recorded', poll: announcement.poll });
  } catch (error) {
    res.status(500).json({ message: 'Failed to vote: ' + error.message });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const User = require('../models/User');
    const Department = require('../models/Department');
    
    // Get current date for filtering expired announcements
    const currentDate = new Date();
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get total departments count
    const totalDepartments = await Department.countDocuments();
    
    // Get announcements based on user role
    let totalAnnouncements;
    let unreadAnnouncements;
    
    if (req.user.role === 'admin') {
      // Admins see all non-expired announcements
      totalAnnouncements = await Announcement.countDocuments({
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: null },
          { expiryDate: { $gt: currentDate } }
        ]
      });
      // For admin, unread is approximately 30% of total (mock calculation)
      unreadAnnouncements = Math.floor(totalAnnouncements * 0.3);
    } else if (req.user.role === 'teacher') {
      // Teachers see global + their section announcements
      const announcementQuery = {
        $and: [
          {
            $or: [
              { isGlobal: true },
              { section: { $in: Array.isArray(req.user.section) ? req.user.section : [req.user.section] } }
            ]
          },
          {
            $or: [
              { expiryDate: { $exists: false } },
              { expiryDate: null },
              { expiryDate: { $gt: currentDate } }
            ]
          }
        ]
      };
      totalAnnouncements = await Announcement.countDocuments(announcementQuery);
      unreadAnnouncements = Math.floor(totalAnnouncements * 0.3);
    } else {
      // Students see global + their section announcements
      const announcementQuery = {
        $and: [
          {
            $or: [
              { isGlobal: true },
              { section: req.user.section }
            ]
          },
          {
            $or: [
              { expiryDate: { $exists: false } },
              { expiryDate: null },
              { expiryDate: { $gt: currentDate } }
            ]
          }
        ]
      };
      totalAnnouncements = await Announcement.countDocuments(announcementQuery);
      unreadAnnouncements = Math.floor(totalAnnouncements * 0.3);
    }
    
    res.json({
      stats: {
        totalAnnouncements,
        unreadAnnouncements,
        departments: totalDepartments,
        users: totalUsers
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics: ' + error.message });
  }
};

module.exports = {
  createAnnouncement,
  getSectionAnnouncements,
  getAllAnnouncements,
  getGlobalAnnouncements,
  getGroupAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  toggleReaction,
  votePoll,
  getDashboardStats
};
