import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Card,
  CardContent,
  Chip,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Snackbar,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Send,
  AttachFile,
  Add,
  ArrowBack,
  Search,
  Group,
  Public,
  AutoFixHigh,
  School,
  Download,
  Check
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { groupAPI } from '../services/api';

const WhatsAppAdminMessages = () => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
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
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      if (data.groupId === selectedGroup?._id) {
        setGroupMessages(prev => {
          const exists = prev.some(msg => msg._id === data.message._id);
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
      
      setGroupMessages(prev => [...prev, response.data.message]);
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
  const filteredGroups = groups.filter(group => 
    group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const academicGroups = filteredGroups.filter(g => g.groupType === 'ACADEMIC');
  const commonGroups = filteredGroups.filter(g => g.groupType === 'COMMON');

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canCreateGroups = user && (user.role === 'admin' || user.role === 'teacher');
  const canTriggerProgression = user && user.role === 'admin';

  // Loading state
  if (loadingGroups) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', bgcolor: '#f5f5f5' }}>
        {/* Sidebar */}
        {!selectedGroup && (
          <Paper 
            sx={{ 
              width: '100%',
              borderRight: '1px solid #e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Sidebar Header */}
            <Box sx={{ p: 2, bgcolor: '#075e54', color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Groups
                </Typography>
                <Box>
                  {canTriggerProgression && (
                    <Tooltip title="Trigger Year Progression">
                      <IconButton 
                        color="inherit" 
                        onClick={handleYearProgression}
                        disabled={progressionLoading}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        {progressionLoading ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
                      </IconButton>
                    </Tooltip>
                  )}
                  {canCreateGroups && (
                    <Tooltip title="Create Group">
                      <IconButton color="inherit" onClick={() => setCreateDialogOpen(true)} size="small">
                        <Add />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
              <TextField
                fullWidth
                size="small"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'rgba(255,255,255,0.7)' }} />
                    </InputAdornment>
                  ),
                  sx: { bgcolor: 'white', borderRadius: 1 }
                }}
              />
            </Box>

            {/* Groups List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {/* Common Groups */}
              {commonGroups.length > 0 && (
                <>
                  <Box sx={{ p: 1, bgcolor: '#f0f0f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                      <Public sx={{ fontSize: 14, mr: 0.5 }} />
                      COMMON GROUPS
                    </Typography>
                  </Box>
                  <List>
                    {commonGroups.map(group => (
                      <ListItem key={group._id} disablePadding>
                        <ListItemButton onClick={() => setSelectedGroup(group)}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#25d366' }}>
                              <Public />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={group.groupName}
                            secondary={group.description || 'Common Group'}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {/* Academic Groups */}
              {academicGroups.length > 0 && (
                <>
                  <Box sx={{ p: 1, bgcolor: '#f0f0f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                      <Group sx={{ fontSize: 14, mr: 0.5 }} />
                      ACADEMIC GROUPS
                    </Typography>
                  </Box>
                  <List>
                    {academicGroups.map(group => (
                      <ListItem key={group._id} disablePadding>
                        <ListItemButton onClick={() => setSelectedGroup(group)}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#128c7e' }}>
                              <School />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={group.groupName}
                            secondary={`Year ${group.year} | ${group.branch} | ${group.batchStart}-${group.batchEnd}`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {filteredGroups.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Group sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="body1" color="textSecondary">
                    No groups yet
                  </Typography>
                  {canCreateGroups && (
                    <Button 
                      variant="contained" 
                      startIcon={<Add />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Create Group
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        )}

        {/* Chat Area */}
        {selectedGroup && (
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <Box sx={{ p: 2, bgcolor: '#075e54', color: 'white', display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton color="inherit" onClick={() => { setSelectedGroup(null); setGroupMessages([]); }}>
                <ArrowBack />
              </IconButton>
              <Avatar sx={{ bgcolor: selectedGroup.groupType === 'COMMON' ? '#25d366' : '#128c7e' }}>
                {selectedGroup.groupType === 'COMMON' ? <Public /> : <School />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {selectedGroup.groupName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {selectedGroup.groupType === 'ACADEMIC' 
                    ? `Year ${selectedGroup.year} | ${selectedGroup.branch} | ${selectedGroup.batchStart}-${selectedGroup.batchEnd}`
                    : 'Common Group'
                  }
                </Typography>
              </Box>
              <Chip 
                label={selectedGroup.groupType} 
                size="small" 
                sx={{ 
                  bgcolor: selectedGroup.groupType === 'COMMON' ? '#25d366' : '#128c7e', 
                  color: 'white' 
                }} 
              />
            </Box>

            {/* Messages Area */}
            <Box 
              sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                p: 2,
                bgcolor: '#e5ddd5',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4d4d4\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              }}
            >
              <AnimatePresence>
                {groupMessages.map((message) => {
                  const senderId = message?.sender?._id || message?.sender;
                  const isOwn = senderId === user?._id;

                  return (
                    <motion.div
                      key={message._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ marginBottom: '12px' }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                        <Card 
                          sx={{ 
                            maxWidth: '70%',
                            borderRadius: 2,
                            bgcolor: isOwn ? '#dcf8c6' : 'white',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {!isOwn && (
                              <Typography 
                                variant="caption" 
                                sx={{ fontWeight: 'bold', color: '#075e54', display: 'block', mb: 0.5 }}
                              >
                                {message.sender?.name || 'Unknown'}
                              </Typography>
                            )}
                            
                            {message.content && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {message.content}
                              </Typography>
                            )}

                            {message.files && message.files.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                {message.files.map((file, index) => (
                                  <Box key={index} sx={{ mb: 1 }}>
                                    {file.url && file.mimetype && file.mimetype.startsWith('image/') ? (
                                      <img 
                                        src={file.url} 
                                        alt={file.fileName} 
                                        style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8 }} 
                                      />
                                    ) : (
                                      <Box 
                                        sx={{ 
                                          p: 1, 
                                          bgcolor: 'rgba(0,0,0,0.05)', 
                                          borderRadius: 1,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1
                                        }}
                                      >
                                        <AttachFile />
                                        <Box>
                                          <Typography variant="body2">{file.fileName}</Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            {formatFileSize(file.fileSize || file.size || 0)}
                                          </Typography>
                                        </Box>
                                        <IconButton 
                                          size="small" 
                                          onClick={() => window.open(file.url, '_blank')}
                                          sx={{ ml: 'auto' }}
                                        >
                                          <Download />
                                        </IconButton>
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" color="textSecondary">
                                {formatTimestamp(message.createdAt)}
                              </Typography>
                              {isOwn && (
                                message.isReadBy && message.isReadBy.length > 0 ? (
                                  <Check sx={{ color: '#53bdeb', fontSize: 16 }} />
                                ) : (
                                  <Check sx={{ color: 'text.secondary', fontSize: 16 }} />
                                )
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {typingUsers.length > 0 && (
                <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, mb: 1, display: 'inline-block' }}>
                  <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box 
              component="form" 
              onSubmit={handleSendMessage}
              sx={{ 
                p: 2, 
                bgcolor: 'white',
                borderTop: '1px solid #e0e0e0'
              }}
            >
              {files.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                    Attachments:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {files.map((file, index) => (
                      <Chip
                        key={index}
                        label={`${file.name} (${formatFileSize(file.size)})`}
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
                <IconButton onClick={() => fileInputRef.current?.click()} color="primary">
                  <AttachFile />
                </IconButton>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(true);
                    
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);
                  }}
                  placeholder="Type a message..."
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
          </Paper>
        )}
      </Box>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
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
    </motion.div>
  );
};

export default WhatsAppAdminMessages;
