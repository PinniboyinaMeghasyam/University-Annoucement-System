const mongoose = require('mongoose');

const adminMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    trim: true,
    default: ''
  },
  files: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String
    },
    fileType: {
      type: String,
      required: true
    },
    fileName: {
      type: String
    },
    fileSize: {
      type: Number
    }
  }],
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isReadBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isStarredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: { type: String, required: true }
  }],
  replyingTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminMessage'
  },
  forwardingFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminMessage'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isScheduled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminMessage', adminMessageSchema);
