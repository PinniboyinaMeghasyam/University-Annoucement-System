const cron = require('node-cron');
const ScheduledMessage = require('../models/ScheduledMessage');
const AdminMessage = require('../models/AdminMessage');
const GroupMessage = require('../models/GroupMessage');

const initScheduler = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log('[scheduler] tick', now.toISOString());
      
      // Find schedules due for execution
      const dueSchedules = await ScheduledMessage.find({
        status: 'active',
        $or: [
            { nextRunAt: { $lte: now } },
            { 'followUpMessages.scheduledAt': { $lte: now }, 'followUpMessages.status': 'pending' }
        ]
      });
      if (dueSchedules.length > 0) {
        console.log('[scheduler] due schedules', dueSchedules.map(s => s._id.toString()));
      }

      for (const schedule of dueSchedules) {
        let messageSent = false;

        // Check main message
        if (schedule.scheduleType !== 'multi-step' || !schedule.lastRunAt) {
            // For one-time or recurring, or first step of multi-step
            if (schedule.nextRunAt && schedule.nextRunAt <= now) {
                await sendMessage(schedule, io);
                messageSent = true;
                schedule.lastRunAt = now;
            }
        }

        // Check follow-up messages (only for multi-step or one-time with followups)
        if (schedule.followUpMessages && schedule.followUpMessages.length > 0) {
            for (let i = 0; i < schedule.followUpMessages.length; i++) {
                const followUp = schedule.followUpMessages[i];
                if (followUp.status === 'pending' && followUp.scheduledAt <= now) {
                    await sendMessage(schedule, io, followUp.content);
                    followUp.status = 'sent';
                    messageSent = true;
                }
            }
        }

        // Update schedule status/next run
        if (schedule.scheduleType === 'one-time') {
            // Check if all follow-ups are sent (if any)
            const allFollowUpsSent = schedule.followUpMessages.every(f => f.status === 'sent');
            if (schedule.lastRunAt && allFollowUpsSent) {
                schedule.status = 'completed';
            }
        } else if (schedule.scheduleType === 'multi-step') {
             // Main message sent + all followups sent
             const allFollowUpsSent = schedule.followUpMessages.every(f => f.status === 'sent');
             if (schedule.lastRunAt && allFollowUpsSent) {
                schedule.status = 'completed';
            }
        } else if (schedule.scheduleType === 'recurring') {
            if (messageSent) {
                schedule.nextRunAt = calculateNextRun(schedule.recurringRule);
                // Check if past end date
                if (schedule.recurringRule.endDate && schedule.nextRunAt > schedule.recurringRule.endDate) {
                    schedule.status = 'completed';
                }
            }
        }

        await schedule.save();
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
};

const sendMessage = async (schedule, io, overrideContent = null) => {
    const content = overrideContent || schedule.content;
    const commonData = {
        sender: schedule.createdBy,
        content: content,
        files: schedule.files || [], // Attach files to every occurrence? Or just first? Assuming all for now.
        createdAt: new Date(),
        isScheduled: true // Flag to identify in frontend if needed
    };
    try {
      console.log('[scheduler] sending', {
        id: schedule._id.toString(),
        type: schedule.type,
        scheduleType: schedule.scheduleType,
        at: new Date().toISOString(),
        groupId: schedule.groupId ? schedule.groupId.toString() : null
      });
    } catch (_) {}

    if (schedule.type === 'admin') {
        const message = new AdminMessage(commonData);
        await message.save();
        await message.populate('sender', 'name role _id');
        io.emit('newAdminMessage', { message });
    } else if (schedule.type === 'group') {
        const message = new GroupMessage({
            ...commonData,
            groupId: schedule.groupId,
            isReadBy: [{ user: schedule.createdBy }]
        });
        await message.save();
        await message.populate('sender', 'name role _id');
        
        // Fetch group to get teacher/students for socket emission
        // Optimization: We could store teacherId/studentIds in schedule but fetching group ensures up-to-date list
        const Group = require('../models/Group');
        const group = await Group.findById(schedule.groupId);
        
        if (group && group.memberIds) {
             for (const memberId of group.memberIds) {
                io.to(memberId.toString()).emit('newGroupMessage', { message, groupId: schedule.groupId });
             }
        }
    } else if (schedule.type === 'personal') {
        const Conversation = require('../models/Conversation');
        const PersonalMessage = require('../models/PersonalMessage');
        const pair = [schedule.createdBy.toString(), schedule.recipientId.toString()].sort();
        let conversation = await Conversation.findOne({ participants: { $all: pair } });
        if (!conversation) {
          conversation = await Conversation.create({ participants: pair });
        }
        const message = new PersonalMessage({
          ...commonData,
          recipient: schedule.recipientId,
          sender: schedule.createdBy,
          conversationId: conversation._id,
          isReadBy: [{ user: schedule.createdBy }]
        });
        await message.save();
        await message.populate([
          { path: 'sender', select: 'name role _id' },
          { path: 'recipient', select: 'name role _id' }
        ]);
        io.to(schedule.recipientId.toString()).emit('newPersonalMessage', { message });
        io.to(schedule.createdBy.toString()).emit('newPersonalMessage', { message });
        io.to(schedule.createdBy.toString()).emit('conversationUpdated', { conversationId: conversation._id, lastMessage: message });
        io.to(schedule.recipientId.toString()).emit('conversationUpdated', { conversationId: conversation._id, lastMessage: message });
    }
};

const calculateNextRun = (rule) => {
    // rule: { frequency: 'daily'|'weekly'|'monthly', days: [], time: 'HH:mm', startDate, endDate }
    const now = new Date();
    let nextDate = new Date(now);
    const [hours, minutes] = rule.time.split(':').map(Number);
    
    // Reset seconds/ms
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);
    
    // If we just ran it, we want the NEXT occurrence.
    // If frequency is daily
    if (rule.frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(hours, minutes);
    } else if (rule.frequency === 'weekly') {
        // Find next day in rule.days that is after today
        // days e.g. ['Monday', 'Wednesday']
        // This is complex. For MVP, let's assume simple weekly = +7 days if only one day selected, 
        // or logic to find next day.
        
        // Simplified: Just add 1 week for now if we assume user picked "Every Wednesday"
        // Better: Find next matching day.
        
        const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
        const targetDays = rule.days.map(d => dayMap[d]).sort(); // [1, 3] for Mon, Wed
        
        const currentDay = now.getDay();
        
        let foundNext = false;
        // Check remaining days in this week
        for (const d of targetDays) {
            if (d > currentDay) {
                // Found a day later this week
                const diff = d - currentDay;
                nextDate.setDate(nextDate.getDate() + diff);
                nextDate.setHours(hours, minutes);
                foundNext = true;
                break;
            } else if (d === currentDay) {
                // If it's today, check if time is future (unlikely since we just ran, but possible if delayed)
                // Since we just ran, we probably want next week for this day, OR next day in list.
                // But we are in "calculateNextRun" assuming we just ran.
            }
        }
        
        if (!foundNext) {
            // Go to first day of next week
            const firstDay = targetDays[0];
            const daysUntilNextWeek = 7 - currentDay + firstDay;
            nextDate.setDate(nextDate.getDate() + daysUntilNextWeek);
            nextDate.setHours(hours, minutes);
        }
        
    } else if (rule.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setHours(hours, minutes);
    }
    
    return nextDate;
};

module.exports = { initScheduler };
