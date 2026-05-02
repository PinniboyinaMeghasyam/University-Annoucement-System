const mongoose = require('mongoose');
const AdminMessage = require('./models/AdminMessage');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_announcement_system')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all admin messages
    const messages = await AdminMessage.find()
      .populate('sender', 'name email role _id')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('Latest admin messages:');
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. Content: ${msg.content}`);
      console.log(`   Sender: ${msg.sender.name} (${msg.sender.role})`);
      console.log(`   Sender ID: ${msg.sender._id}`);
      console.log(`   Message ID: ${msg._id}`);
      console.log(`   Created: ${msg.createdAt}`);
      console.log('---');
    });
    
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });