import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  InputAdornment,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogContent,
  Popover,
  useTheme,
  useMediaQuery,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Search,
  MoreVert,
  ArrowBack,
  Send,
  AttachFile,
  InsertEmoticon,
  Check,
  DoneAll,
  Close,
  Description,
  Image as ImageIcon,
  PictureAsPdf,
  Mic,
  Call,
  Videocam,
  PushPin,
  PushPinOutlined,
  PermMedia,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import MediaGallery from './MediaGallery';
import ScheduleMessageModal from './ScheduleMessageModal';

// --- Access Control Component ---
const AccessDenied = () => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="80vh">
    <Typography variant="h5" color="error" gutterBottom>
      Access Restricted
    </Typography>
    <Typography variant="body1" color="textSecondary">
      This module is only for Admins and Teachers.
    </Typography>
  </Box>
);

const PersonalMessages = () => {
  const { user, token, socketRef } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // { conversationId, otherParticipant, messages: [] }
  const [messages, setMessages] = useState([]); // Current chat messages
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [filePreviews, setFilePreviews] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null); // For menus
  const [isTyping, setIsTyping] = useState(false);
  const [users, setUsers] = useState([]);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const messageRefs = useRef({});

  // --- Access Control Check ---
  const canAccess = user && ['admin', 'teacher'].includes(user.role);

  // --- Effects ---

  // 1. Initial Load & Socket Setup
  useEffect(() => {
    if (!canAccess) return;

    fetchConversations();
    fetchUsers();

    if (socketRef.current) {
      socketRef.current.on('newPersonalMessage', handleNewMessage);
      socketRef.current.on('conversationUpdated', handleConversationUpdated);
      socketRef.current.on('personalMessageRead', handleMessageRead);
      socketRef.current.on('personalMessagePinned', ({ messageId, pin }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned: pin } : m));
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('newPersonalMessage', handleNewMessage);
        socketRef.current.off('conversationUpdated', handleConversationUpdated);
        socketRef.current.off('personalMessageRead', handleMessageRead);
        socketRef.current.off('personalMessagePinned');
      }
    };
  }, [user, token, socketRef, canAccess]);

  // 2. Handle URL Params for Persistence
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId && conversations.length > 0 && !selectedChat) {
      const chat = conversations.find(c => c.conversationId === chatId);
      if (chat) {
        handleConversationClick(chat, false); // false = don't update URL again
      }
    }
  }, [searchParams, conversations]);

  // 3. Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Handle File Previews
  useEffect(() => {
    const newPreviews = files.map(file => {
      if (file.type.startsWith('image/')) {
        return { type: 'image', url: URL.createObjectURL(file), name: file.name };
      }
      return { type: 'file', name: file.name };
    });
    setFilePreviews(newPreviews);
    
    return () => {
      newPreviews.forEach(p => {
        if (p.type === 'image') URL.revokeObjectURL(p.url);
      });
    };
  }, [files]);

  // --- Data Fetching ---

  const fetchConversations = async () => {
    try {
      const response = await api.get('/personal-messages/conversations');
      setConversations(response.data.conversations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/messaging');
      // Helper to extract users array from various response structures
      let usersArray = [];
      if (Array.isArray(response.data)) {
        usersArray = response.data;
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        usersArray = response.data.users;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        usersArray = response.data.data;
      }
      
      // Filter out current user and ensure valid role
      const filtered = usersArray.filter(u => 
        u._id !== user._id && 
        ['admin', 'teacher'].includes(u.role)
      );
      setUsers(filtered);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (chat) => {
    if (!chat) return;
    try {
      // If we have a conversationId, use it. If not (new chat from user list), we might need to find it or just query by user?
      // The backend getMessages supports conversationId query or general fetch.
      // Let's rely on conversationId if available.
      
      let url = '/personal-messages';
      if (chat.conversationId) {
        url += `?conversationId=${chat.conversationId}`;
      } else {
        // If no conversationId yet (e.g. clicking a user from "New Chat" list who we haven't messaged yet),
        // we normally wouldn't have a chat object in the list. 
        // We'll handle "New Chat" logic separately. 
        // For now assume we are clicking existing conversations.
      }

      const response = await api.get(url);
      setMessages(response.data.messages || []);
      
      // Mark as read
      // We can do this by emitting an event or calling an API. 
      // The backend `getMessages` already marks them as read if we pass the right filters, 
      // but let's ensure we update the UI locally too.
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // --- Event Handlers ---

  const handleStartNewChat = (recipient) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.otherParticipant._id === recipient._id);
    if (existing) {
      handleConversationClick(existing);
    } else {
      // Create temporary chat object
      const newChat = {
        otherParticipant: recipient,
        messages: [],
        conversationId: null // Will be created on first message
      };
      setSelectedChat(newChat);
      setMessages([]);
    }
    setShowNewChatDialog(false);
  };

  const handleDownload = async (file) => {
    if (!file) return;
    const url = file.url || file.secure_url;
    if (!url) return;

    // Web: Open in new tab (user can save from there)
    if (!isMobile) {
      window.open(url, '_blank');
      return;
    }

    // Mobile: Force download
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const handleConversationClick = (convo, updateUrl = true) => {
    setSelectedChat(convo);
    fetchMessages(convo);
    
    if (updateUrl && convo.conversationId) {
      setSearchParams({ chatId: convo.conversationId });
    }
    setMessageInput('');
    setFiles([]);
  };

  const handleBackToConversations = () => {
    setSelectedChat(null);
    setSearchParams({});
    setMessageInput('');
    setFiles([]);
  };

  const handleNewMessage = (data) => {
    const newMessage = data.message;
    
    // Update active chat if open
    setSelectedChat(prev => {
      if (prev && (prev.conversationId === newMessage.conversationId)) {
         setMessages(currentMsgs => {
             if (currentMsgs.some(m => m._id === newMessage._id)) return currentMsgs;
             return [...currentMsgs, newMessage];
         });
         
         // Mark as read immediately if chat is open
         api.get(`/personal-messages?conversationId=${newMessage.conversationId}`).catch(console.error);

         return prev;
      }
      return prev;
    });

    // Update conversation list
    fetchConversations(); 
  };

  const handleConversationUpdated = (data) => {
    // Refresh conversation list to show new last message/unread count
    fetchConversations();
  };

  const handleMessageRead = (data) => {
    // Update read receipts in current chat
    setMessages(prev => prev.map(msg => {
      if (msg._id === data.messageId) {
        return { ...msg, isReadBy: [...(msg.isReadBy || []), { user: data.userId }] };
      }
      return msg;
    }));
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && files.length === 0) || !selectedChat || sending) return;

    setSending(true);
    const formData = new FormData();
    formData.append('content', messageInput);
    formData.append('recipientId', selectedChat.otherParticipant._id);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/personal-messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const sentMsg = response.data.data;
      setMessages(prev => [...prev, sentMsg]);
      
      // If this was a new chat, update the conversationId
      if (!selectedChat.conversationId && sentMsg.conversationId) {
        setSelectedChat(prev => ({ ...prev, conversationId: sentMsg.conversationId }));
        // Also refresh conversations to show the new one in the list
        fetchConversations();
      }

      setMessageInput('');
      setFiles([]);
      
      // Conversation list will update via socket
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleEmojiOpen = (e) => {
    setEmojiAnchorEl(e.currentTarget);
  };
  const handleEmojiClose = () => setEmojiAnchorEl(null);
  const handleEmojiSelect = (emoji) => {
    setMessageInput(prev => prev + emoji);
    handleEmojiClose();
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice_message.webm', { type: 'audio/webm' });
        setFiles(prev => [...prev, file]);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
    }
  };
  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } catch (_) {}
  };
  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };
  const togglePin = async (msg) => {
    try {
      await api.patch(`/personal-messages/${msg._id}/pin`, { pin: !msg.isPinned });
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isPinned: !msg.isPinned } : m));
    } catch (e) {
      console.error('Pin toggle failed', e);
    }
  };
  const scrollToMessage = (id) => {
    messageRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleFileSelect = (e) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files)]);
      // Reset the input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Render Helpers ---

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return format(date, 'h:mm a');
  };

  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (!canAccess) return <AccessDenied />;

  // --- Views ---

  // 1. Left Panel: Conversation List
  const ConversationList = (
    <Box sx={{ 
      width: isMobile ? '100%' : '35%', 
      height: '100%', 
      borderRight: (t) => isMobile ? 'none' : `1px solid ${t.palette.divider}`,
      display: isMobile && selectedChat ? 'none' : 'flex',
      flexDirection: 'column',
      bgcolor: (t) => t.palette.mode === 'dark' ? '#1E1E2E' : '#F8F7FF',
      transition: 'background-color 0.3s ease'
    }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.06)' : 'rgba(79,70,229,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar src={user?.profilePicture?.url || user?.profilePicture} alt={user?.name} sx={{ width: 36, height: 36, border: (t) => `2px solid ${t.palette.mode === 'dark' ? '#818CF8' : '#4F46E5'}` }} />
          <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>Messages</Typography>
        </Box>
        <Box>
           <IconButton onClick={() => setShowNewChatDialog(true)} sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.18)' : 'rgba(79,70,229,0.14)' } }}>
             <MoreVert sx={{ fontSize: 18 }} />
           </IconButton>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search or start new chat"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: (t) => t.palette.mode === 'dark' ? '#818CF8' : '#4F46E5' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px', bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.06)' : 'rgba(79,70,229,0.05)', border: (t) => `1px solid ${t.palette.divider}`, fontSize: 13, '&.Mui-focused': { bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)' } }
          }}
        />
      </Box>

      <Divider />

      {/* List */}
      <List sx={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence>
        {conversations.map((convo) => {
           const isSelected = selectedChat?.conversationId === convo.conversationId;
           return (
            <motion.div
              key={convo.conversationId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
            <ListItem 
              button 
              selected={isSelected}
              onClick={() => handleConversationClick(convo)}
              sx={{ 
                bgcolor: isSelected ? (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.08)' : 'transparent',
                borderLeft: isSelected ? '3px solid' : '3px solid transparent',
                borderLeftColor: isSelected ? (t) => t.palette.mode === 'dark' ? '#818CF8' : '#4F46E5' : 'transparent',
                '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.05)' },
                transition: 'all 0.2s ease',
                py: 1.5
              }}
            >
              <ListItemAvatar>
                <Avatar src={convo.otherParticipant?.profilePicture?.url} alt={convo.otherParticipant?.name} sx={{ width: 42, height: 42, fontSize: 16, fontWeight: 700, background: (t) => t.palette.mode === 'dark' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'linear-gradient(135deg, #818CF8, #A78BFA)', border: '2px solid', borderColor: (t) => t.palette.divider }}>
                  {convo.otherParticipant?.name?.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: '70%' }}>
                      {convo.otherParticipant?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {convo.lastMessage ? formatTime(convo.lastMessage.createdAt) : ''}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '80%' }}>
                      {convo.lastMessage?.senderId === user._id && 'You: '}
                      {convo.lastMessage?.hasFiles ? '📎 Attachment' : convo.lastMessage?.content}
                    </Typography>
                    {convo.unreadCount > 0 && (
                      <Badge badgeContent={convo.unreadCount} sx={{ mr: 1, '& .MuiBadge-badge': { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', fontWeight: 700, fontSize: 10 } }} />
                    )}
                  </Box>
                }
              />
            </ListItem>
            </motion.div>
           );
        })}
        </AnimatePresence>
        {conversations.length === 0 && !loading && (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No conversations yet.
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );

  // 2. Right Panel: Chat Window
  const ChatWindow = selectedChat ? (
    <Box sx={{ 
      width: isMobile ? '100%' : '65%', 
      height: '100%', 
      display: isMobile && !selectedChat ? 'none' : 'flex',
      flexDirection: 'column',
      bgcolor: (t) => t.palette.mode === 'dark' ? '#141422' : '#F0EDFF',
      transition: 'background-color 0.3s ease'
    }}>
      {/* Chat Header */}
      <Paper square elevation={0} sx={{ p: 1.5, display: 'flex', alignItems: 'center', bgcolor: (t) => t.palette.mode === 'dark' ? '#1A1A2E' : '#fff', zIndex: 1, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
        {isMobile && (
          <IconButton onClick={handleBackToConversations} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
        )}
        <Avatar src={selectedChat.otherParticipant?.profilePicture?.url} sx={{ mr: 2, width: 40, height: 40, background: (t) => t.palette.mode === 'dark' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'linear-gradient(135deg, #818CF8, #A78BFA)', fontWeight: 700, border: '2px solid', borderColor: (t) => t.palette.divider }}>
          {selectedChat.otherParticipant?.name?.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
            {selectedChat.otherParticipant?.name}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981', display: 'inline-block' }} />
            {selectedChat.otherParticipant?.role === 'admin' ? 'HOD / Admin' : 'Teacher'}
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={() => setMediaGalleryOpen(true)}><PermMedia /></IconButton>
          <IconButton onClick={() => setScheduleModalOpen(true)}><Schedule /></IconButton>
          <IconButton><Search /></IconButton>
          <IconButton><MoreVert /></IconButton>
        </Box>
      </Paper>

      {messages.some(m => m.isPinned) && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', gap: 1, overflowX: 'auto' }}>
          {messages.filter(m => m.isPinned).map(m => (
            <Paper key={m._id} sx={{ px: 1, py: 0.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => scrollToMessage(m._id)}>
              <Badge color="warning" variant="dot">
                <Typography variant="caption" sx={{ maxWidth: 180 }} noWrap>
                  {m.files && m.files.length > 0 ? 'Attachment' : (m.content || '')}
                </Typography>
              </Badge>
            </Paper>
          ))}
        </Box>
      )}

      {/* Messages Area */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <AnimatePresence>
        {Object.keys(groupedMessages).map(date => (
          <React.Fragment key={date}>
            <Box display="flex" justifyContent="center" my={1.5}>
              <Paper elevation={0} sx={{ px: 2, py: 0.5, borderRadius: '20px', bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)', backdropFilter: 'blur(8px)', border: (t) => `1px solid ${t.palette.divider}` }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: (t) => t.palette.mode === 'dark' ? '#818CF8' : '#4F46E5' }}>
                  {formatDateHeader(date)}
                </Typography>
              </Paper>
            </Box>
            {groupedMessages[date].map(msg => {
              const senderId = msg.sender?._id || msg.sender;
              const currentUserId = user?._id || user?.id;
              const isMe = senderId && currentUserId && senderId.toString() === currentUserId.toString();
              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  ref={(el) => { if (el) messageRefs.current[msg._id] = el; }}
                  style={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginBottom: '4px',
                    width: '100%'
                  }}
                >
                  <Paper elevation={0} sx={{ 
                    p: 1.5, 
                    px: 2,
                    maxWidth: '75%',
                    background: isMe 
                      ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' 
                      : (t) => t.palette.mode === 'dark' ? '#2A2A3E' : '#FFFFFF',
                    color: isMe ? '#fff' : 'text.primary',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    position: 'relative',
                    boxShadow: isMe ? '0 2px 12px rgba(79,70,229,0.35)' : (t) => t.palette.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    border: isMe ? 'none' : (t) => `1px solid ${t.palette.divider}`,
                    transition: 'all 0.2s ease'
                  }}>
                    {/* Attachments */}
                    {msg.files && msg.files.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        {msg.files.map((file, idx) => {
                          const isImage = file.fileType === 'image' || file.fileType === 'jpg' || file.fileType === 'png' || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          return (
                            <Box 
                              key={idx} 
                              onClick={() => handleDownload(file)}
                              sx={{ 
                                cursor: 'pointer',
                                mb: 0.5,
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: 1,
                                overflow: 'hidden'
                              }}
                            >
                              {isImage ? (
                                <img 
                                  src={file.url} 
                                  alt={file.fileName} 
                                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} 
                                />
                              ) : (
                                <Box p={1} display="flex" alignItems="center" bgcolor="rgba(0,0,0,0.05)">
                                  <Description sx={{ mr: 1 }} />
                                  <Typography variant="body2" noWrap>{file.fileName || 'Attachment'}</Typography>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5} mt={0.5}>
                      <Typography sx={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                        {formatTime(msg.createdAt)}
                      </Typography>
                      {isMe && (
                        <Box component="span" sx={{ display: 'flex', color: msg.isReadBy && msg.isReadBy.some(r => r.user !== user._id) ? '#67E8F9' : 'rgba(255,255,255,0.5)' }}>
                          <DoneAll fontSize="inherit" sx={{ fontSize: '0.85rem' }} />
                        </Box>
                      )}
                      <IconButton size="small" onClick={() => togglePin(msg)} sx={{ ml: 0.5 }}>
                        {msg.isPinned ? <PushPin /> : <PushPinOutlined />}
                      </IconButton>
                    </Box>
                  </Paper>
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </Box>

      {/* File Preview Area */}
      {filePreviews.length > 0 && (
        <Box sx={{ p: 1, bgcolor: 'background.paper', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Box display="flex" gap={1} overflow="auto">
            {filePreviews.map((preview, idx) => (
              <Box key={idx} position="relative" sx={{ width: 60, height: 60, flexShrink: 0 }}>
                 {preview.type === 'image' ? (
                   <img src={preview.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                 ) : (
                   <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center" bgcolor="grey.200" borderRadius={1}>
                     <AttachFile />
                   </Box>
                 )}
                 <IconButton 
                    size="small" 
                    sx={{ position: 'absolute', top: -5, right: -5, bgcolor: 'white', p: 0.2, '&:hover': { bgcolor: 'grey.200' } }}
                    onClick={() => {
                      const newFiles = [...files];
                      newFiles.splice(idx, 1);
                      setFiles(newFiles);
                    }}
                 >
                   <Close fontSize="small" />
                 </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ p: 1.5, bgcolor: (t) => t.palette.mode === 'dark' ? '#1A1A2E' : '#fff', display: 'flex', alignItems: 'center', gap: 1, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
        <IconButton onClick={handleEmojiOpen}><InsertEmoticon /></IconButton>
        <IconButton onClick={() => fileInputRef.current?.click()}>
          <AttachFile />
        </IconButton>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        
        <TextField
          fullWidth
          placeholder="Type a message"
          size="small"
          value={messageInput || ''}
          onChange={(e) => {
            setMessageInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: '14px',
              bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.06)' : 'rgba(79,70,229,0.04)',
              border: (t) => `1px solid ${t.palette.divider}`,
              fontSize: 14,
              '&.Mui-focused': { bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.06)' }
            }
          }}
        />
        
        {messageInput.trim() || files.length > 0 ? (
          <IconButton onClick={handleSendMessage} disabled={sending} sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', boxShadow: '0 2px 10px rgba(79,70,229,0.4)', '&:hover': { boxShadow: '0 4px 16px rgba(79,70,229,0.55)' }, '&:disabled': { opacity: 0.5, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' } }}>
            {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send sx={{ fontSize: 18 }} />}
          </IconButton>
        ) : (
          <IconButton onClick={toggleRecording} color={isRecording ? 'error' : 'default'}>
            <Mic />
          </IconButton>
        )}
      </Box>
    </Box>
  ) : (
    <Box sx={{ 
      width: isMobile ? '100%' : '65%', 
      height: '100%', 
      display: isMobile ? 'none' : 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: (t) => t.palette.mode === 'dark' ? '#141422' : '#F0EDFF',
      flexDirection: 'column',
      transition: 'background-color 0.3s ease'
    }}>
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: '20px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3, boxShadow: '0 8px 32px rgba(79,70,229,0.3)' }}>
          <Send sx={{ fontSize: 36, color: '#fff', transform: 'rotate(-20deg)' }} />
        </Box>
        <Typography sx={{ fontSize: 26, fontWeight: 800, mb: 1, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          UniAnnounce
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Select a conversation to start messaging
        </Typography>
      </Box>
    </Box>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      style={{ height: '100%', width: '100%' }}
    >
    <Box sx={{ 
      height: 'calc(100vh - 80px)', // Adjust based on your layout's header height
      display: 'flex',
      bgcolor: 'background.paper',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {ConversationList}
      {ChatWindow}
      
      {/* "New Chat" FAB or similar could be added here */}
      
      <Dialog open={showNewChatDialog} onClose={() => setShowNewChatDialog(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Typography variant="h6" gutterBottom>New Chat</Typography>
          <List>
            {users.map(u => (
              <ListItem button key={u._id} onClick={() => handleStartNewChat(u)}>
                <ListItemAvatar>
                  <Avatar src={u.profilePicture?.url}>{u.name?.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={u.name} 
                  secondary={u.role} 
                />
              </ListItem>
            ))}
            {users.length === 0 && <Typography align="center">No users found.</Typography>}
          </List>
        </DialogContent>
      </Dialog>
      <MediaGallery
        open={mediaGalleryOpen}
        onClose={() => setMediaGalleryOpen(false)}
        messages={messages}
        title={selectedChat ? `Media in ${selectedChat.otherParticipant?.name}` : 'Media'}
      />
      <ScheduleMessageModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        type="personal"
        recipientId={selectedChat?.otherParticipant?._id}
        onScheduleCreated={() => setScheduleModalOpen(false)}
      />
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={handleEmojiClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: 240 }}>
          {['😀','😂','😊','😍','👍','🙏','🎉','❤️','🔥','😎','🤔','😢','😡','🙌','👏','💯'].map(e => (
            <Box key={e} sx={{ cursor: 'pointer', fontSize: 22 }} onClick={() => handleEmojiSelect(e)}>
              {e}
            </Box>
          ))}
        </Box>
      </Popover>
    </Box>
    </motion.div>
  );
};

export default PersonalMessages;
