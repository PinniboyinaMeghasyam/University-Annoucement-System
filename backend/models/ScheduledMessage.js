const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['admin', 'group', 'personal'],
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  scheduleType: {
    type: String,
    enum: ['one-time', 'multi-step', 'recurring'],
    required: true
  },
  // For one-time
  scheduledAt: {
    type: Date
  },
  // For recurring
  recurringRule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    days: [String], // e.g., ['Monday', 'Wednesday']
    time: String, // HH:mm 24-hour format
    startDate: Date,
    endDate: Date
  },
  // For multi-step (follow-ups)
  followUpMessages: [{
    content: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'paused'],
    default: 'active'
  },
  lastRunAt: Date,
  nextRunAt: Date,
  
  // Metadata for the message when it gets created
  files: [{
    url: String,
    publicId: String,
    fileType: String,
    fileName: String,
    fileSize: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
