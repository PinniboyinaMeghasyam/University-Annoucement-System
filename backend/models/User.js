const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  mobileNumber: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'student'
  },
  department: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    }
  },
  section: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return this.role !== 'admin';
    }
  },
  rollNumber: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastSeenPrivacy: {
    type: String,
    enum: ['everyone', 'nobody'],
    default: 'everyone'
  },
  mutedChats: [{
    chatId: { type: mongoose.Schema.Types.ObjectId },
    muteUntil: { type: Date }
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  otpType: {
    type: String,
    enum: ['email', 'mobile', 'password']
  },
  newEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  newMobileNumber: {
    type: String,
    trim: true
  },
  // Academic fields for dynamic group management
  year: {
    type: Number,
    enum: [1, 2, 3, 4]
  },
  batchStart: {
    type: Number
  },
  batchEnd: {
    type: Number
  },
  branch: {
    type: String,
    trim: true
  },
  newMobileNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add partial unique index for rollNumber (only for students)
userSchema.index(
  { rollNumber: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      role: 'student', 
      rollNumber: { $exists: true } 
    } 
  }
);

// Ensure mobileNumber is sparse and unique
userSchema.index(
  { mobileNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { 
      mobileNumber: { $exists: true } 
    }
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);