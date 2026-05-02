const PersonalMessage = require('../models/PersonalMessage');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Send personal message
const sendMessage = async (req, res) => {
  try {
    const { content, recipientId } = req.body;
    
    // Role restrictions: only admins and teachers can use personal messages
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins and teachers can send personal messages' });
    }
    
    // Validate recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    // Admin can message teachers; Teacher can message admin or teacher
    if (req.user.role === 'admin' && recipient.role !== 'teacher') {
      return res.status(403).json({ message: 'Admins can only message teachers' });
    }
    if (req.user.role === 'teacher' && !['admin', 'teacher'].includes(recipient.role)) {
      return res.status(403).json({ message: 'Teachers can only message admins or other teachers' });
    }
    
    // Process uploaded files (if any)
    const uploadedFiles = [];
    if (req.files) {
      for (const file of req.files) {
        uploadedFiles.push({
          url: file.path || file.secure_url,
          publicId: file.filename || file.public_id,
          fileType: file.mimetype ? file.mimetype.split('/')[1] || file.mimetype : (file.format || 'unknown'),
          fileName: file.originalname || file.name,
          fileSize: Number(file.bytes || file.size || 0)
        });
      }
    }
    
    // Process forwarded files (URLs coming from existing messages)
    let forwardedFiles = [];
    if (req.body.forwardedFiles) {
      try {
        const payload = typeof req.body.forwardedFiles === 'string'
          ? JSON.parse(req.body.forwardedFiles)
          : req.body.forwardedFiles;
        if (Array.isArray(payload)) {
          forwardedFiles = payload.map(f => ({
            url: f.url || f.secure_url || f.fileUrl,
            publicId: f.publicId || f.filename || f.public_id,
            fileType: f.fileType || f.format || 'unknown',
            fileName: f.fileName || f.originalname || f.name,
            fileSize: Number(f.fileSize || f.bytes || f.size || 0)
          })).filter(ff => ff.url);
        }
      } catch (_) {}
    }
    
    const files = [...uploadedFiles, ...forwardedFiles];
    
    // Find or create conversation
    const pair = [req.user._id.toString(), recipientId.toString()].sort();
    let conversation = await Conversation.findOne({ participants: { $all: pair } });
    if (!conversation) {
      conversation = await Conversation.create({ participants: pair });
    }
    
    // Create personal message
    const messageData = {
      content,
      files,
      sender: req.user._id,
      recipient: recipientId,
      conversationId: conversation._id,
      isReadBy: [{ user: req.user._id }] // Sender has read their own message
    };
    
    // Optional replyingTo and forwardingFrom references
    if (req.body.replyingTo) {
      try {
        const payload = typeof req.body.replyingTo === 'string'
          ? JSON.parse(req.body.replyingTo)
          : req.body.replyingTo;
        if (payload && payload.messageId) {
          messageData.replyingTo = payload.messageId;
        }
      } catch (_) {}
    }
    if (req.body.forwardingFrom) {
      try {
        const payload = typeof req.body.forwardingFrom === 'string'
          ? JSON.parse(req.body.forwardingFrom)
          : req.body.forwardingFrom;
        if (payload && payload.messageId) {
          messageData.forwardingFrom = payload.messageId;
        }
      } catch (_) {}
    }
    
    const message = new PersonalMessage(messageData);
    
    await message.save();
    
    // Populate sender and recipient info
    await message.populate([
      { path: 'sender', select: 'name email role _id' },
      { path: 'recipient', select: 'name email role _id' }
    ]);
    
    // Emit socket event for real-time update
    const io = req.app.get('socketio');
    io.to(recipientId).emit('newPersonalMessage', { message });
    // Also notify both participants to update conversation list
    io.to(req.user._id.toString()).emit('conversationUpdated', { conversationId: conversation._id, lastMessage: message });
    io.to(recipientId.toString()).emit('conversationUpdated', { conversationId: conversation._id, lastMessage: message });
    
    res.status(201).json({
      message: 'Personal message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending personal message:', error);
    res.status(500).json({ message: 'Failed to send personal message: ' + error.message });
  }
};

