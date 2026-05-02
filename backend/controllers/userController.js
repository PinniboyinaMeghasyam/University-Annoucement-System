const User = require('../models/User');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, department, section } = req.query;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (section) filter.section = section;
    
    const users = await User.find(filter)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { name, email, role, department, section, rollNumber } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        role,
        department: role === 'admin' ? undefined : department,
        section: role === 'admin' ? undefined : section,
        rollNumber: role === 'student' ? rollNumber : undefined
      },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle mute chat
const toggleMuteChat = async (req, res) => {
  try {
    const { chatId, muteUntil } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existingIndex = user.mutedChats.findIndex(m => m.chatId.toString() === chatId);

    if (existingIndex > -1) {
      // If currently muted, unmute (remove from array)
      // OR update if muteUntil is provided (handled below)
      if (muteUntil === undefined) {
         user.mutedChats.splice(existingIndex, 1);
      } else {
         user.mutedChats[existingIndex].muteUntil = muteUntil;
      }
    } else {
      // Mute
      user.mutedChats.push({ chatId, muteUntil: muteUntil || null });
    }

    await user.save();
    res.json({ mutedChats: user.mutedChats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign teacher to section
const assignTeacherToSection = async (req, res) => {
  try {
    const { userId, department, section } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }
    
    user.department = department;
    user.section = section;
    await user.save();
    
    res.json({
      message: 'Teacher assigned to section successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        section: user.section
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get admins and teachers for messaging
const getMessagingUsers = async (req, res) => {
  try {
    // Get all admins and teachers (excluding students)
    // Sort to ensure admins come first, then teachers
    const users = await User.find({
      role: { $in: ['admin', 'teacher'] }
    })
    .select('-password')
    .sort({ role: 1, name: 1 });
    
    res.json({
      users
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignTeacherToSection,
  getMessagingUsers,
  toggleMuteChat
};
