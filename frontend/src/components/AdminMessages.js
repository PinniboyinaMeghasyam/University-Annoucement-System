import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Menu
} from '@mui/material';
import {
  Send,
  AttachFile,
  Download,
  Check,
  CheckCircle,
  Person,
  Work,
  AdminPanelSettings,
  School,
  Add,
  AutoFixHigh,
  Group,
  Public,
  PermMedia,
  Schedule,
  PushPin,
  PushPinOutlined,
  Reply,
  Forward,
  ContentCopy,
  Star,
  StarBorder,
  Delete,
  Info,
  ExitToApp,
  Chat,
  PersonSearch,
  RemoveCircleOutline
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api, { groupAPI } from '../services/api';
import ScheduleMessageModal from './ScheduleMessageModal';

const AdminMessages = () => {
  const { user, socketRef } = useAuth();
  
  // Group state
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Message input state
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  
  // Create group dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createGroupForm, setCreateGroupForm] = useState({
    groupName: '',
    groupType: 'ACADEMIC',
    year: 1,
    batchStart: new Date().getFullYear(),
    batchEnd: new Date().getFullYear() + 4,
    branch: '',
    commonForYear: null,
    commonForBranch: null,
    description: ''
  });
  
  // Year progression
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Legacy state variables for old code compatibility
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [messageInfo, setMessageInfo] = useState(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [memberListOpen, setMemberListOpen] = useState(false);
  const [memberListType, setMemberListType] = useState(''); // 'teacher' or 'student'
  const [previews, setPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchCurrentRef = useRef(null);
  const touchCleanupMap = useRef(new Map());

  const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const response = await groupAPI.getMyGroups();
        setGroups(response.data.groups);
      } catch (err) {
        console.error('Failed to fetch groups:', err);
        setSnackbar({ open: true, message: 'Failed to load groups', severity: 'error' });
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  // Fetch group messages when group selected
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await groupAPI.getGroupMessages(selectedGroup._id);
        setGroupMessages(response.data.messages || []);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setSnackbar({ open: true, message: 'Failed to load messages', severity: 'error' });
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedGroup]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [groupMessages]);

  // Socket listeners for group messaging
  useEffect(() => {
    if (!socketRef || !socketRef.current) return;

    const socket = socketRef.current;

    const handleNewGroupMessage = (data) => {
      const gid = data?.groupId || data?.message?.groupId;
      if (selectedGroup && String(gid) === String(selectedGroup._id)) {
        setGroupMessages(prev => {
          const exists = prev.some(msg => String(msg._id) === String(data.message._id));
          if (exists) return prev;
          return [...prev, data.message];
        });
        
        // Mark as delivered
        socket.emit('groupMessageDelivered', {
          messageId: data.message._id,
          userId: user._id
        });
      }
    };

    const handleGroupTyping = (data) => {
      if (data.groupId === selectedGroup?._id && data.userId !== user._id) {
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (prev.some(u => u.id === data.userId)) return prev;
            return [...prev, { id: data.userId, name: data.userName }];
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u.id !== data.userId));
        }
      }
    };

    const handleYearProgression = (data) => {
      setSnackbar({ open: true, message: data.message, severity: 'success' });
    };

    socket.on('newGroupMessage', handleNewGroupMessage);
    socket.on('groupTyping', handleGroupTyping);
    socket.on('yearProgressionComplete', handleYearProgression);

    return () => {
      socket.off('newGroupMessage', handleNewGroupMessage);
      socket.off('groupTyping', handleGroupTyping);
      socket.off('yearProgressionComplete', handleYearProgression);
    };
  }, [socketRef, selectedGroup, user._id]);

  // Join group room when selected
  useEffect(() => {
    if (!socketRef || !socketRef.current || !selectedGroup) return;

    socketRef.current.emit('joinGroup', selectedGroup._id);

    return () => {
      socketRef.current.emit('leaveGroup', selectedGroup._id);
    };
  }, [selectedGroup, socketRef]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && files.length === 0) || sending || !selectedGroup) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      files.forEach(file => formData.append('files', file));

      const response = await groupAPI.sendMessage(selectedGroup._id, formData);
      
      // The backend returns the message in response.data.data
      const message = response.data.data || response.data.message;
      if (message && typeof message === 'object') {
        setGroupMessages(prev => {
          const exists = prev.some(m => String(m._id) === String(message._id));
          if (exists) return prev;
          return [...prev, message];
        });
      }
      setNewMessage('');
      setFiles([]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setSnackbar({ open: true, message: 'Failed to send message', severity: 'error' });
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (!socketRef || !socketRef.current || !selectedGroup) return;

    socketRef.current.emit('groupTyping', {
      groupId: selectedGroup._id,
      userId: user._id,
      userName: user.name,
      isTyping
    });
  };

  // Create group
  const handleCreateGroup = async () => {
    try {
      const response = await groupAPI.createGroup(createGroupForm);
      setGroups(prev => [...prev, response.data.group]);
      setCreateDialogOpen(false);
      setCreateGroupForm({
        groupName: '',
        groupType: 'ACADEMIC',
        year: 1,
        batchStart: new Date().getFullYear(),
        batchEnd: new Date().getFullYear() + 4,
        branch: '',
        commonForYear: null,
        commonForBranch: null,
        description: ''
      });
      setSnackbar({ open: true, message: 'Group created successfully!', severity: 'success' });
    } catch (err) {
      console.error('Failed to create group:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to create group', severity: 'error' });
    }
  };

  // Delete group (Admin only)
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    
    if (!window.confirm(`Are you sure you want to delete the group "${selectedGroup.groupName}" permanently? This will delete all messages and cannot be undone.`)) {
      return;
    }

    try {
      await groupAPI.deleteGroup(selectedGroup._id);
      setSnackbar({ open: true, message: 'Group deleted successfully', severity: 'success' });
      setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
      setSelectedGroup(null);
      setGroupInfoOpen(false);
    } catch (err) {
      console.error('Failed to delete group:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to delete group', severity: 'error' });
    }
  };

  // Exit group
  const handleExitGroup = async () => {
    if (!selectedGroup) return;
    
    if (!window.confirm(`Are you sure you want to exit the group "${selectedGroup.groupName}"?`)) {
      return;
    }

    try {
      await groupAPI.exitGroup(selectedGroup._id);
      setSnackbar({ open: true, message: 'Exited group successfully', severity: 'success' });
      setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
      setSelectedGroup(null);
      setGroupInfoOpen(false);
    } catch (err) {
      console.error('Failed to exit group:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to exit group', severity: 'error' });
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!selectedGroup) return;
    
    if (!window.confirm(`Are you sure you want to remove ${userName} from the group?`)) {
      return;
    }

    try {
      await groupAPI.removeMember(selectedGroup._id, userId);
      setSnackbar({ open: true, message: `${userName} removed from group`, severity: 'success' });
      
      // Update local state
      setSelectedGroup(prev => ({
        ...prev,
        memberIds: prev.memberIds.filter(m => m._id !== userId)
      }));
      
      setGroups(prev => prev.map(g => 
        g._id === selectedGroup._id 
          ? { ...g, memberIds: g.memberIds.filter(m => m._id !== userId) }
          : g
      ));
    } catch (err) {
      console.error('Failed to remove member:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to remove member', severity: 'error' });
    }
  };

  const handleDirectMessage = (member) => {
    setSnackbar({ open: true, message: `Starting chat with ${member.name}...`, severity: 'info' });
    // This could redirect to a DM component or page
  };

  const handleViewProfile = (member) => {
    setSnackbar({ open: true, message: `Viewing profile of ${member.name}...`, severity: 'info' });
  };

  // Trigger year progression (admin only)
  const handleYearProgression = async () => {
    try {
      setProgressionLoading(true);
      const response = await groupAPI.triggerYearProgression();
      setSnackbar({ 
        open: true, 
        message: `Year progression complete! ${response.data.updatedStudents} students updated, ${response.data.groupsUpdated} groups rematched`, 
        severity: 'success' 
      });
      // Refresh groups
      const groupsResponse = await groupAPI.getMyGroups();
      setGroups(groupsResponse.data.groups);
    } catch (err) {
      console.error('Failed to trigger year progression:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to trigger progression', severity: 'error' });
    } finally {
      setProgressionLoading(false);
    }
  };

  // Filter groups by search
  const filteredGroups = groups.filter(group => {
    const sTerm = (searchTerm || '').toLowerCase();
    const gName = (group.groupName || '').toLowerCase();
    const gType = (group.groupType || '').toLowerCase();
    return gName.includes(sTerm) || gType.includes(sTerm);
  });

  // Separate groups by type
  const commonGroups = filteredGroups.filter(g => g.groupType === 'COMMON');
  const academicGroups = filteredGroups.filter(g => g.groupType === 'ACADEMIC');
  
  // For backward compatibility with old code
  const messages = groupMessages;

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageKey = (m) => (
    m?._id || m?.id || m?.localId || m?.tempId || m?.createdAt || undefined
  );

  const addTouchHandlers = (el, message) => {
    if (!el) return;
    
    const handleTouchStart = (e) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      handleLongPressStart(e, message);
    };

    const handleTouchMove = (e) => {
      touchCurrentRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e) => {
      handleLongPressEnd();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  };

  const handleLongPressStart = (e, message) => {
    const timer = setTimeout(() => {
      handleShowActionMenu(e, message);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleRightClick = (e, message) => {
    e.preventDefault();
    handleShowActionMenu(e, message);
  };

  const handleShowActionMenu = (e, message) => {
    setSelectedMessage(message);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX) || rect.left + rect.width / 2;
    const y = e.clientY || (e.touches && e.touches[0].clientY) || rect.top + rect.height / 2;
    setActionMenuPosition({ x, y });
    setShowActionMenu(true);
  };

  const handleCloseActionMenu = () => {
    setShowActionMenu(false);
    setSelectedMessage(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleReply = () => {
    setReplyingTo(selectedMessage);
    handleCloseActionMenu();
  };

  const handleForward = () => {
    setForwardingMessage(selectedMessage);
    handleCloseActionMenu();
  };

  const handleCopyText = () => {
    if (selectedMessage?.content) {
      navigator.clipboard.writeText(selectedMessage.content);
      setSnackbar({ open: true, message: 'Text copied to clipboard', severity: 'success' });
    }
    handleCloseActionMenu();
  };

  const getSenderIcon = (role) => {
    switch(role) {
      case 'admin': return <AdminPanelSettings fontSize="small" />;
      case 'teacher': return <Work fontSize="small" />;
      default: return <Person fontSize="small" />;
    }
  };

  const getSenderColor = (role) => {
    switch(role) {
      case 'admin': return '#f44336';
      case 'teacher': return '#ff9800';
      default: return '#2196f3';
    }
  };

  const isAttachmentOpened = (file) => {
    const id = file?.publicId || file?.url;
    const openedMap = JSON.parse(localStorage.getItem('opened_attachments') || '{}');
    return !!openedMap[id];
  };

  const isImageRemoteUrl = (url) => {
    if (!url) return false;
    if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip|txt|csv)$/i.test(url)) return false;
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url) || url.includes('image/upload');
  };

  const handleAttachmentClick = (file) => {
    window.open(file.url, '_blank');
  };

  const handleDownload = (file, fileName) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleStar = () => {
    // Optimistic UI update could go here
    setSnackbar({ open: true, message: 'Feature coming soon!', severity: 'info' });
    handleCloseActionMenu();
  };

  const handleMessageInfo = () => {
    setMessageInfo(selectedMessage);
    setShowInfoDialog(true);
    handleCloseActionMenu();
  };

  const handlePinMessage = () => {
    // Optimistic UI update could go here
    setSnackbar({ open: true, message: 'Feature coming soon!', severity: 'info' });
    handleCloseActionMenu();
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      // For now just local update if API not ready
      setGroupMessages(prev => prev.filter(m => m._id !== selectedMessage._id));
      setSnackbar({ open: true, message: 'Message deleted', severity: 'success' });
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      handleCloseActionMenu();
    }
  };

  const canPinMessage = () => {
    return user && (user.role === 'admin' || user.role === 'teacher');
  };

  const canDeleteMessage = (message) => {
    if (!user || !message) return false;
    // Admins can delete any message, users can delete their own
    if (user.role === 'admin') return true;
    const senderId = message.sender?._id || message.sender;
    return senderId === user._id;
  };

  const isMobile = window.innerWidth < 768;
  const canCreateGroups = user && (user.role === 'admin' || user.role === 'teacher');
  const canTriggerProgression = user && user.role === 'admin';
  const canSendMessage = user && (user.role === 'admin' || user.role === 'teacher');

  // Loading state
  if (loadingGroups) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          {/* Header with Group Selector */}
          <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                Admin Messages - Groups
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canTriggerProgression && (
                  <Tooltip title="Trigger Year Progression">
                    <IconButton 
                      onClick={handleYearProgression}
                      disabled={progressionLoading}
                      color="primary"
                    >
                      {progressionLoading ? <CircularProgress size={24} /> : <AutoFixHigh />}
                    </IconButton>
                  </Tooltip>
                )}
                {canCreateGroups && (
                  <Tooltip title="Create Group">
                    <IconButton onClick={() => setCreateDialogOpen(true)} color="primary">
                      <Add />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {/* Group Selector Dropdown */}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <FormControl fullWidth>
                  <InputLabel>Select Group</InputLabel>
                  <Select
                    value={selectedGroup?._id || ''}
                    label="Select Group"
                    onChange={(e) => {
                      const group = groups.find(g => g._id === e.target.value);
                      setSelectedGroup(group || null);
                      setGroupMessages([]);
                    }}
                  >
                    <MenuItem value="">
                      <em>-- Select a group --</em>
                    </MenuItem>
                    {commonGroups.map(group => (
                      <MenuItem key={group._id} value={group._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Public sx={{ mr: 1, fontSize: 20 }} />
                          {group.groupName} (Common)
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip 
                            label={group.memberIds?.filter(m => m.role === 'teacher' || m.role === 'admin').length || 0} 
                            size="small" 
                            icon={<AdminPanelSettings sx={{ fontSize: '12px !important' }} />}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          <Chip 
                            label={group.memberIds?.filter(m => m.role === 'student').length || 0} 
                            size="small" 
                            icon={<Group sx={{ fontSize: '12px !important' }} />}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                    {academicGroups.map(group => (
                      <MenuItem key={group._id} value={group._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <School sx={{ mr: 1, fontSize: 20 }} />
                          {group.groupName} (Year {group.year} - {group.branch})
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip 
                            label={group.memberIds?.filter(m => m.role === 'teacher' || m.role === 'admin').length || 0} 
                            size="small" 
                            icon={<AdminPanelSettings sx={{ fontSize: '12px !important' }} />}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          <Chip 
                            label={group.memberIds?.filter(m => m.role === 'student').length || 0} 
                            size="small" 
                            icon={<Group sx={{ fontSize: '12px !important' }} />}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                {selectedGroup && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip 
                      label={selectedGroup.groupType} 
                      color={selectedGroup.groupType === 'COMMON' ? 'success' : 'primary'}
                      icon={selectedGroup.groupType === 'COMMON' ? <Public /> : <School />}
                      size="small"
                    />
                    <Chip 
                      label={`${selectedGroup.memberIds?.filter(m => m.role === 'teacher' || m.role === 'admin').length || 0} Teachers`}
                      size="small"
                      icon={<AdminPanelSettings />}
                      onClick={() => {
                        setMemberListType('teacher');
                        setMemberListOpen(true);
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip 
                      label={`${selectedGroup.memberIds?.filter(m => m.role === 'student').length || 0} Students`}
                      size="small"
                      icon={<Group />}
                      onClick={() => {
                        setMemberListType('student');
                        setMemberListOpen(true);
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Messages Area */}
          {selectedGroup ? (
            <Paper 
              elevation={6} 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                height: '70vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
            {/* Chat Header */}
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'primary.main', 
                color: 'black', // Changed from white to black as requested
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <AdminPanelSettings sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', color: 'black' }}>
                    Admin Messages
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, color: 'black' }}>
                    Official communications from Admins & Teachers
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {canSendMessage && (
                  <Tooltip title="Schedule Message">
                    <IconButton 
                      sx={{ color: 'black' }} 
                      onClick={() => setScheduleModalOpen(true)}
                      size="small"
                    >
                      <Schedule />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton 
                  sx={{ color: 'black' }} 
                  onClick={() => setMediaGalleryOpen(true)}
                  size="small"
                >
                  <PermMedia />
                </IconButton>
                <IconButton 
                  sx={{ color: 'black' }} 
                  onClick={() => setGroupInfoOpen(true)}
                  size="small"
                >
                  <Info />
                </IconButton>
                <Chip 
                  label="ADMIN MESSAGE" 
                  size="small" 
                  sx={{ 
                    bgcolor: 'warning.main', 
                    color: 'white', 
                    fontWeight: 'bold',
                    borderRadius: 1
                  }} 
                />
              </Box>
            </Box>

            {/* Messages Area */}
            <Box 
              sx={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                p: 2,
                bgcolor: 'background.default',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message._id || getMessageKey(message)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ 
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {(() => {
                      const toIdString = (v) => {
                        if (!v) return '';
                        if (typeof v === 'string') return v;
                        if (typeof v === 'object' && v._id) return toIdString(v._id);
                        if (typeof v === 'object' && v.$oid) return v.$oid;
                        if (typeof v.toString === 'function') return v.toString();
                        return '';
                      };
                      
                      const myId = toIdString(user?._id);
                      const sender = message?.sender || {};
                      const senderId = toIdString(sender);
                      const isScheduled = !!message.isScheduled;
                      
                      // Robust detection if message belongs to current user
                      const isOwn = isScheduled || 
                                   (!!myId && !!senderId && myId === senderId) || 
                                   !!message.isOwnMessage || 
                                   (!!sender?.email && !!user?.email && sender.email === user.email) ||
                                   (!!sender?.name && !!user?.name && sender.name === user.name && sender.role === user.role);
                      
                      return (
                    <Box 
                      ref={(el) => {
                        const key = getMessageKey(message);
                        if (el) {
                          const cleanup = addTouchHandlers(el, message);
                          if (typeof cleanup === 'function' && key) {
                            touchCleanupMap.current.set(key, cleanup);
                          }
                        } else if (key) {
                          const fn = touchCleanupMap.current.get(key);
                          if (typeof fn === 'function') {
                            try { fn(); } finally { touchCleanupMap.current.delete(key); }
                          }
                        }
                      }}
                      onContextMenu={(e) => handleRightClick(e, message)}
                      onTouchStart={(e) => handleLongPressStart(e, message)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={(e) => {
                        if (e.button === 2) { // Right mouse button
                          handleRightClick(e, message);
                        }
                      }}
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwn ? 'flex-end' : 'flex-start',
                        width: '100%',
                        mb: 2
                      }}
                    >
                      <Card 
                        sx={{ 
                          maxWidth: '80%',
                          minWidth: '120px',
                          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          bgcolor: isOwn ? 'primary.main' : 'background.paper',
                          color: isOwn ? 'primary.contrastText' : 'text.primary',
                          boxShadow: isOwn ? '0 4px 12px rgba(25, 118, 210, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
                          position: 'relative',
                          overflow: 'visible'
                        }}
                      >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                          {/* Sender Info */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar 
                              sx={{ 
                                width: 24, 
                                height: 24, 
                                bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : getSenderColor(sender?.role),
                                mr: 1,
                                border: isOwn ? '1px solid rgba(255,255,255,0.3)' : 'none'
                              }}
                            >
                              {getSenderIcon(sender?.role)}
                            </Avatar>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'inherit'
                              }}
                            >
                              {sender?.name || 'User'}
                            </Typography>                            {message.isPinned && (
                              <PushPin 
                                sx={{ 
                                  fontSize: 'small', 
                                  ml: 1, 
                                  color: 'inherit',
                                  opacity: 0.8
                                }} 
                              />
                            )}
                          </Box>

                          {/* Message Content */}
                          {message.content && (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                mb: 1,
                                color: 'inherit',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                            >
                              {message.content}
                            </Typography>
                          )}                          {/* Files */}
                          {message.files && message.files.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              {message.files.map((file, index) => (
                                <Card 
                                  key={index} 
                                  variant="outlined" 
                                  sx={{ 
                                    mb: 1,
                                    bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'background.paper',
                                    borderColor: isOwn ? 'rgba(255,255,255,0.2)' : 'divider',
                                    color: 'inherit'
                                  }}
                                >
                                  <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                                    {isImageRemoteUrl(file.url) && (
                                      <Box sx={{ mb: 1, overflow: 'hidden', borderRadius: 1 }}>
                                        <img src={file.url} alt={file.fileName} style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
                                      </Box>
                                    )}
                                    <Box 
                                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                                      onClick={() => handleAttachmentClick(file)}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AttachFile fontSize="small" sx={{ color: 'inherit' }} />
                                        <Box>
                                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'inherit' }}>
                                            {file.fileName}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
                                            {formatFileSize((file.fileSize ?? file.size ?? 0))}
                                          </Typography>
                                        </Box>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {isAttachmentOpened(file) && (
                                          <CheckCircle fontSize="small" sx={{ color: isOwn ? 'inherit' : 'success.main' }} />
                                        )}
                                        <IconButton 
                                          size="small"
                                          onClick={(e) => { e.stopPropagation(); handleDownload(file, file.fileName); }}
                                          sx={{ color: 'inherit' }}
                                        >
                                          <Download fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  </CardContent>
                                </Card>
                              ))}
                            </Box>
                          )}

                          {/* Read Status */}
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'inherit',
                                opacity: 0.8,
                                mr: 0.5
                              }}
                            >
                              {formatTimestamp(message.createdAt)}
                            </Typography>
                            {isOwn && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {(message.isReadBy && message.isReadBy.length > 0) ? (
                                  <>
                                    <Check fontSize="inherit" sx={{ color: 'inherit', width: 14, height: 14 }} />
                                    <Check fontSize="inherit" sx={{ color: 'inherit', width: 14, height: 14, ml: '-8px' }} />
                                  </>
                                ) : (message.deliveredTo && message.deliveredTo.length > 0) ? (
                                  <>
                                    <Check fontSize="inherit" sx={{ color: 'inherit', width: 14, height: 14, opacity: 0.5 }} />
                                    <Check fontSize="inherit" sx={{ color: 'inherit', width: 14, height: 14, ml: '-8px', opacity: 0.5 }} />
                                  </>
                                ) : (
                                  <Check fontSize="inherit" sx={{ color: 'inherit', width: 14, height: 14, opacity: 0.5 }} />
                                )}
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                      );
                    })()}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </Box>
            
            {/* Action Menu Popup */}
            <Popover
              open={showActionMenu}
              onClose={handleCloseActionMenu}
              anchorReference="anchorPosition"
              anchorPosition={{ top: actionMenuPosition.y, left: actionMenuPosition.x }}
              transformOrigin={{
                vertical: 'center',
                horizontal: 'center',
              }}
              PaperProps={{
                style: {
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                },
              }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Card 
                  sx={{ 
                    borderRadius: 2, 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Button 
                        color="inherit"
                        startIcon={<Reply />}
                        onClick={handleReply}
                        sx={{ 
                          textTransform: 'none', 
                          justifyContent: 'flex-start',
                          color: 'text.primary',
                          minWidth: '120px'
                        }}
                      >
                        Reply
                      </Button>
                      
                      <Button 
                        color="inherit"
                        startIcon={<Forward />}
                        onClick={handleForward}
                        sx={{ 
                          textTransform: 'none', 
                          justifyContent: 'flex-start',
                          color: 'text.primary',
                          minWidth: '120px'
                        }}
                      >
                        Forward
                      </Button>
                      
                      <Button 
                        color="inherit"
                        startIcon={<ContentCopy />}
                        onClick={handleCopyText}
                        sx={{ 
                          textTransform: 'none', 
                          justifyContent: 'flex-start',
                          color: 'text.primary',
                          minWidth: '120px'
                        }}
                      >
                        Copy
                      </Button>

                      <Button 
                        color="inherit"
                        startIcon={selectedMessage?.isStarredBy?.includes(user?._id) ? <Star sx={{ color: '#FFD700' }} /> : <StarBorder />}
                        onClick={handleToggleStar}
                        sx={{ 
                          textTransform: 'none', 
                          justifyContent: 'flex-start',
                          color: 'text.primary',
                          minWidth: '120px'
                        }}
                      >
                        {selectedMessage?.isStarredBy?.includes(user?._id) ? 'Unstar' : 'Star'}
                      </Button>

                      {(user?.role === 'admin' || user?.role === 'teacher') && (
                        <Button 
                          color="inherit"
                          startIcon={<Info />}
                          onClick={handleMessageInfo}
                          sx={{ 
                            textTransform: 'none', 
                            justifyContent: 'flex-start',
                            color: 'text.primary',
                            minWidth: '120px'
                          }}
                        >
                          Info
                        </Button>
                      )}
                      
                      {canPinMessage() && (
                        <Button 
                          color="inherit"
                          startIcon={selectedMessage?.isPinned ? <PushPin /> : <PushPinOutlined />}
                          onClick={handlePinMessage}
                          sx={{ 
                            textTransform: 'none', 
                            justifyContent: 'flex-start',
                            color: 'text.primary',
                            minWidth: '120px'
                          }}
                        >
                          {selectedMessage?.isPinned ? 'Unpin' : 'Pin'}
                        </Button>
                      )}
                      
                      {canDeleteMessage(selectedMessage) && (
                        <Button 
                          color="inherit"
                          startIcon={<Delete />}
                          onClick={handleDeleteMessage}
                          sx={{ 
                            textTransform: 'none', 
                            justifyContent: 'flex-start',
                            color: 'error.main',
                            minWidth: '120px'
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Popover>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <Box sx={{ p: 1, px: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={10} thickness={5} />
                  {typingUsers.length === 1 
                    ? `${typingUsers[0].name} is typing...` 
                    : `${typingUsers.length} people are typing...`}
                </Typography>
              </Box>
            )}

            {/* Reply/Forward Preview */}
            {(replyingTo || forwardingMessage) && (
              <Box 
                sx={{ 
                  p: 1, 
                  bgcolor: 'background.paper',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    {replyingTo ? 'Replying to:' : 'Forwarding:'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {replyingTo?.sender?.name || forwardingMessage?.sender?.name || ''}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={resetReplyForward}>
                  <Delete />
                </IconButton>
              </Box>
            )}
            
            {/* Message Input */}
            {canSendMessage && (
              <Box 
                component="form" 
                onSubmit={handleSendMessage}
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper',
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}
              >
                {/* File Preview */}
                {files.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                      Attachments:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {files.map((file, index) => (
                        <Chip
                          key={index}
                          label={`${file.name} (${formatFileSize((file.fileSize ?? file.size ?? 0))})`}
                          onDelete={() => handleRemoveFile(index)}
                          size="small"
                          icon={<AttachFile />}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    multiple
                  />
                  <IconButton 
                    onClick={() => fileInputRef.current?.click()}
                    color="primary"
                  >
                    <AttachFile />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      
                      // Typing indicator logic
                      if (socketRef.current) {
                        socketRef.current.emit('adminTyping', {
                          senderId: user._id,
                          senderName: user.name,
                          isTyping: true
                        });
                        
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          socketRef.current.emit('adminTyping', {
                            senderId: user._id,
                            senderName: user.name,
                            isTyping: false
                          });
                        }, 2000);
                      }
                    }}
                    placeholder="Type an admin message..."
                    variant="outlined"
                    size="small"
                  />
                  <IconButton 
                    type="submit"
                    color="primary"
                    disabled={sending || (!newMessage.trim() && files.length === 0)}
                  >
                    {sending ? <CircularProgress size={24} /> : <Send />}
                  </IconButton>
                </Box>
              </Box>
            )}

            {!canSendMessage && (
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  Only admins and teachers can send messages in this section
                </Typography>
              </Box>
            )}
            </Paper>
          ) : (
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box>
                <Group sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="textSecondary" gutterBottom>
                  Select a Group to View Messages
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Choose a group from the dropdown above or create a new group
                </Typography>
              </Box>
            </Paper>
          )}
        </motion.div>
      </Container>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Group Name"
                value={createGroupForm.groupName}
                onChange={(e) => setCreateGroupForm({...createGroupForm, groupName: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Group Type</InputLabel>
                <Select
                  value={createGroupForm.groupType}
                  label="Group Type"
                  onChange={(e) => setCreateGroupForm({...createGroupForm, groupType: e.target.value})}
                >
                  <MenuItem value="ACADEMIC">Academic Group</MenuItem>
                  <MenuItem value="COMMON">Common Group</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {createGroupForm.groupType === 'ACADEMIC' && (
              <>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={createGroupForm.year}
                      label="Year"
                      onChange={(e) => setCreateGroupForm({...createGroupForm, year: e.target.value})}
                    >
                      {[1, 2, 3, 4].map(y => (
                        <MenuItem key={y} value={y}>Year {y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Batch Start Year"
                    type="number"
                    value={createGroupForm.batchStart}
                    onChange={(e) => setCreateGroupForm({...createGroupForm, batchStart: parseInt(e.target.value)})}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Batch End Year"
                    type="number"
                    value={createGroupForm.batchEnd}
                    onChange={(e) => setCreateGroupForm({...createGroupForm, batchEnd: parseInt(e.target.value)})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Branch</InputLabel>
                    <Select
                      value={createGroupForm.branch}
                      label="Branch"
                      onChange={(e) => setCreateGroupForm({...createGroupForm, branch: e.target.value})}
                    >
                      {branches.map(b => (
                        <MenuItem key={b} value={b}>{b}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            {createGroupForm.groupType === 'COMMON' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Year (Optional)</InputLabel>
                    <Select
                      value={createGroupForm.commonForYear || ''}
                      label="Filter by Year (Optional)"
                      onChange={(e) => setCreateGroupForm({...createGroupForm, commonForYear: e.target.value || null})}
                    >
                      <MenuItem value="">All Years</MenuItem>
                      {[1, 2, 3, 4].map(y => (
                        <MenuItem key={y} value={y}>Year {y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Branch (Optional)</InputLabel>
                    <Select
                      value={createGroupForm.commonForBranch || ''}
                      label="Filter by Branch (Optional)"
                      onChange={(e) => setCreateGroupForm({...createGroupForm, commonForBranch: e.target.value || null})}
                    >
                      <MenuItem value="">All Branches</MenuItem>
                      {branches.map(b => (
                        <MenuItem key={b} value={b}>{b}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={2}
                value={createGroupForm.description}
                onChange={(e) => setCreateGroupForm({...createGroupForm, description: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGroup} 
            variant="contained"
            disabled={!createGroupForm.groupName || (createGroupForm.groupType === 'ACADEMIC' && !createGroupForm.branch)}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Info Dialog */}
      <Dialog open={groupInfoOpen} onClose={() => setGroupInfoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
          Group Information
        </DialogTitle>
        <DialogContent>
          {selectedGroup && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
                {selectedGroup.groupName}
              </Typography>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="textSecondary">
                  Join Code
                </Typography>
                <Typography variant="h4" sx={{ letterSpacing: 4, fontWeight: 'bold', color: 'primary.main' }}>
                  {selectedGroup.qrToken?.substring(0, 8).toUpperCase() || 'N/A'}
                </Typography>
              </Box>

              <Typography variant="subtitle2" gutterBottom color="textSecondary">
                QR Code for Students
              </Typography>
              <Box 
                component="img"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedGroup.qrToken}`}
                alt="Group QR Code"
                sx={{ width: 200, height: 200, mb: 2, border: '1px solid', borderColor: 'divider', p: 1, bgcolor: 'white' }}
              />
              
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Students can scan this QR code or enter the Join Code in their mobile app to join this group.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: 'left', mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">Type: {selectedGroup.groupType}</Typography>
                {selectedGroup.groupType === 'ACADEMIC' && (
                  <Typography variant="subtitle2" color="textSecondary">
                    Academic: Year {selectedGroup.year}, Branch {selectedGroup.branch}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<AdminPanelSettings fontSize="small" />}
                    label={`${selectedGroup.memberIds?.filter(m => m.role === 'teacher' || m.role === 'admin').length || 0} Teachers`}
                    onClick={() => {
                      setMemberListType('teacher');
                      setMemberListOpen(true);
                    }}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip 
                    icon={<Group fontSize="small" />}
                    label={`${selectedGroup.memberIds?.filter(m => m.role === 'student').length || 0} Students`}
                    onClick={() => {
                      setMemberListType('student');
                      setMemberListOpen(true);
                    }}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Box>

              {user?.role !== 'admin' && (
                <Button 
                  fullWidth 
                  variant="outlined" 
                  color="error" 
                  startIcon={<ExitToApp />}
                  onClick={handleExitGroup}
                  sx={{ mt: 1 }}
                >
                  Exit Group
                </Button>
              )}

              {user?.role === 'admin' && (
                <Button 
                  fullWidth 
                  variant="outlined" 
                  color="error" 
                  startIcon={<Delete />}
                  onClick={handleDeleteGroup}
                  sx={{ mt: 1 }}
                >
                  Delete Group Permanently
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupInfoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Member List Dialog */}
      <Dialog open={memberListOpen} onClose={() => setMemberListOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {memberListType === 'teacher' ? <AdminPanelSettings /> : <Group />}
          {memberListType === 'teacher' ? 'Teachers List' : 'Students List'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedGroup && (
            <List sx={{ width: '100%' }}>
              {selectedGroup.memberIds
                ?.filter(m => memberListType === 'teacher' ? (m.role === 'teacher' || m.role === 'admin') : m.role === 'student')
                .map((member, index) => (
                  <ListItem 
                    key={member._id || index} 
                    sx={{ py: 1 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Direct Message">
                          <IconButton size="small" onClick={() => handleDirectMessage(member)} color="primary">
                            <Chat fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Profile">
                          <IconButton size="small" onClick={() => handleViewProfile(member)}>
                            <PersonSearch fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {(user?.role === 'admin' || (user?.role === 'teacher' && (selectedGroup.createdBy?._id === user._id || selectedGroup.createdBy === user._id))) && 
                         member._id !== user._id && member.role !== 'admin' && (
                          <Tooltip title="Remove Member">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveMember(member._id, member.name)} 
                              color="error"
                            >
                              <RemoveCircleOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getSenderColor(member.role), width: 32, height: 32 }}>
                        {getSenderIcon(member.role)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={member.name}
                      secondary={member.role === 'student' ? `Roll No: ${member.rollNumber || 'N/A'}` : member.email}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              {selectedGroup.memberIds?.filter(m => memberListType === 'teacher' ? (m.role === 'teacher' || m.role === 'admin') : m.role === 'student').length === 0 && (
                <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                  No {memberListType}s found in this group.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberListOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ScheduleMessageModal 
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        type="group"
        groupId={selectedGroup?._id}
        onScheduleCreated={() => {
            setScheduleModalOpen(false);
            setSnackbar({ open: true, message: 'Message scheduled successfully', severity: 'success' });
        }}
      />
    </motion.div>
  );
};

export default AdminMessages;