// Get personal messages for current user
const getMessages = async (req, res) => {
  try {
    // Role restrictions
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins and teachers can access personal messages' });
    }
    
    const { conversationId } = req.query;
    
    // If a conversationId is provided, ensure user is a participant
    let filter;
    if (conversationId) {
      const convo = await Conversation.findById(conversationId);
      if (!convo) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const isParticipant = convo.participants.map(p => p.toString()).includes(req.user._id.toString());
      if (!isParticipant) {
        return res.status(403).json({ message: 'Access denied to this conversation' });
      }
      filter = { 
        conversationId,
        deletedFor: { $ne: req.user._id }
      };
    } else {
      // Otherwise, fetch all messages involving current user
      filter = {
        $or: [
          { sender: req.user._id },
          { recipient: req.user._id }
        ],
        deletedFor: { $ne: req.user._id }
      };
    }
    
    const messages = await PersonalMessage.find(filter)
      .populate([
        { path: 'sender', select: 'name email role _id' },
        { path: 'recipient', select: 'name email role _id' },
        { path: 'replyingTo', select: 'content sender' },
        { path: 'forwardingFrom', select: 'content sender' }
      ])
      .sort({ createdAt: 1 }); // Oldest first
    
    // Mark messages as read by current user
    const unreadMessages = messages.filter(msg => 
      !msg.isReadBy.some(r => r.user && r.user._id.toString() === req.user._id.toString()) && 
      msg.recipient._id.toString() === req.user._id.toString()
    );
    
    if (unreadMessages.length > 0) {
      await PersonalMessage.updateMany(
        { _id: { $in: unreadMessages.map(msg => msg._id) } },
        { 
          $addToSet: { isReadBy: { user: req.user._id } },
          $set: { status: 'read' }
        }
      );
      
      // Emit read status updates
      const io = req.app.get('socketio');
      unreadMessages.forEach(msg => {
        io.to(msg.sender._id.toString()).emit('personalMessageRead', { 
          messageId: msg._id, 
          userId: req.user._id 
        });
      });
    }
    
    res.json({
      messages
    });
  } catch (error) {
    console.error('Error fetching personal messages:', error);
    res.status(500).json({ message: 'Failed to fetch personal messages: ' + error.message });
  }
};

// Get conversation list for current user with last message
const getConversations = async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins and teachers can access conversations' });
    }
    const convos = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name email role _id')
      .sort({ updatedAt: -1 });
    
    const items = [];
    for (const convo of convos) {
      const lastMsg = await PersonalMessage.findOne({ conversationId: convo._id })
        .sort({ createdAt: -1 })
        .populate([
          { path: 'sender', select: 'name role _id' },
          { path: 'recipient', select: 'name role _id' }
        ]);
      const other = convo.participants.find(p => p._id.toString() !== req.user._id.toString());
      const unreadCount = await PersonalMessage.countDocuments({
        conversationId: convo._id,
        recipient: req.user._id,
        'isReadBy.user': { $ne: req.user._id }
      });
      items.push({
        conversationId: convo._id,
        otherParticipant: other,
        lastMessage: lastMsg ? {
          id: lastMsg._id,
          content: lastMsg.content,
          hasFiles: Array.isArray(lastMsg.files) && lastMsg.files.length > 0,
          createdAt: lastMsg.createdAt,
          senderId: lastMsg.sender?._id || lastMsg.sender,
          isReadBy: lastMsg.isReadBy || []
        } : null,
        unreadCount
      });
    }
    
    res.json({ conversations: items });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations: ' + error.message });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    
    const message = await PersonalMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only sender or recipient can delete messages
    if (message.sender.toString() !== req.user._id.toString() && 
        message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    if (deleteForEveryone) {
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only sender can delete for everyone' });
      }
      // Check time limit (e.g., 60 mins)
      const timeDiff = (Date.now() - message.createdAt) / 1000 / 60;
      if (timeDiff > 60) {
        return res.status(400).json({ message: 'Time limit for deleting for everyone has passed (60 mins)' });
      }
      
      await PersonalMessage.findByIdAndDelete(messageId);
      
      // Emit socket event for real-time update
      const io = req.app.get('socketio');
      io.emit('personalMessageDeleted', { messageId });
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
    
    const message = await PersonalMessage.findById(messageId);
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
    io.to(message.sender.toString()).emit('messageReactionUpdate', { messageId, reactions: message.reactions });
    io.to(message.recipient.toString()).emit('messageReactionUpdate', { messageId, reactions: message.reactions });
    
    res.json({ message: 'Reaction updated', reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleStar = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await PersonalMessage.findById(messageId);
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

const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pin } = req.body;
    
    const message = await PersonalMessage.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    // Only sender or recipient can pin (personal preference?)
    // Or is it a global pin for the conversation? 
    // Usually personal pins are per user, but the model has `isPinned` boolean, implying global for the message.
    // If it's a boolean, it pins for both. 
    // Let's assume it pins for both for now, or maybe just the viewer.
    // Given the model `isPinned` is boolean, it's shared.
    
    if (message.sender.toString() !== req.user._id.toString() && 
        message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    message.isPinned = pin;
    await message.save();
    
    const io = req.app.get('socketio');
    io.to(message.sender.toString()).emit('personalMessagePinned', { messageId, pin });
    io.to(message.recipient.toString()).emit('personalMessagePinned', { messageId, pin });
    
    res.json({ message: `Message ${pin ? 'pinned' : 'unpinned'}`, isPinned: pin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessageInfo = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await PersonalMessage.findById(messageId)
      .populate('isReadBy.user', 'name email role');
      
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    if (message.sender.toString() !== req.user._id.toString() && 
        message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ 
      readBy: message.isReadBy,
      deliveredTo: message.recipient 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  deleteMessage,
  toggleReaction,
  toggleStar,
  pinMessage,
  getMessageInfo
};
