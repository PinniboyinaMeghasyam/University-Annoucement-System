const mongoose = require('mongoose');

const personalMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
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
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
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
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: { type: String, required: true }
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
  replyingTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonalMessage'
  },
  forwardingFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonalMessage'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PersonalMessage', personalMessageSchema);
