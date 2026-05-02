const mongoose = require('mongoose');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

const canPostToGroup = async (user, group) => {
  // Check if user is member or admin/teacher
  const isMember = group.memberIds.some(id => id.toString() === user._id.toString());
  const isCreator = group.createdBy.toString() === user._id.toString();
  return isMember || isCreator || user.role === 'admin' || user.role === 'teacher';
};

const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied to this group' });

    const files = [];
    if (req.files) {
      for (const file of req.files) {
        files.push({
          url: file.path || file.secure_url,
          publicId: file.filename || file.public_id,
          fileType: file.mimetype ? (file.mimetype.split('/')[1] || file.mimetype) : (file.format || 'unknown'),
          fileName: file.originalname || file.name,
          fileSize: Number(file.bytes || file.size || 0)
        });
      }
    }

    const messageData = {
      groupId: id,
      sender: req.user._id,
      content,
      files,
      isReadBy: [{ user: req.user._id }]
    };

    if (req.body.replyingTo) {
      messageData.replyingTo = req.body.replyingTo;
    }
    if (req.body.forwardingFrom) {
      messageData.forwardingFrom = req.body.forwardingFrom;
    }

    const message = new GroupMessage(messageData);
    await message.save();
    await message.populate([
      { path: 'sender', select: 'name role _id' },
      { path: 'replyingTo', select: 'content sender' },
      { path: 'forwardingFrom', select: 'content sender' }
    ]);

    const io = req.app.get('socketio');
    // Emit to all group members
    for (const memberId of group.memberIds) {
      io.to(memberId.toString()).emit('newGroupMessage', { message, groupId: id });
    }

    res.status(201).json({ message: 'Message sent', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send group message: ' + error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'groupId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid groupId' });
    }
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied to this group' });

    const messages = await GroupMessage.find({ groupId: id, deletedFor: { $ne: req.user._id } })
      .populate({ path: 'sender', select: 'name role _id' })
      .populate({ path: 'replyingTo', select: 'content sender' })
      .populate({ path: 'forwardingFrom', select: 'content sender' })
      .sort({ createdAt: 1 });
    const myIdStr = String(req.user._id);
    const unreadIds = [];
    for (const m of messages) {
      const readers = Array.isArray(m.isReadBy) ? m.isReadBy.map(v => String(v)) : [];
      if (!readers.includes(myIdStr)) {
        unreadIds.push(m._id);
      }
    }
    if (unreadIds.length > 0) {
      await GroupMessage.updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { isReadBy: req.user._id } }
      );
    }
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch group messages: ' + error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    
    const msg = await GroupMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    const group = await Group.findById(msg.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isSender = msg.sender.toString() === req.user._id.toString();
    const isCreator = group.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';
    if (!isSender && !isCreator && !isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You cannot delete this message' });
    }
    
    if (deleteForEveryone) {
      if (!isSender && !isTeacher && !isAdmin) {
         return res.status(403).json({ message: 'Permission denied to delete for everyone' });
      }

      // Time limit check for senders (60 minutes)
      if (isSender && !isAdmin) {
        const messageDate = new Date(msg.createdAt);
        const now = new Date();
        const diffInMinutes = (now - messageDate) / 1000 / 60;
        
        if (diffInMinutes > 60) {
           return res.status(403).json({ message: 'You can only delete messages for everyone within 60 minutes of sending.' });
        }
      }
      
      await GroupMessage.findByIdAndDelete(messageId);
      const io = req.app.get('socketio');
      // Emit to all group members
      for (const memberId of group.memberIds) {
        io.to(memberId.toString()).emit('groupMessageDeleted', { messageId });
      }
    } else {
      if (!msg.deletedFor.includes(req.user._id)) {
        msg.deletedFor.push(req.user._id);
        await msg.save();
      }
    }
    
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete group message: ' + error.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: 'groupId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid groupId' });
    }
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied to this group' });
    const last = await GroupMessage.findOne({ groupId }).sort({ createdAt: -1 }).populate({ path: 'sender', select: 'name role _id' });
    const unreadCount = await GroupMessage.countDocuments({
      groupId,
      'isReadBy.user': { $ne: req.user._id }
    });
    res.json({ summary: {
      lastMessage: last ? {
        id: last._id,
        content: last.content,
        hasFiles: Array.isArray(last.files) && last.files.length > 0,
        createdAt: last.createdAt,
        sender: last.sender
      } : null,
      unreadCount
    }});
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch group summary: ' + error.message });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const msg = await GroupMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    
    const group = await Group.findById(msg.groupId);
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    const existingIndex = msg.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      msg.reactions.splice(existingIndex, 1);
    } else {
      // Optional: Limit to one reaction per user per message? Or allow multiple?
      // For now, let's allow multiple different emojis, but if same emoji, toggle off.
      // If we want to replace the reaction (only 1 per user), we would filter out old ones.
      // Let's implement toggle behavior for specific emoji.
      msg.reactions.push({ user: req.user._id, emoji });
    }

    await msg.save();
    
    const io = req.app.get('socketio');
    // Re-populate if needed or just send the updated reactions
    // Emit to all group members
    const updateData = { messageId: msg._id, groupId: msg.groupId, reactions: msg.reactions };
    for (const memberId of group.memberIds) {
      io.to(memberId.toString()).emit('groupMessageReaction', updateData);
    }

    res.json({ message: 'Reaction updated', reactions: msg.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to react: ' + error.message });
  }
};

