const crypto = require('crypto');
const Group = require('../models/Group');
const User = require('../models/User');

// Auto-match students to group based on filters
const autoMatchStudents = async (groupId) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) return;

    let query = { role: 'student' };

    if (group.groupType === 'ACADEMIC') {
      // Match students with same year, batch, and branch
      if (group.year) query.year = group.year;
      if (group.batchStart && group.batchEnd) {
        query.batchStart = group.batchStart;
        query.batchEnd = group.batchEnd;
      }
      if (group.branch) query.branch = group.branch;
    } else if (group.groupType === 'COMMON') {
      // Common group - goes to all students and teachers by default
      // optionally filtered by year/branch for students
      let studentQuery = { role: 'student' };
      if (group.commonForYear) studentQuery.year = group.commonForYear;
      if (group.commonForBranch) studentQuery.branch = group.commonForBranch;

      const matchingStudents = await User.find(studentQuery).select('_id');
      const allTeachers = await User.find({ role: 'teacher' }).select('_id');

      const allUserIds = [
        ...matchingStudents.map(s => s._id),
        ...allTeachers.map(t => t._id)
      ];

      // Update group with matching users
      await Group.findByIdAndUpdate(groupId, {
        $addToSet: { memberIds: { $each: allUserIds } }
      });

      console.log(`✅ Auto-matched ${allUserIds.length} users (students + teachers) to common group: ${group.groupName}`);
      return; // Skip the default student-only matching below
    }

    const matchingStudents = await User.find(query).select('_id');
    const studentIds = matchingStudents.map(s => s._id);

    // Update group with matching students
    await Group.findByIdAndUpdate(groupId, {
      $addToSet: { memberIds: { $each: studentIds } }
    });

    console.log(`✅ Auto-matched ${studentIds.length} students to group: ${group.groupName}`);
  } catch (error) {
    console.error('Error in autoMatchStudents:', error);
  }
};

// Create group
const createGroup = async (req, res) => {
  try {
    let {
      groupName,
      groupType,
      year,
      batchStart,
      batchEnd,
      branch,
      commonForYear,
      commonForBranch,
      description,
      subject,
      section
    } = req.body;

    // Handle legacy fields from Announcements.js
    if (!groupName && subject) {
      groupName = section ? `${subject} (${section})` : subject;
    }
    if (!groupType && subject) {
      groupType = 'ACADEMIC';
    }

    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only teachers or admins can create groups' });
    }

    if (!groupName || !groupType) {
      return res.status(400).json({ message: 'Group name and type are required' });
    }

    // Create group
    const group = await Group.create({
      groupName,
      groupType,
      year: groupType === 'ACADEMIC' ? year : undefined,
      batchStart: groupType === 'ACADEMIC' ? batchStart : undefined,
      batchEnd: groupType === 'ACADEMIC' ? batchEnd : undefined,
      branch: groupType === 'ACADEMIC' ? branch : undefined,
      commonForYear: groupType === 'COMMON' ? commonForYear : undefined,
      commonForBranch: groupType === 'COMMON' ? commonForBranch : undefined,
      description,
      subject,
      section,
      createdBy: req.user._id,
      memberIds: [req.user._id],
      qrToken: crypto.randomBytes(16).toString('hex'),
      isAutoManaged: groupType === 'ACADEMIC' && (year || branch) ? true : false
    });

    // Auto-match students if auto-managed
    if (group.isAutoManaged) {
      await autoMatchStudents(group._id);
    }

    // Populate member info
    await group.populate('memberIds', 'name email year branch role rollNumber');
    await group.populate('createdBy', 'name email');

    // Emit socket event
    const io = req.app.get('socketio');
    io.emit('newGroupAvailable', { group });

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group: ' + error.message });
  }
};

