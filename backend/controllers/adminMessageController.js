const AdminMessage = require('../models/AdminMessage');
const User = require('../models/User');

// Send admin message
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    
    // Only admins (HOD & Teachers) can send messages
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only admins and teachers can send admin messages' });
    }
    
    // Process uploaded files (if any)
    const files = [];
    if (req.files) {
      for (const file of req.files) {
        files.push({
          url: file.path || file.secure_url,
          publicId: file.filename || file.public_id,
          fileType: file.mimetype ? file.mimetype.split('/')[1] || file.mimetype : (file.format || 'unknown'),
          fileName: file.originalname || file.name,
          fileSize: Number(file.bytes || file.size || 0)
        });
      }
    }
    
    // Create admin message
    const messageData = {
      content,
      files,
      sender: req.user._id,
      isReadBy: [] // Initially no one has read it
    };

    if (req.body.replyingTo) {
      messageData.replyingTo = req.body.replyingTo;
    }
    if (req.body.forwardingFrom) {
      messageData.forwardingFrom = req.body.forwardingFrom;
    }
    
    const message = new AdminMessage(messageData);
    
    await message.save();
    
    // Populate sender info before emitting socket event
    await message.populate([
      { path: 'sender', select: 'name email role _id' },
      { path: 'replyingTo', select: 'content sender' },
      { path: 'forwardingFrom', select: 'content sender' }
    ]);
    
    // Emit socket event for real-time update
    const io = req.app.get('socketio');
    io.emit('newAdminMessage', { message });
    
    res.status(201).json({
      message: 'Admin message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ message: 'Failed to send admin message: ' + error.message });
  }
};

// Get all admin messages
const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Get messages with pagination
    const messages = await AdminMessage.find({ deletedFor: { $ne: req.user._id } })
      .populate('sender', 'name email role _id')
      .populate('replyingTo', 'content sender')
      .populate('forwardingFrom', 'content sender')
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Mark messages as read by current user
    const messageIds = messages.map(msg => msg._id);
    await AdminMessage.updateMany(
      { _id: { $in: messageIds }, 'isReadBy.user': { $ne: req.user._id } },
      { $push: { isReadBy: { user: req.user._id } } }
    );
    
    const total = await AdminMessage.countDocuments();
    
    // Reverse messages to show oldest first in chat view
    const reversedMessages = messages.reverse();
    
    res.json({
      messages: reversedMessages,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({ message: 'Failed to fetch admin messages: ' + error.message });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await AdminMessage.findOneAndUpdate(
      { _id: messageId, 'isReadBy.user': { $ne: req.user._id } },
      { $push: { isReadBy: { user: req.user._id, readAt: new Date() } } },
      { new: true }
    );
    
    if (!message) {
      // Message might exist but already read, or not exist.
      // Check if it exists
      const exists = await AdminMessage.findById(messageId);
      if (!exists) {
        return res.status(404).json({ message: 'Message not found' });
      }
      return res.json({ message: 'Message already read', data: exists });
    }
    
    // Emit socket event
    const io = req.app.get('socketio');
    io.emit('adminMessageRead', {
      messageId,
      userId: req.user._id
    });
    
    res.json({ message: 'Message marked as read', data: message });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Failed to mark message as read: ' + error.message });
  }
};

// Pin/unpin message
const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pin } = req.body; // true to pin, false to unpin
    
    // Only admins can pin messages
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can pin messages' });
    }
    
    const message = await AdminMessage.findByIdAndUpdate(
      messageId,
      { isPinned: pin },
      { new: true }
    ).populate('sender', 'name email role _id');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Emit socket event for real-time update
    const io = req.app.get('socketio');
    io.emit('adminMessagePinned', { messageId, pin });
    
    res.json({ message: `Message ${pin ? 'pinned' : 'unpinned'} successfully`, data: message });
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({ message: 'Failed to pin message: ' + error.message });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    
    const message = await AdminMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only admins or message senders can delete messages
    if (req.user.role !== 'admin' && message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages or admins can delete any message' });
    }
    
    if (deleteForEveryone) {
      const isSender = message.sender.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isSender && !isAdmin) {
        return res.status(403).json({ message: 'Only sender or admin can delete for everyone' });
      }

      // Time limit for non-admin senders (60 minutes)
      if (isSender && !isAdmin) {
        const messageDate = new Date(message.createdAt);
        const now = new Date();
        const diffInMinutes = (now - messageDate) / 1000 / 60;
        
        if (diffInMinutes > 60) {
           return res.status(403).json({ message: 'You can only delete messages for everyone within 60 minutes of sending.' });
        }
      }
      
      await AdminMessage.findByIdAndDelete(messageId);
      
      // Emit socket event for real-time update
      const io = req.app.get('socketio');
      io.emit('adminMessageDeleted', { messageId });
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message: ' + error.message });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    const message = await AdminMessage.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );
    
    if (existingReactionIndex > -1) {
      // Remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ user: req.user._id, emoji });
    }
    
    await message.save();
    
    const io = req.app.get('socketio');
    io.emit('adminMessageReactionUpdate', { messageId, reactions: message.reactions });
    
    res.json({ message: 'Reaction updated', reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleStar = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await AdminMessage.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    const index = message.isStarredBy.indexOf(req.user._id);
    if (index === -1) {
      message.isStarredBy.push(req.user._id);
    } else {
      message.isStarredBy.splice(index, 1);
    }
    
    await message.save();
    res.json({ message: 'Star updated', isStarred: index === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessageInfo = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await AdminMessage.findById(messageId)
      .populate('isReadBy.user', 'name email role');

    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
       return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ readBy: message.isReadBy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  pinMessage,
  deleteMessage,
  toggleReaction,
  toggleStar,
  getMessageInfo
};
