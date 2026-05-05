const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Import User model
const AdminMessage = require('./models/AdminMessage');
const PersonalMessage = require('./models/PersonalMessage');
const GroupMessage = require('./models/GroupMessage');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const departmentRoutes = require('./routes/departments');
const userRoutes = require('./routes/users');
const adminMessageRoutes = require('./routes/adminMessages');
const scheduledMessageRoutes = require('./routes/scheduledMessages');
const { initScheduler } = require('./services/scheduler');

// Initialize app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.set('socketio', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  if (!socket.userId) {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
      } catch (_) {}
    }
  }
  if (socket.userId) {
    socket.join(socket.userId.toString());
    console.log(`Socket joined room for user: ${socket.userId}`);
  }
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
  
  // Handle admin message events
  socket.on('adminMessageRead', (data) => {
    // Broadcast to all clients that a message was read
    socket.broadcast.emit('adminMessageRead', data);
  });
  
  socket.on('adminMessagePinned', (data) => {
    // Broadcast to all clients that a message was pinned/unpinned
    io.emit('adminMessagePinned', data);
  });
  
  socket.on('adminMessageDeleted', (data) => {
    // Broadcast to all clients that a message was deleted
    io.emit('adminMessageDeleted', data);
  });

  // Admin typing indicator
  socket.on('adminTyping', (data) => {
    // Broadcast to all clients
    socket.broadcast.emit('adminTyping', data);
  });
  
  // Admin message delivered
  socket.on('adminMessageDelivered', async (data) => {
    try {
      const userId = socket.userId || data.userId;
      if (!userId) return;

      const message = await AdminMessage.findById(data.messageId);
      if (message) {
        // Check if already delivered to this user
        const alreadyDelivered = message.deliveredTo.some(d => d.user.toString() === userId.toString());
        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: userId });
          await message.save();
          
          // Notify sender (Admin messages are broadcast, but we want to update the sender's view)
          // Since Admin messages are "broadcast" style, the sender might want to know who received it.
          // We can emit to the sender.
          if (message.sender) {
             io.to(message.sender.toString()).emit('adminMessageDelivered', { 
               messageId: data.messageId, 
               userId: userId 
             });
          }
        }
      }
    } catch (err) {
      console.error('Error marking admin message as delivered:', err);
    }
  });

  socket.on('personalMessageDeleted', (data) => {
    // Broadcast to all clients that a message was deleted
    io.emit('personalMessageDeleted', data);
  });
  
  // Group messaging events
  socket.on('joinGroup', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group room: ${groupId}`);
  });
  
  socket.on('leaveGroup', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`Socket ${socket.id} left group room: ${groupId}`);
  });
  
  socket.on('groupMessageDelivered', async (data) => {
    try {
      const userId = socket.userId || data.userId;
      if (!userId) return;

      const GroupMessage = require('./models/GroupMessage');
      const message = await GroupMessage.findById(data.messageId);
      if (message) {
        const alreadyDelivered = message.deliveredTo.some(d => d.user.toString() === userId.toString());
        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: userId });
          await message.save();
          
          // Notify sender
          if (message.sender) {
            io.to(message.sender.toString()).emit('groupMessageDelivered', { 
              messageId: data.messageId, 
              userId: userId,
              groupId: message.groupId
            });
          }
        }
      }
    } catch (err) {
      console.error('Error marking group message as delivered:', err);
    }
  });
  
  socket.on('groupTyping', (data) => {
    // Broadcast typing indicator to group room
    socket.to(`group_${data.groupId}`).emit('groupTyping', data);
  });
  
  // Personal typing indicator
  socket.on('personalTyping', (data) => {
    // data: { senderId, recipientId, isTyping }
    // We need to send this to the recipient
    io.to(data.recipientId).emit('personalTyping', {
      senderId: data.senderId,
      isTyping: data.isTyping
    });
  });

  // Personal message delivered
  socket.on('personalMessageDelivered', async (data) => {
    try {
      const userId = socket.userId || data.userId;
      if (!userId) return;

      const message = await PersonalMessage.findById(data.messageId);
      if (message) {
        // Check if already delivered to this user
        const alreadyDelivered = message.deliveredTo.some(d => d.user.toString() === userId.toString());
        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: userId });
          if (message.status === 'sent') message.status = 'delivered';
          await message.save();
          
          // Notify sender
          io.to(message.sender.toString()).emit('personalMessageDelivered', { 
            messageId: data.messageId, 
            userId: userId 
          });
        }
      }
    } catch (err) {
      console.error('Error marking message as delivered:', err);
    }
  });
  
  // Group typing indicator
  socket.on('groupTyping', (data) => {
    // data: { groupId, userId, isTyping }
    io.emit('groupTyping', data);
  });

  // Group message delivered
  socket.on('groupMessageDelivered', async (data) => {
    try {
      const userId = socket.userId || data.userId;
      if (!userId) return;

      const message = await GroupMessage.findById(data.messageId);
      if (message) {
        // Check if already delivered to this user
        const alreadyDelivered = message.deliveredTo.some(d => d.user.toString() === userId.toString());
        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: userId });
          await message.save();
          
          // Notify sender
          io.to(message.sender.toString()).emit('groupMessageDelivered', { 
            messageId: data.messageId, 
            userId: userId,
            groupId: message.groupId
          });
        }
      }
    } catch (err) {
      console.error('Error marking group message as delivered:', err);
    }
  });
});

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.userId = decoded.userId;
    next();
  });
});

// Make io available to routes
app.set('socketio', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin-messages', adminMessageRoutes);
app.use('/api/personal-messages', require('./routes/personalMessages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/group-messages', require('./routes/groupMessages'));
app.use('/api/scheduled-messages', scheduledMessageRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_announcement_system')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Fix for duplicate qrToken: null error
    try {
      const Group = require('./models/Group');
      
      // 1. Drop the problematic index directly using native driver to be sure
      try {
        await mongoose.connection.db.collection('groups').dropIndex('qrToken_1');
        console.log('✅ Successfully dropped qrToken_1 index');
      } catch (e) {
        console.log('ℹ️ qrToken_1 index does not exist or already dropped');
      }

      // 2. Find and fix all groups with null/missing tokens
      const groupsToFix = await Group.find({ 
        $or: [
          { qrToken: null }, 
          { qrToken: { $exists: false } }
        ] 
      });

      if (groupsToFix.length > 0) {
        console.log(`🛠 Fixing ${groupsToFix.length} groups with missing qrToken...`);
        const crypto = require('crypto');
        for (const group of groupsToFix) {
          group.qrToken = crypto.randomBytes(16).toString('hex');
          await group.save();
        }
        console.log('✅ Successfully updated all groups with unique tokens.');
      }
      
      // 3. Re-sync indexes with the new schema (unique + sparse)
      await Group.syncIndexes();
      console.log('✅ Group indexes synchronized');

      // Fix for User indexes
      const User = require('./models/User');
      try {
        await mongoose.connection.db.collection('users').dropIndex('rollNumber_1');
      } catch (e) {}
      try {
        await mongoose.connection.db.collection('users').dropIndex('mobileNumber_1');
      } catch (e) {}
      await User.syncIndexes();
      console.log('✅ User indexes synchronized');
    } catch (err) {
      console.error('❌ Error in database repair routine:', err);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Initialize scheduler
initScheduler(io);

const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
