const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_announcement_system')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Count users
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    // Get all users
    const users = await User.find().select('-password');
    console.log('Users:', users);
    
    // Get admins and teachers
    const messagingUsers = await User.find({
      role: { $in: ['admin', 'teacher'] }
    }).select('-password');
    console.log('Messaging users (admins and teachers):', messagingUsers);
    
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });