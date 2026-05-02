const ScheduledMessage = require('../models/ScheduledMessage');
const Group = require('../models/Group');

// Create a new scheduled message
exports.createSchedule = async (req, res) => {
  try {
    let {
      type,
      groupId,
      recipientId,
      content,
      scheduleType,
      scheduledAt,
      recurringRule,
      followUpMessages
    } = req.body;
    
    let files = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      files = req.files.map(file => ({
        url: file.path || file.secure_url,
        publicId: file.filename || file.public_id,
        fileType: file.mimetype ? (file.mimetype.split('/')[1] || file.mimetype) : (file.format || 'unknown'),
        fileName: file.originalname || file.name,
        fileSize: Number(file.bytes || file.size || 0)
      })).filter(f => f.url);
    } else if (req.body.files) {
      try {
        const payload = typeof req.body.files === 'string' ? JSON.parse(req.body.files) : req.body.files;
        if (Array.isArray(payload)) files = payload.filter(f => f && f.url);
      } catch (_) {}
    }

    // Validation
    if (type === 'group' && !groupId) {
      return res.status(400).json({ message: 'Group ID is required for group messages' });
    }
    if (type === 'personal' && !recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required for personal messages' });
    }

    if (scheduleType === 'one-time' && !scheduledAt) {
      return res.status(400).json({ message: 'Scheduled time is required for one-time messages' });
    }

    if (scheduleType === 'recurring' && !recurringRule) {
      return res.status(400).json({ message: 'Recurring rule is required for recurring messages' });
    }

    // Determine next run time
    if (typeof scheduledAt === 'string' && scheduledAt) {
      scheduledAt = new Date(scheduledAt);
    }
    
    if (typeof recurringRule === 'string' && recurringRule) {
      try { recurringRule = JSON.parse(recurringRule); } catch (_) {}
    }
    
    if (typeof followUpMessages === 'string' && followUpMessages) {
      try { followUpMessages = JSON.parse(followUpMessages); } catch (_) {}
    }
    
    let nextRunAt = scheduledAt;
    if (scheduleType === 'recurring') {
        const now = new Date();
        const start = new Date(recurringRule.startDate);
        const [hStr, mStr] = String(recurringRule.time || '09:00').split(':');
        const hours = parseInt(hStr, 10) || 9;
        const minutes = parseInt(mStr, 10) || 0;
        const candidate = new Date(start);
        candidate.setHours(hours, minutes, 0, 0);
        if (recurringRule.frequency === 'daily') {
          if (candidate <= now) {
            candidate.setDate(candidate.getDate() + 1);
          }
          nextRunAt = candidate;
        } else if (recurringRule.frequency === 'weekly') {
          const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
          const targets = Array.isArray(recurringRule.days) ? recurringRule.days.map(d => dayMap[d]).filter(d => d !== undefined) : [];
          const startDay = candidate.getDay();
          let best = null;
          const tryWithinWeek = () => {
            for (let i = 0; i < 7; i++) {
              const d = (startDay + i) % 7;
              if (targets.includes(d)) {
                const cand = new Date(candidate);
                cand.setDate(candidate.getDate() + i);
                if (!best || cand < best) best = cand;
              }
            }
          };
          tryWithinWeek();
          if (best && best <= now) {
            const first = targets.sort((a, b) => a - b)[0];
            const diffToNextWeek = (7 - startDay + first);
            best = new Date(candidate);
            best.setDate(candidate.getDate() + diffToNextWeek);
          }
          nextRunAt = best || candidate;
        } else if (recurringRule.frequency === 'monthly') {
          if (candidate <= now) {
            candidate.setMonth(candidate.getMonth() + 1);
          }
          nextRunAt = candidate;
        } else {
          nextRunAt = candidate;
        }
    }

    const schedule = new ScheduledMessage({
      type,
      groupId,
      recipientId: type === 'personal' ? recipientId : undefined,
      createdBy: req.user._id,
      content,
      scheduleType,
      scheduledAt,
      recurringRule,
      followUpMessages,
      files,
      nextRunAt: nextRunAt || new Date()
    });

    await schedule.save();
    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Failed to create schedule' });
  }
};

// List schedules
exports.getSchedules = async (req, res) => {
  try {
    const { groupId, type } = req.query;
    const query = { createdBy: req.user._id };
    
    if (groupId) query.groupId = groupId;
    if (type) query.type = type;

    const schedules = await ScheduledMessage.find(query).sort({ createdAt: -1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch schedules' });
  }
};

// Delete/Cancel schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduledMessage.findOne({ _id: id, createdBy: req.user._id });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await ScheduledMessage.findByIdAndDelete(id);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete schedule' });
  }
};
