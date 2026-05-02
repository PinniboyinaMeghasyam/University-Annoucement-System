const mongoose = require('mongoose');
const crypto = require('crypto');

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
    trim: true
  },
  groupType: {
    type: String,
    enum: ['ACADEMIC', 'COMMON'],
    required: true
  },
  // Academic group filters
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
  // Common group filters (optional)
  commonForYear: {
    type: Number,
    enum: [1, 2, 3, 4]
  },
  commonForBranch: {
    type: String,
    trim: true
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String
  },
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isAutoManaged: {
    type: Boolean,
    default: true
  },
  // Legacy fields (kept for backward compatibility)
  subject: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  qrToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Generate qrToken before saving if not present
groupSchema.pre('save', function(next) {
  if (!this.qrToken) {
    this.qrToken = crypto.randomBytes(16).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
