const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { 
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignTeacherToSection,
  getMessagingUsers,
  toggleMuteChat
} = require('../controllers/userController');

const router = express.Router();

// Toggle mute chat (Authenticated users)
router.post('/toggle-mute', auth, toggleMuteChat);

// Get all users (Admin only)
router.get('/', auth, adminAuth, getAllUsers);

// Get admins and teachers for messaging (Authenticated users only)
router.get('/messaging', auth, getMessagingUsers);

// Assign teacher to section (Admin only)
router.post('/assign-teacher', auth, adminAuth, assignTeacherToSection);

// Get user by ID (Admin only)
router.get('/:id', auth, adminAuth, getUserById);

// Update user (Admin only)
router.put('/:id', auth, adminAuth, updateUser);

// Delete user (Admin only)
router.delete('/:id', auth, adminAuth, deleteUser);

module.exports = router;