const createPoll = async (req, res) => {
  try {
    const { groupId, question, options, allowMultipleAnswers } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    const pollOptions = options.map(opt => ({ text: opt, votes: [] }));

    const message = new GroupMessage({
      groupId,
      sender: req.user._id,
      type: 'poll',
      poll: {
        question,
        options: pollOptions,
        allowMultipleAnswers
      },
      isReadBy: [{ user: req.user._id }]
    });

    await message.save();
    await message.populate({ path: 'sender', select: 'name role _id' });

    const io = req.app.get('socketio');
    // Emit to all group members
    for (const memberId of group.memberIds) {
      io.to(memberId.toString()).emit('newGroupMessage', { message, groupId });
    }

    res.status(201).json({ message: 'Poll created', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create poll: ' + error.message });
  }
};

const votePoll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body; // index of the option
    const msg = await GroupMessage.findById(messageId);
    if (!msg || msg.type !== 'poll') return res.status(404).json({ message: 'Poll not found' });

    const group = await Group.findById(msg.groupId);
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    const poll = msg.poll;
    const userId = req.user._id;

    if (!poll.allowMultipleAnswers) {
      // Remove user vote from all other options
      poll.options.forEach((opt, idx) => {
        if (idx !== optionIndex) {
          const vIndex = opt.votes.indexOf(userId);
          if (vIndex > -1) opt.votes.splice(vIndex, 1);
        }
      });
    }

    // Toggle vote for the selected option
    const targetOption = poll.options[optionIndex];
    if (!targetOption) return res.status(400).json({ message: 'Invalid option' });

    const vIndex = targetOption.votes.indexOf(userId);
    if (vIndex > -1) {
      targetOption.votes.splice(vIndex, 1);
    } else {
      targetOption.votes.push(userId);
    }

    await msg.save();

    const io = req.app.get('socketio');
    const updateData = { messageId: msg._id, groupId: msg.groupId, poll: msg.poll };
    // Emit to all group members
    for (const memberId of group.memberIds) {
      io.to(memberId.toString()).emit('groupMessagePollUpdate', updateData);
    }

    res.json({ message: 'Vote recorded', poll: msg.poll });
  } catch (error) {
    res.status(500).json({ message: 'Failed to vote: ' + error.message });
  }
};

const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pin } = req.body;
    const msg = await GroupMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    const group = await Group.findById(msg.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isCreator = group.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';
    if (!isCreator && !isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'Only teacher or admin can pin messages' });
    }
    msg.isPinned = !!pin;
    await msg.save();
    const io = req.app.get('socketio');
    const payload = { messageId: msg._id, groupId: msg.groupId, pin: !!pin };
    // Emit to all group members
    for (const memberId of group.memberIds) {
      io.to(memberId.toString()).emit('groupMessagePinned', payload);
    }
    res.json({ message: `Message ${pin ? 'pinned' : 'unpinned'} successfully`, data: msg });
  } catch (error) {
    res.status(500).json({ message: 'Failed to pin message: ' + error.message });
  }
};

const toggleStar = async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await GroupMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    const group = await Group.findById(msg.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const allowed = await canPostToGroup(req.user, group);
    if (!allowed) return res.status(403).json({ message: 'Access denied' });
    const uid = req.user._id.toString();
    const current = (msg.isStarredBy || []).map(id => id.toString());
    if (current.includes(uid)) {
      msg.isStarredBy = msg.isStarredBy.filter(id => id.toString() !== uid);
    } else {
      msg.isStarredBy.push(req.user._id);
    }
    await msg.save();
    const io = req.app.get('socketio');
    const payload = { messageId: msg._id, groupId: msg.groupId, isStarredBy: msg.isStarredBy };
    // Emit to all group members
    for (const memberId of group.memberIds) {
      io.to(memberId.toString()).emit('groupMessageStarred', payload);
    }
    res.json({ message: 'Star status updated', data: msg });
  } catch (error) {
    res.status(500).json({ message: 'Failed to star message: ' + error.message });
  }
};

const getMessageInfo = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await GroupMessage.findById(messageId)
      .populate('isReadBy.user', 'name email role');
      
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    const group = await Group.findById(message.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if user is creator, teacher, or admin
    const isCreator = group.createdBy.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin' && req.user.role !== 'teacher') {
       return res.status(403).json({ message: 'Only teacher/admin can view read receipts' });
    }
    
    res.json({ readBy: message.isReadBy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
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
};