// Get user's groups
const getMyGroups = async (req, res) => {
  try {
    let groups;

    if (req.user.role === 'admin') {
      // Admins see all groups
      groups = await Group.find({})
        .populate('memberIds', 'name email year branch role rollNumber')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Teachers and Students see:
      // 1. Groups where they are members
      // 2. Groups they created (for teachers)

      const query = {
        $or: [
          { memberIds: req.user._id }
        ]
      };

      if (req.user.role === 'teacher') {
        query.$or.push({ createdBy: req.user._id });
      }

      groups = await Group.find(query)
        .populate('memberIds', 'name email year branch role rollNumber')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups: ' + error.message });
  }
};

// Get group info
const getGroupInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id)
      .populate('createdBy', 'name email')
      .populate('memberIds', 'name email year branch role rollNumber');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check access
    const isCreator = group.createdBy._id.toString() === req.user._id.toString();
    const isMember = group.memberIds.some(m => m._id.toString() === req.user._id.toString());

    if (!isCreator && !isMember && req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied: User is not authorized to view this group' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Error fetching group info:', error);
    res.status(500).json({ message: 'Failed to fetch group info: ' + error.message });
  }
};

// Trigger year progression (Admin only)
const triggerYearProgression = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can trigger year progression' });
    }

    // Update all students (except 4th year - they graduate)
    const result = await User.updateMany(
      { role: 'student', year: { $lt: 4 } },
      { $inc: { year: 1 } }
    );

    console.log(`🎓 Year progression: Updated ${result.modifiedCount} students`);

    // Re-match all ACADEMIC groups
    const academicGroups = await Group.find({ groupType: 'ACADEMIC' });
    for (const group of academicGroups) {
      await autoMatchStudents(group._id);
    }

    // Emit socket event
    const io = req.app.get('socketio');
    io.emit('yearProgressionComplete', {
      message: 'Year progression complete',
      updatedCount: result.modifiedCount
    });

    res.json({
      updatedStudents: result.modifiedCount,
      groupsUpdated: academicGroups.length
    });
  } catch (error) {
    console.error('Error triggering year progression:', error);
    res.status(500).json({ message: 'Failed to trigger year progression: ' + error.message });
  }
};

// Delete group (Admin only)
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete groups permanently' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Delete all messages associated with this group
    const GroupMessage = require('../models/GroupMessage');
    await GroupMessage.deleteMany({ groupId: id });

    // Delete the group itself
    await Group.findByIdAndDelete(id);

    console.log(`🗑️ Group deleted: ${group.groupName} by admin ${req.user.email}`);

    res.json({ message: 'Group and all its messages deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Failed to delete group: ' + error.message });
  }
};

// Exit group
const exitGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Admins cannot "exit" as they manage everything, but we check if user is a member
    const isMember = group.memberIds.some(m => m.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(400).json({ message: 'You are not a member of this group' });
    }

    // Remove user from members
    await Group.findByIdAndUpdate(id, {
      $pull: { memberIds: req.user._id }
    });

    console.log(`🚶 User ${req.user.email} exited group ${group.groupName}`);

    res.json({ message: 'Exited group successfully' });
  } catch (error) {
    console.error('Error exiting group:', error);
    res.status(500).json({ message: 'Failed to exit group: ' + error.message });
  }
};

// Remove member from group (Admin/Teacher only)
const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is creator or admin
    const isCreator = group.createdBy.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove user from members
    await Group.findByIdAndUpdate(id, {
      $pull: { memberIds: userId }
    });

    console.log(`❌ User ${userId} removed from group ${group.groupName} by ${req.user.email}`);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Failed to remove member: ' + error.message });
  }
};

// Join group by QR token (legacy support)
const joinByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const group = await Group.findOne({ qrToken: token });
    if (!group) {
      return res.status(404).json({ message: 'Invalid or expired QR token' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join via QR' });
    }

    await Group.updateOne(
      { _id: group._id },
      { $addToSet: { memberIds: req.user._id } }
    );

    const io = req.app.get('socketio');
    io.to(group.createdBy.toString()).emit('groupJoined', {
      groupId: group._id,
      studentId: req.user._id
    });

    res.json({ message: 'Joined group successfully', groupId: group._id });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Failed to join group: ' + error.message });
  }
};

// Get groups by section (legacy support for Announcements.js)
const getGroupsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const groups = await Group.find({ section })
      .populate('memberIds', 'name email year branch role rollNumber')
      .populate('createdBy', 'name email');
    res.json({ groups });
  } catch (error) {
    console.error('Error fetching groups by section:', error);
    res.status(500).json({ message: 'Failed to fetch groups: ' + error.message });
  }
};

module.exports = {
  createGroup,
  getMyGroups,
  getGroupInfo,
  triggerYearProgression,
  deleteGroup,
  exitGroup,
  removeMember,
  joinByToken,
  autoMatchStudents,
  getGroupsBySection
};
