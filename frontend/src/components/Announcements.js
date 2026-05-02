import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Pagination,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Dialog,
  DialogContent,
  DialogActions,
  Popover,
  Menu
} from '@mui/material';
import {
  Search,
  Download,
  PictureAsPdf,
  Description,
  Image,
  Attachment,
  CalendarToday,
  Person,
  FilterList,
  Sort,
  Announcement,
  PushPin,
  Public,
  Event,
  Groups,
  MoreVert,
  AttachFile,
  Send,
  ContentCopy,
  Poll,
  AddReaction,
  Close,
  Notifications,
  CheckCircle,
  Check,
  RadioButtonUnchecked,
  PermMedia,
  NotificationsOff,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MediaGallery from './MediaGallery';
import ScheduleMessageModal from './ScheduleMessageModal';

// Add CSS for pulse animation
const styles = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    }
  }
`;

const Announcements = () => {
  const { user, socketRef, updateUser } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const announcementsPerPage = 5;
  const errorLogCountRef = useRef(0);
  const [selectedSection, setSelectedSection] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupSubject, setNewGroupSubject] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groupInfo, setGroupInfo] = useState(null);
  const [groupChatMessages, setGroupChatMessages] = useState([]);
  const [groupChatLoading, setGroupChatLoading] = useState(false);
  const [groupChatInput, setGroupChatInput] = useState('');
  const [groupChatFiles, setGroupChatFiles] = useState([]);

  // Poll & Reaction States
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const [selectedAnnouncementForReaction, setSelectedAnnouncementForReaction] = useState(null);
  const [groupActionMenuOpen, setGroupActionMenuOpen] = useState(false);
  const [groupActionMenuPos, setGroupActionMenuPos] = useState({ x: 0, y: 0 });
  const [selectedGroupMessage, setSelectedGroupMessage] = useState(null);
  const [groupInfoDialogOpen, setGroupInfoDialogOpen] = useState(false);
  const [messageInfo, setMessageInfo] = useState(null);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  const handleGroupMessageInfo = async () => {
    if (!selectedGroupMessage) return;
    try {
      const response = await api.get(`/group-messages/${selectedGroupMessage._id}/info`);
      setMessageInfo(response.data);
      setGroupInfoDialogOpen(true);
    } catch (err) {
      console.error('Failed to get message info', err);
    }
    setGroupActionMenuOpen(false);
  };

  const groupChatScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchCurrentRef = useRef(null);
  const touchHandlersMap = useRef(new Map());
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Group Announcement Poll State
  const [gaPollOpen, setGaPollOpen] = useState(false);
  const [gaPollQuestion, setGaPollQuestion] = useState('');
  const [gaPollOptions, setGaPollOptions] = useState(['', '']);
  const [gaAllowMultiple, setGaAllowMultiple] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinQRFile, setJoinQRFile] = useState(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [feedTab, setFeedTab] = useState(0); // 0=All, 1=Global, 2=Group
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [createGroupAnnOpen, setCreateGroupAnnOpen] = useState(false);
  const [gaTitle, setGaTitle] = useState('');
  const [gaDesc, setGaDesc] = useState('');
  const [gaFiles, setGaFiles] = useState([]);
  const [groupSummaries, setGroupSummaries] = useState({});
  const [groupInfoMap, setGroupInfoMap] = useState({});
  const [qrAnchorEl, setQrAnchorEl] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        let response;
        if (feedTab === 1) {
          response = await api.get(`/announcements/global?page=${page}&limit=${announcementsPerPage}`);
        } else if (feedTab === 2 && selectedGroupId) {
          response = await api.get(`/announcements/group/${selectedGroupId}?page=${page}&limit=${announcementsPerPage}`);
        } else {
          if (user.role === 'admin') {
            response = await api.get(`/announcements/all?page=${page}&limit=${announcementsPerPage}`);
          } else {
            response = await api.get(`/announcements/section/${user.section}?page=${page}&limit=${announcementsPerPage}`);
          }
        }
        setAnnouncements(response.data.announcements || []);
        setTotalPages(response.data.totalPages || 1);
      } catch (err) {
        if (errorLogCountRef.current < 2) {
          console.error('Failed to fetch announcements', err?.message || err);
          errorLogCountRef.current++;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user, navigate, page, feedTab, selectedGroupId]);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (!socketRef || !socketRef.current) return;

    const handleNewAnnouncement = (data) => {
      console.log('New announcement received:', data);
      // Add the new announcement to the top of the list
      const a = data.announcement;
      if (feedTab === 2 && selectedGroupId) {
        if (String(a.groupId || '') !== String(selectedGroupId)) return;
      }
      setAnnouncements(prev => [a, ...prev]);
    };

    const handleDeleteAnnouncement = (data) => {
      console.log('Announcement deleted:', data);
      // Remove the deleted announcement from the list
      setAnnouncements(prev => prev.filter(announcement => announcement._id !== data.id));
    };

    socketRef.current.on('newAnnouncement', handleNewAnnouncement);
    socketRef.current.on('deleteAnnouncement', handleDeleteAnnouncement);

    const handleNewGroupMessage = (data) => {
      if (groupInfo && data?.message?.groupId === groupInfo._id) {
        setGroupChatMessages(prev => {
          const exists = prev.some(m => m._id === data.message._id);
          if (!exists && data.message.sender._id !== user._id) {
            socketRef.current.emit('groupMessageDelivered', {
              messageId: data.message._id,
              userId: user._id
            });
          }
          return exists ? prev : [...prev, data.message];
        });
      }
      const gid = data?.message?.groupId;
      if (gid) {
        api.get('/group-messages/summary', { params: { groupId: gid } })
          .then(r => {
            const summary = r.data?.summary || null;
            setGroupSummaries(prev => ({ ...prev, [gid]: summary }));
          })
          .catch(() => { });
      }
    };

    const handleGroupMessageReaction = (data) => {
      if (groupInfo && data.groupId === groupInfo._id) {
        setGroupChatMessages(prev => prev.map(m => {
          if (m._id === data.messageId) {
            return { ...m, reactions: data.reactions };
          }
          return m;
        }));
      }
    };

    const handleGroupMessagePollUpdate = (data) => {
      if (groupInfo && data.groupId === groupInfo._id) {
        setGroupChatMessages(prev => prev.map(m => {
          if (m._id === data.messageId) {
            return { ...m, poll: data.poll };
          }
          return m;
        }));
      }
    };

    const handleGroupMessageDeleted = (data) => {
      setGroupChatMessages(prev => prev.filter(m => m._id !== data.messageId));
    };

    const handleGroupMessagePinned = (data) => {
      if (groupInfo && data.groupId === groupInfo._id) {
        setGroupChatMessages(prev => prev.map(m => {
          if (m._id === data.messageId) {
            return { ...m, isPinned: data.pin };
          }
          return m;
        }));
      }
    };

    const handleGroupMessageStarred = (data) => {
      if (groupInfo && data.groupId === groupInfo._id) {
        setGroupChatMessages(prev => prev.map(m => {
          if (m._id === data.messageId) {
            return { ...m, isStarredBy: data.isStarredBy };
          }
          return m;
        }));
      }
    };

    const handleAnnouncementReaction = (data) => {
      setAnnouncements(prev => prev.map(a => {
        if (a._id === data.announcementId) {
          return { ...a, reactions: data.reactions };
        }
        return a;
      }));
    };

    const handleAnnouncementPollUpdate = (data) => {
      setAnnouncements(prev => prev.map(a => {
        if (a._id === data.announcementId) {
          return { ...a, poll: data.poll };
        }
        return a;
      }));
    };

    const handleGroupTyping = ({ groupId, userId, userName, isTyping }) => {
      if (groupInfo && groupId === groupInfo._id && userId !== user._id) {
        setTypingUsers(prev => {
          if (isTyping) {
            return prev.some(u => u.id === userId) ? prev : [...prev, { id: userId, name: userName }];
          } else {
            return prev.filter(u => u.id !== userId);
          }
        });
      }
    };

    socketRef.current.on('newGroupMessage', handleNewGroupMessage);
    socketRef.current.on('groupMessageReaction', handleGroupMessageReaction);
    socketRef.current.on('groupMessagePollUpdate', handleGroupMessagePollUpdate);
    socketRef.current.on('groupMessageDeleted', handleGroupMessageDeleted);
    socketRef.current.on('groupMessagePinned', handleGroupMessagePinned);
    socketRef.current.on('groupMessageStarred', handleGroupMessageStarred);
    socketRef.current.on('announcementReaction', handleAnnouncementReaction);
    socketRef.current.on('announcementPollUpdate', handleAnnouncementPollUpdate);
    socketRef.current.on('groupTyping', handleGroupTyping);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('newAnnouncement', handleNewAnnouncement);
        socketRef.current.off('deleteAnnouncement', handleDeleteAnnouncement);
        socketRef.current.off('newGroupMessage', handleNewGroupMessage);
        socketRef.current.off('groupMessageReaction', handleGroupMessageReaction);
        socketRef.current.off('groupMessagePollUpdate', handleGroupMessagePollUpdate);
        socketRef.current.off('groupMessageDeleted', handleGroupMessageDeleted);
        socketRef.current.off('groupMessagePinned', handleGroupMessagePinned);
        socketRef.current.off('groupMessageStarred', handleGroupMessageStarred);
        socketRef.current.off('announcementReaction', handleAnnouncementReaction);
        socketRef.current.off('announcementPollUpdate', handleAnnouncementPollUpdate);
        socketRef.current.off('groupTyping', handleGroupTyping);
      }
    };
  }, [socketRef, feedTab, selectedGroupId, groupInfo]);
  useEffect(() => {
    const el = groupChatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [groupChatMessages]);

  // Function to check if an announcement is new (less than 24 hours old)
  const isNewAnnouncement = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffHours = Math.abs(now - created) / 36e5;
    return diffHours < 24;
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('image')) {
      return <Image />;
    } else if (fileType.includes('pdf')) {
      return <PictureAsPdf />;
    } else {
      return <Description />;
    }
  };

  const isMobile = () => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod|mobile/i.test(ua);
  };

  const getFileNameFromUrl = (url) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const last = parts[parts.length - 1] || '';
      return decodeURIComponent(last);
    } catch {
      return String(url).split('/').pop() || 'File';
    }
  };

  const OPENED_KEY = 'opened_attachments';
  const getOpenedMap = () => {
    try {
      return JSON.parse(localStorage.getItem(OPENED_KEY) || '{}');
    } catch {
      return {};
    }
  };
  const markOpened = (id) => {
    const map = getOpenedMap();
    map[id] = true;
    localStorage.setItem(OPENED_KEY, JSON.stringify(map));
  };
  const isOpened = (id) => {
    const map = getOpenedMap();
    return !!map[id];
  };

  const handleAttachmentClick = (file) => {
    const url = file.url;
    const id = file.publicId || url;
    if (isMobile()) {
      handleDownload(file, file.fileName);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    markOpened(id);
  };

  const getDownloadUrl = (url) => {
    if (!url) return url;
    try {
      const u = new URL(url);
      if (u.hostname.includes('res.cloudinary.com') && u.pathname.includes('/upload/')) {
        const parts = u.pathname.split('/');
        const uploadIndex = parts.findIndex(p => p === 'upload');
        if (uploadIndex !== -1) {
          const nextIndex = uploadIndex + 1;
          const nextPart = parts[nextIndex] || '';
          const isVersionSegment = /^v\d+$/i.test(nextPart);
          if (nextPart && nextPart.includes(',') && !isVersionSegment) {
            parts[nextIndex] = `fl_attachment,${nextPart}`;
          } else {
            parts.splice(nextIndex, 0, 'fl_attachment');
          }
          u.pathname = parts.join('/');
          return u.toString();
        }
      }
      return url;
    } catch (_) {
      return url;
    }
  };

  const handleDownload = async (fileOrUrl, fileName) => {
    const url = typeof fileOrUrl === 'string'
      ? fileOrUrl
      : (fileOrUrl?.url || fileOrUrl?.secure_url || fileOrUrl?.fileUrl || '');
    const dl = getDownloadUrl(url);
    try {
      const res = await fetch(dl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || getFileNameFromUrl(url);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      window.open(dl, '_blank');
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.description.toLowerCase().includes(searchTerm.toLowerCase());

    // For simplicity, we're not implementing date filtering in this example
    return matchesSearch;
  });

  if (!user) {
    return null;
  }

  const fetchMyGroups = async () => {
    try {
      const resp = await api.get('/groups/mine');
      const list = Array.isArray(resp.data?.groups) ? resp.data.groups : [];
      setMyGroups(list);
      const summaryPromises = list.map(g => api.get('/group-messages/summary', { params: { groupId: g._id } })
        .then(r => ({ gid: g._id, summary: r.data?.summary || null }))
        .catch(() => ({ gid: g._id, summary: null })));
      const infoPromises = list.map(g => api.get(`/groups/${g._id}`)
        .then(r => ({ gid: g._id, info: r.data?.group || g }))
        .catch(() => ({ gid: g._id, info: g })));
      const [summaries, infos] = await Promise.all([
        Promise.all(summaryPromises),
        Promise.all(infoPromises)
      ]);
      const sMap = {};
      summaries.forEach(({ gid, summary }) => { sMap[gid] = summary; });
      const iMap = {};
      infos.forEach(({ gid, info }) => { iMap[gid] = info; });
      setGroupSummaries(sMap);
      setGroupInfoMap(iMap);
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to fetch my groups', e?.message || e);
        errorLogCountRef.current++;
      }
      setMyGroups([]);
    }
  };

  const fetchGroups = async (section) => {
    try {
      const resp = await api.get(`/groups/by-section/${section}`);
      setGroups(Array.isArray(resp.data?.groups) ? resp.data.groups : []);
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to fetch groups', e?.message || e);
        errorLogCountRef.current++;
      }
      setGroups([]);
    }
  };

  useEffect(() => {
    if (user?.role === 'teacher' && !selectedSection) {
      const sec = Array.isArray(user.section)
        ? (user.section[0] || null)
        : (typeof user.section === 'string' ? user.section : null);
      if (sec) {
        setSelectedSection(sec);
      }
    }
  }, [user, selectedSection]);

  useEffect(() => {
    if (selectedSection) {
      fetchGroups(selectedSection);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (feedTab === 2) {
      fetchMyGroups();
    }
  }, [feedTab]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessageDelivered = (data) => {
      // data: { messageId, userId, groupId }
      if (groupInfo && data.groupId === groupInfo._id) {
        setGroupChatMessages(prev => prev.map(msg => {
          if (msg._id === data.messageId) {
            const alreadyDelivered = msg.deliveredTo?.some(d => d.user === data.userId);
            if (!alreadyDelivered) {
              return {
                ...msg,
                deliveredTo: [...(msg.deliveredTo || []), { user: data.userId, deliveredAt: new Date() }]
              };
            }
          }
          return msg;
        }));
      }
    };

    socketRef.current.on('groupMessageDelivered', handleMessageDelivered);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('groupMessageDelivered', handleMessageDelivered);
      }
    };
  }, [groupInfo]);

  // Handle long press
  const handleLongPressStart = (e, message) => {
    // e.preventDefault(); // Do not prevent default to allow scrolling if not long press
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    typingTimeoutRef.current = setTimeout(() => {
      setSelectedGroupMessage(message);
      setGroupActionMenuPos({ x, y });
      setGroupActionMenuOpen(true);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleRightClick = (e, message) => {
    e.preventDefault();
    setSelectedGroupMessage(message);
    setGroupActionMenuPos({ x: e.clientX, y: e.clientY });
    setGroupActionMenuOpen(true);
  };

  const handleReply = (message) => {
    const msg = message || selectedGroupMessage;
    if (msg?.content) {
      const quoted = `> ${msg.content}\n`;
      setGroupChatInput(prev => `${quoted}${prev || ''}`);
    }
    setGroupActionMenuOpen(false);
  };

  const addTouchHandlers = (element, message) => {
    if (!element) return;
    const key = element;

    // Cleanup existing handlers for this element if present
    const existingCleanup = touchHandlersMap.current.get(key);
    if (existingCleanup) {
      try { existingCleanup(); } catch (_) { }
      touchHandlersMap.current.delete(key);
    }

    const handleTouchStart = (e) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchCurrentRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      handleLongPressStart(e, message);
    };

    const handleTouchMove = (e) => {
      touchCurrentRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      // Cancel long press if moved
      if (touchStartRef.current) {
        const deltaX = Math.abs(touchCurrentRef.current.x - touchStartRef.current.x);
        const deltaY = Math.abs(touchCurrentRef.current.y - touchStartRef.current.y);
        if (deltaX > 10 || deltaY > 10) {
          handleLongPressEnd();
        }
      }
    };

    const handleTouchEnd = (e) => {
      handleLongPressEnd();

      if (touchStartRef.current && touchCurrentRef.current) {
        const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
        const deltaY = touchCurrentRef.current.y - touchStartRef.current.y;

        // Swipe right (reply) - threshold 70px
        if (deltaX > 70 && Math.abs(deltaY) < 50) {
          handleReply(message);
        }
      }

      touchStartRef.current = null;
      touchCurrentRef.current = null;
    };

    const handleContextMenu = (e) => handleRightClick(e, message);

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('contextmenu', handleContextMenu);

    const cleanup = () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('contextmenu', handleContextMenu);
    };
    touchHandlersMap.current.set(key, cleanup);
  };

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      touchHandlersMap.current.forEach((cleanup) => {
        try { cleanup(); } catch (_) { }
      });
      touchHandlersMap.current.clear();
    };
  }, []);

  const handleCreateGroup = async () => {
    try {
      const resp = await api.post('/groups', {
        groupName: `${newGroupSubject} (${selectedSection})`,
        groupType: 'ACADEMIC',
        subject: newGroupSubject,
        section: selectedSection,
        description: newGroupDescription
      });
      setShowCreateGroup(false);
      setNewGroupSubject('');
      setNewGroupDescription('');
      await fetchGroups(selectedSection);
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to create group', e?.message || e);
        errorLogCountRef.current++;
      }
    }
  };

  const openGroupInfo = async (group) => {
    try {
      const resp = await api.get(`/groups/${group._id}`);
      setGroupInfo(resp.data?.group || group);
      await fetchGroupChat(resp.data?.group?._id || group._id);
      const gid = resp.data?.group?._id || group._id;
      const sRes = await api.get('/group-messages/summary', { params: { groupId: gid } });
      const summary = sRes.data?.summary || null;
      setGroupSummaries(prev => ({ ...prev, [gid]: summary }));
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to fetch group info', e?.message || e);
        errorLogCountRef.current++;
      }
      setGroupInfo(group);
      await fetchGroupChat(group._id);
      try {
        const sRes = await api.get('/group-messages/summary', { params: { groupId: group._id } });
        const summary = sRes.data?.summary || null;
        setGroupSummaries(prev => ({ ...prev, [group._id]: summary }));
      } catch (_) { }
    }
  };

  const fetchGroupChat = async (gid) => {
    try {
      setGroupChatLoading(true);
      const resp = await api.get(`/group-messages`, { params: { groupId: gid } });
      setGroupChatMessages(Array.isArray(resp.data?.messages) ? resp.data.messages : []);
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to fetch group chat', e?.message || e);
        errorLogCountRef.current++;
      }
      setGroupChatMessages([]);
    } finally {
      setGroupChatLoading(false);
    }
  };

  const handleGroupChatFilesChange = (e) => {
    setGroupChatFiles(Array.from(e.target.files || []));
  };

  const sendGroupChatMessage = async () => {
    try {
      if (!groupInfo) return;
      if (!groupChatInput && groupChatFiles.length === 0) return;
      const formData = new FormData();
      formData.append('groupId', groupInfo._id);
      formData.append('content', groupChatInput);
      groupChatFiles.forEach(f => formData.append('files', f));
      const resp = await api.post('/group-messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGroupChatMessages(prev => {
        const incoming = resp.data?.data;
        if (!incoming) return prev;
        const exists = prev.some(m => m._id === incoming._id);
        return exists ? prev : [...prev, incoming];
      });
      setGroupChatInput('');
      setGroupChatFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to send group message', e?.message || e);
        errorLogCountRef.current++;
      }
    }
  };

  const openJoinDialog = () => {
    setJoinCode('');
    setJoinQRFile(null);
    setJoinDialogOpen(true);
  };

  const handleJoinByCode = async () => {
    try {
      if (!joinCode) return;
      setJoinLoading(true);
      const token = String(joinCode).trim();
      await api.get(`/groups/join/${token}`);
      setJoinDialogOpen(false);
      await fetchMyGroups();
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to join by code', e?.message || e);
        errorLogCountRef.current++;
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinQRFileChange = (e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    setJoinQRFile(f);
  };

  const decodeAndJoinFromQR = async () => {
    try {
      if (!joinQRFile) return;
      setJoinLoading(true);
      const fd = new FormData();
      fd.append('file', joinQRFile);
      const res = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      let decoded = '';
      try {
        decoded = data && data[0] && data[0].symbol && data[0].symbol[0] && data[0].symbol[0].data || '';
      } catch (_) { }
      if (!decoded) throw new Error('QR decode failed');
      const url = new URL(decoded);
      const parts = url.pathname.split('/');
      const token = parts.pop() || '';
      if (!token) throw new Error('Invalid QR content');
      await api.get(`/groups/join/${token}`);
      setJoinDialogOpen(false);
      await fetchMyGroups();
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to join via QR', e?.message || e);
        errorLogCountRef.current++;
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const openCreateGroupAnnDialog = () => {
    setGaTitle('');
    setGaDesc('');
    setGaFiles([]);
    setGaPollOpen(false);
    setGaPollQuestion('');
    setGaPollOptions(['', '']);
    setGaAllowMultiple(false);
    setCreateGroupAnnOpen(true);
  };

  const handleGaFilesChange = (e) => {
    setGaFiles(Array.from(e.target.files || []));
  };

  const submitGroupAnnouncement = async () => {
    try {
      if (!selectedGroupId) return;
      const formData = new FormData();
      formData.append('title', gaTitle);
      formData.append('description', gaDesc);
      formData.append('groupId', selectedGroupId);
      gaFiles.forEach(f => formData.append('files', f));

      if (gaPollOpen && gaPollQuestion && gaPollOptions.filter(o => o.trim()).length >= 2) {
        const pollData = {
          question: gaPollQuestion,
          options: gaPollOptions.filter(o => o.trim()),
          allowMultipleAnswers: gaAllowMultiple
        };
        formData.append('poll', JSON.stringify(pollData));
      }

      const resp = await api.post('/announcements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCreateGroupAnnOpen(false);
      setGaTitle('');
      setGaDesc('');
      setGaFiles([]);
      setGaPollOpen(false);
      setGaPollQuestion('');
      setGaPollOptions(['', '']);
      setAnnouncements(prev => [resp.data.announcement, ...prev]);
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to create group announcement', e?.message || e);
        errorLogCountRef.current++;
      }
    }
  };

  const openSelectedGroupInfo = async () => {
    try {
      if (!selectedGroupId) return;
      const resp = await api.get(`/groups/${selectedGroupId}`);
      const g = resp.data?.group;
      if (g) {
        setGroupInfo(g);
        await fetchGroupChat(g._id);
      }
    } catch (e) {
      if (errorLogCountRef.current < 2) {
        console.error('Failed to open selected group', e?.message || e);
        errorLogCountRef.current++;
      }
    }
  };

  const [muteMenuAnchor, setMuteMenuAnchor] = useState(null);

  const handleToggleMute = (event) => {
    if (isGroupMuted()) {
      // Unmute directly
      handleMuteSelect(null, true);
    } else {
      // Open menu
      setMuteMenuAnchor(event.currentTarget);
    }
  };

  const isGroupMuted = () => {
    try {
      const gid = groupInfo?._id || selectedGroupId;
      if (!gid) return false;
      const mutedChats = Array.isArray(user?.mutedChats) ? user.mutedChats : [];
      const entry = mutedChats.find(m => m && m.chatId === gid);
      if (!entry) return false;
      if (entry.muteUntil === undefined) return false;
      if (entry.muteUntil === null) return true;
      const untilMs = new Date(entry.muteUntil).getTime();
      return Number.isFinite(untilMs) ? (Date.now() < untilMs) : false;
    } catch (_) {
      return false;
    }
  };

  const handleMuteSelect = async (duration, isUnmuting = false) => {
    setMuteMenuAnchor(null);
    try {
      const gid = groupInfo?._id || selectedGroupId;
      if (!gid) return;

      let muteUntil = null;
      if (isUnmuting) {
        muteUntil = undefined;
      } else if (duration) {
        const d = new Date();
        d.setTime(d.getTime() + duration);
        muteUntil = d.toISOString();
      } else {
        // Forever
        muteUntil = null;
      }

      // Optimistic update
      const chatId = gid;
      let newMutedChats = [...(user.mutedChats || [])];

      if (isUnmuting) {
        newMutedChats = newMutedChats.filter(m => m.chatId !== chatId);
      } else {
        // Remove existing if any
        newMutedChats = newMutedChats.filter(m => m.chatId !== chatId);
        newMutedChats.push({ chatId, muteUntil });
      }

      updateUser({ mutedChats: newMutedChats });

      // API call
      await api.post('/users/toggle-mute', { chatId, muteUntil });
    } catch (e) {
      console.error('Failed to toggle mute', e);
    }
  };

  const handleCreatePoll = async () => {
    try {
      const gid = groupInfo?._id || selectedGroupId;
      if (!gid) return;
      if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;

      await api.post('/group-messages/poll', {
        groupId: gid,
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim()),
        allowMultipleAnswers
      });

      setPollDialogOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setAllowMultipleAnswers(false);
    } catch (e) {
      console.error('Failed to create poll', e?.response?.data || e?.message || e);
    }
  };

  const handleVote = async (messageId, optionIndex) => {
    try {
      const myId = user?._id;
      setGroupChatMessages(prev => prev.map(m => {
        if (m._id === messageId && m.poll && Array.isArray(m.poll.options)) {
          const allowMultiple = !!m.poll.allowMultipleAnswers;
          const updatedOptions = m.poll.options.map((opt, i) => {
            let votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
            const hasVote = votes.includes(myId);
            if (i === optionIndex) {
              if (hasVote) {
                votes = votes.filter(v => v !== myId);
              } else if (myId) {
                votes.push(myId);
              }
            } else if (!allowMultiple) {
              votes = votes.filter(v => v !== myId);
            }
            return { ...opt, votes };
          });
          return { ...m, poll: { ...m.poll, options: updatedOptions } };
        }
        return m;
      }));
      await api.post(`/group-messages/${messageId}/vote`, { optionIndex, groupId: groupInfo?._id || selectedGroupId });
    } catch (e) {
      console.error('Failed to vote', e);
    }
  };

  const handleReaction = async (emoji) => {
    try {
      if (selectedMessageForReaction) {
        await api.post(`/group-messages/${selectedMessageForReaction}/reaction`, { emoji });
        setSelectedMessageForReaction(null);
      } else if (selectedAnnouncementForReaction) {
        await api.post(`/announcements/${selectedAnnouncementForReaction}/reaction`, { emoji });
        setSelectedAnnouncementForReaction(null);
      }
      setReactionAnchorEl(null);
    } catch (e) {
      console.error('Failed to react', e);
    }
  };

  const handleAnnouncementVote = async (announcementId, optionIndex) => {
    try {
      const myId = user?._id;
      setAnnouncements(prev => prev.map(a => {
        if (a._id === announcementId && a.poll && Array.isArray(a.poll.options)) {
          const allowMultiple = !!a.poll.allowMultipleAnswers;
          const updatedOptions = a.poll.options.map((opt, i) => {
            let votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
            const hasVote = votes.includes(myId);
            if (i === optionIndex) {
              if (hasVote) {
                votes = votes.filter(v => v !== myId);
              } else if (myId) {
                votes.push(myId);
              }
            } else if (!allowMultiple) {
              votes = votes.filter(v => v !== myId);
            }
            return { ...opt, votes };
          });
          return { ...a, poll: { ...a.poll, options: updatedOptions } };
        }
        return a;
      }));
      await api.post(`/announcements/${announcementId}/vote`, { optionIndex });
    } catch (e) {
      console.error('Failed to vote on announcement', e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Add CSS styles */}
      <style>{styles}</style>

      <Container maxWidth="lg">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <Box sx={{ mb: 4, mt: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Announcements
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Stay updated with the latest announcements from your department
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Tabs value={feedTab} onChange={(e, v) => setFeedTab(v)} textColor="primary" indicatorColor="primary">
                <Tab label="All" />
                <Tab label="Global" />
                <Tab label="Group" />
              </Tabs>
            </Box>
          </Box>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <Card sx={{ mb: 3, borderRadius: 3, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search announcements"
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={filter}
                    label="Filter"
                    onChange={(e) => setFilter(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <FilterList />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <Sort />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="newest">Newest First</MenuItem>
                    <MenuItem value="oldest">Oldest First</MenuItem>
                    <MenuItem value="popular">Most Popular</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>
        </motion.div>

        {/* Teacher Sections and Groups */}
        {user.role === 'teacher' && (Array.isArray(user.section) || typeof user.section === 'string') && (
          <Card sx={{ mb: 3, borderRadius: 3, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              Your Sections
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {(Array.isArray(user.section) ? user.section : [user.section]).map(sec => (
                <Chip
                  key={sec}
                  label={sec}
                  color={selectedSection === sec ? 'primary' : 'default'}
                  onClick={() => { setSelectedSection(sec); fetchGroups(sec); }}
                />
              ))}
            </Box>
            {selectedSection && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Groups in {selectedSection}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => setShowCreateGroup(true)}>
                  Create Subject Group
                </Button>
              </Box>
            )}
            {selectedSection && (
              <List>
                {groups.map(g => (
                  <ListItem key={g._id} button onClick={() => openGroupInfo(g)}>
                    <ListItemAvatar>
                      <Avatar>
                        <Groups />
                      </Avatar>
                    </ListItemAvatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {g.subject || g.groupName} {g.section ? `— ${g.section}` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Teacher: {user.name}
                      </Typography>
                    </Box>
                    <Chip label={`Students: ${g.studentIds?.length || 0}`} size="small" />
                  </ListItem>
                ))}
                {groups.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No groups yet in this section.
                  </Typography>
                )}
              </List>
            )}
          </Card>
        )}

        {/* Create Group Announcement Dialog */}
        {createGroupAnnOpen && (
          <Dialog open={createGroupAnnOpen} onClose={() => setCreateGroupAnnOpen(false)}>
            <DialogContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Create Group Announcement</Typography>
              <TextField
                label="Title"
                fullWidth
                value={gaTitle}
                onChange={(e) => setGaTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={2}
                value={gaDesc}
                onChange={(e) => setGaDesc(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Button variant="outlined" component="label">
                  Attach Files
                  <input hidden type="file" multiple onChange={handleGaFilesChange} />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {gaFiles.length} file(s) selected
                </Typography>
              </Box>
              <Button onClick={() => setGaPollOpen(!gaPollOpen)} startIcon={<Poll />}>
                {gaPollOpen ? 'Remove Poll' : 'Add Poll'}
              </Button>
              {gaPollOpen && (
                <Box sx={{ mt: 2, border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
                  <TextField
                    label="Question"
                    fullWidth
                    value={gaPollQuestion}
                    onChange={(e) => setGaPollQuestion(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  {gaPollOptions.map((opt, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        label={`Option ${i + 1}`}
                        fullWidth
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...gaPollOptions];
                          newOpts[i] = e.target.value;
                          setGaPollOptions(newOpts);
                        }}
                      />
                      {gaPollOptions.length > 2 && (
                        <IconButton
                          onClick={() => {
                            const newOpts = gaPollOptions.filter((_, idx) => idx !== i);
                            setGaPollOptions(newOpts);
                          }}
                        >
                          <Close />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button onClick={() => setGaPollOptions([...gaPollOptions, ''])}>Add Option</Button>
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={() => setGaAllowMultiple(!gaAllowMultiple)}>
                      {gaAllowMultiple ? <CheckCircle color="primary" /> : <RadioButtonUnchecked />}
                    </IconButton>
                    <Typography>Allow multiple answers</Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreateGroupAnnOpen(false)}>Cancel</Button>
              <Button variant="contained" disabled={!gaTitle || !selectedGroupId} onClick={submitGroupAnnouncement}>
                Post
              </Button>
            </DialogActions>
          </Dialog>
        )}
        {/* Student Join Group */}
        {user.role === 'student' && (
          <Card sx={{ mb: 3, borderRadius: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Join Subject Group
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use QR scanner or enter a join code
                </Typography>
              </Box>
              <Button variant="contained" onClick={openJoinDialog}>
                Join Group
              </Button>
            </Box>
          </Card>
        )}

        {/* Join Group Dialog */}
        {joinDialogOpen && (
          <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
            <DialogContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Join Group</Typography>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Scan QR
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                <Button variant="outlined" component="label">
                  Open Camera / Upload
                  <input hidden type="file" accept="image/*" capture="environment" onChange={handleJoinQRFileChange} />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {joinQRFile ? (joinQRFile.name || 'Selected') : 'No file selected'}
                </Typography>
                <Button variant="contained" disabled={!joinQRFile || joinLoading} onClick={decodeAndJoinFromQR}>
                  {joinLoading ? 'Joining...' : 'Scan & Join'}
                </Button>
              </Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Or enter join code
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <Button variant="contained" disabled={!joinCode || joinLoading} onClick={handleJoinByCode}>
                  {joinLoading ? 'Joining...' : 'Join'}
                </Button>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setJoinDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Group tab controls */}
        {feedTab === 2 && (
          <Card sx={{ mb: 3, borderRadius: 3, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              Group Announcements
            </Typography>
            {user.role === 'student' ? (
              <List>
                {myGroups.map(g => {
                  const s = groupSummaries[g._id] || null;
                  const last = s && s.lastMessage ? s.lastMessage : null;
                  const unread = s && typeof s.unreadCount === 'number' ? s.unreadCount : 0;
                  const info = groupInfoMap[g._id] || g;
                  const teacherName = info?.teacherId?.name || '';
                  const ts = last && last.createdAt ? new Date(last.createdAt).toLocaleString() : '';
                  const preview = last ? (last.content || (last.hasFiles ? 'Attachment' : '')) : '';
                  return (
                    <ListItem key={g._id} button onClick={() => openGroupInfo(g)}>
                      <ListItemAvatar>
                        <Badge badgeContent={unread} color="primary">
                          <Avatar>
                            <Groups />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {g.subject || g.groupName} {g.section ? `— ${g.section}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {teacherName ? `Teacher: ${teacherName}` : 'Teacher'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {preview}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {ts}
                      </Typography>
                    </ListItem>
                  );
                })}
                {myGroups.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No groups joined yet.
                  </Typography>
                )}
              </List>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="group-select-label">Select Group</InputLabel>
                  <Select
                    labelId="group-select-label"
                    value={selectedGroupId}
                    label="Select Group"
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    {myGroups.map(g => (
                      <MenuItem key={g._id} value={g._id}>{g.subject || g.groupName} {g.section ? `— ${g.section}` : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {(user.role === 'teacher' || user.role === 'admin') && (
                  <Button variant="contained" disabled={!selectedGroupId} onClick={openCreateGroupAnnDialog}>
                    Create Group Announcement
                  </Button>
                )}
              </Box>
            )}
          </Card>
        )}

        {/* Create Group Dialog */}
        {showCreateGroup && (
          <Dialog open={showCreateGroup} onClose={() => setShowCreateGroup(false)}>
            <DialogContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Create Subject Group</Typography>
              <TextField
                label="Subject name"
                fullWidth
                value={newGroupSubject}
                onChange={(e) => setNewGroupSubject(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Teacher"
                fullWidth
                value={user.name}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Section"
                fullWidth
                value={selectedSection || ''}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCreateGroup(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateGroup} disabled={!newGroupSubject || !selectedSection}>
                Create
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Group Info with QR Code */}
        {groupInfo && (
          <Dialog open={Boolean(groupInfo)} onClose={() => setGroupInfo(null)} fullWidth maxWidth="md" fullScreen={isMobile()}>
            <DialogContent sx={{ p: 0 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    onClick={() => setMediaGalleryOpen(true)}
                    sx={{ color: 'primary.contrastText' }}
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    <PermMedia />
                  </IconButton>
                  <IconButton
                    onClick={handleToggleMute}
                    sx={{ color: 'primary.contrastText' }}
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    {isGroupMuted() ? <NotificationsOff /> : <Notifications />}
                  </IconButton>
                  <IconButton
                    onClick={(e) => setQrAnchorEl(e.currentTarget)}
                    sx={{ color: 'primary.contrastText' }}
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    <MoreVert />
                  </IconButton>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <Groups />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {groupInfo.subject || groupInfo.groupName} {groupInfo.section ? `— ${groupInfo.section}` : ''}
                    </Typography>
                    <Typography variant="caption">
                      {groupInfo?.teacherId?.name ? `Teacher: ${groupInfo.teacherId.name}` : ''}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Popover
                open={Boolean(qrAnchorEl)}
                anchorEl={qrAnchorEl}
                onClose={() => setQrAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, width: { xs: '90vw', sm: 320 } }}>
                  {(() => {
                    const apiBase = new URL(api.defaults.baseURL);
                    const baseOrigin = apiBase.origin;
                    const joinUrl = `${baseOrigin}/api/groups/join/${groupInfo.qrToken}`;
                    return (
                      <img
                        alt="Group QR"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`}
                        style={{ display: 'block', margin: '0 auto' }}
                      />
                    );
                  })()}
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={groupInfo.qrToken}
                      InputProps={{ readOnly: true }}
                      label="Join Code"
                    />
                    <IconButton
                      size="small"
                      onClick={() => { try { navigator.clipboard.writeText(groupInfo.qrToken); } catch (_) { } }}
                      color="primary"
                    >
                      <ContentCopy />
                    </IconButton>
                  </Box>
                </Box>
              </Popover>
              <Menu
                anchorEl={muteMenuAnchor}
                open={Boolean(muteMenuAnchor)}
                onClose={() => setMuteMenuAnchor(null)}
              >
                <MenuItem onClick={() => handleMuteSelect(8 * 60 * 60 * 1000)}>8 Hours</MenuItem>
                <MenuItem onClick={() => handleMuteSelect(24 * 60 * 60 * 1000)}>1 Day</MenuItem>
                <MenuItem onClick={() => handleMuteSelect(7 * 24 * 60 * 60 * 1000)}>1 Week</MenuItem>
                <MenuItem onClick={() => handleMuteSelect(null)}>Always</MenuItem>
              </Menu>
              <Box sx={{ display: 'none', justifyContent: 'center', mb: 2 }}>
                {(() => {
                  const apiBase = new URL(api.defaults.baseURL);
                  const baseOrigin = apiBase.origin;
                  const joinUrl = `${baseOrigin}/api/groups/join/${groupInfo.qrToken}`;
                  return (
                    <img
                      alt="Group QR"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`}
                    />
                  );
                })()}
              </Box>
              <Box sx={{ display: 'none', mb: 3, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Students: Scan the QR or use the join code.
                </Typography>
                <Chip label={`Join Code: ${groupInfo.qrToken}`} color="primary" sx={{ mt: 1 }} />
              </Box>
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Group Chat
                </Typography>
                <Box sx={{ maxHeight: { xs: '62vh', sm: '65vh' }, overflowY: 'auto', mb: 2, px: 1 }} ref={groupChatScrollRef}>
                  {groupChatLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={32} />
                    </Box>
                  ) : (
                    groupChatMessages.map((msg, idx) => {
                      const myId = String(user?._id || user?.id || '');
                      const senderId = String(msg?.sender?._id || msg?.sender || '');
                      const isOwn = myId && senderId && senderId === myId;
                      return (
                        <Box
                          key={msg._id || idx}
                          sx={{
                            display: 'flex',
                            justifyContent: isOwn ? 'flex-end' : 'flex-start',
                            mb: 1
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedGroupMessage(msg);
                            setGroupActionMenuPos({ x: e.clientX, y: e.clientY });
                            setGroupActionMenuOpen(true);
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '72%',
                              px: 1.5, py: 1,
                              borderRadius: 2,
                              bgcolor: isOwn ? 'primary.main' : 'background.paper',
                              color: isOwn ? 'primary.contrastText' : 'text.primary',
                              boxShadow: 1,
                              position: 'relative',
                              userSelect: 'none',
                              WebkitUserSelect: 'none'
                            }}
                            ref={(el) => addTouchHandlers(el, msg)}
                          >
                            {msg.type === 'poll' && msg.poll ? (
                              <Box sx={{ minWidth: 200 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                  {msg.poll.question}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                                  {msg.poll.allowMultipleAnswers ? 'Multiple answers allowed' : 'Single answer'}
                                </Typography>
                                {msg.poll.options.map((opt, optIdx) => {
                                  const totalVotes = msg.poll.options.reduce((acc, o) => acc + (o.votes?.length || 0), 0);
                                  const voteCount = opt.votes?.length || 0;
                                  const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                  const hasVoted = opt.votes?.includes(user?._id);

                                  return (
                                    <Box key={optIdx} sx={{ mb: 1, cursor: 'pointer' }} onClick={() => handleVote(msg._id, optIdx)}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: hasVoted ? 'bold' : 'normal' }}>
                                          {opt.text}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {voteCount} ({percentage}%)
                                        </Typography>
                                      </Box>
                                      <Box sx={{ width: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 1, height: 6, overflow: 'hidden' }}>
                                        <Box sx={{ width: `${percentage}%`, bgcolor: 'primary.main', height: '100%' }} />
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : (
                              <>
                                {msg.content && (
                                  <Typography variant="body2" sx={{ mb: (msg.files && msg.files.length > 0) ? 1 : 0 }}>
                                    {msg.content}
                                  </Typography>
                                )}
                                {Array.isArray(msg.files) && msg.files.length > 0 && (
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {msg.files.map((file, i) => {
                                      const id = file.publicId || file.url;
                                      const opened = isOpened(id);
                                      const label = `${file.fileName || `File ${i + 1}`} (${(file.fileSize ? (file.fileSize / 1024).toFixed(1) : '0')} KB)`;
                                      return (
                                        <Chip
                                          key={i}
                                          icon={getFileIcon(file.fileType)}
                                          label={label}
                                          onClick={() => handleAttachmentClick(file)}
                                          onDelete={() => handleDownload(file, file.fileName)}
                                          deleteIcon={<Download />}
                                          variant={opened ? 'filled' : 'outlined'}
                                          color={opened ? 'success' : (isOwn ? 'default' : 'primary')}
                                        />
                                      );
                                    })}
                                  </Box>
                                )}
                              </>
                            )}

                            {/* Reactions Display */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                {Object.entries(
                                  msg.reactions.reduce((acc, r) => {
                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                    return acc;
                                  }, {})
                                ).map(([emoji, count]) => (
                                  <Chip
                                    key={emoji}
                                    label={`${emoji} ${count}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.75rem', bgcolor: 'background.paper' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReaction(emoji); // Toggle if clicked? Or just show who reacted?
                                    }}
                                  />
                                ))}
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                  {(msg?.sender?.name) ? msg.sender.name : (isOwn ? 'You' : '')}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem' }}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                                {isOwn && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                                    {(msg.isReadBy && msg.isReadBy.length > 0) ? (
                                      <>
                                        <Check fontSize="inherit" sx={{ color: 'success.main', width: 14, height: 14 }} />
                                        <Check fontSize="inherit" sx={{ color: 'success.main', width: 14, height: 14, ml: '-8px' }} />
                                      </>
                                    ) : (msg.deliveredTo && msg.deliveredTo.length > 0) ? (
                                      <>
                                        <Check fontSize="inherit" sx={{ color: 'text.secondary', width: 14, height: 14 }} />
                                        <Check fontSize="inherit" sx={{ color: 'text.secondary', width: 14, height: 14, ml: '-8px' }} />
                                      </>
                                    ) : (
                                      <Check fontSize="inherit" sx={{ color: 'text.secondary', width: 14, height: 14 }} />
                                    )}
                                  </Box>
                                )}
                              </Box>
                              <IconButton
                                size="small"
                                sx={{ p: 0.5, ml: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                                onClick={(e) => {
                                  setReactionAnchorEl(e.currentTarget);
                                  setSelectedMessageForReaction(msg._id);
                                }}
                              >
                                <AddReaction fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
                {groupChatFiles.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, px: 1 }}>
                    {groupChatFiles.map((f, i) => (
                      <Chip
                        key={i}
                        label={f.name}
                        size="small"
                        onDelete={() => {
                          const newFiles = [...groupChatFiles];
                          newFiles.splice(i, 1);
                          setGroupChatFiles(newFiles);
                          if (newFiles.length === 0 && fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <IconButton
                    onClick={() => setScheduleModalOpen(true)}
                    color="primary"
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    <Schedule />
                  </IconButton>
                  <IconButton
                    onClick={() => setPollDialogOpen(true)}
                    color="primary"
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    <Poll />
                  </IconButton>
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    color="primary"
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    <AttachFile />
                  </IconButton>
                  <input hidden type="file" multiple ref={fileInputRef} onChange={handleGroupChatFilesChange} />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message"
                    value={groupChatInput}
                    onChange={(e) => {
                      setGroupChatInput(e.target.value);
                      if (socketRef.current && groupInfo) {
                        socketRef.current.emit('groupTyping', {
                          groupId: groupInfo._id,
                          userId: user._id,
                          userName: user.name,
                          isTyping: true
                        });

                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          socketRef.current.emit('groupTyping', {
                            groupId: groupInfo._id,
                            userId: user._id,
                            userName: user.name,
                            isTyping: false
                          });
                        }, 2000);
                      }
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendGroupChatMessage}
                    size={isMobile() ? 'medium' : 'small'}
                  >
                    <Send />
                  </IconButton>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGroupInfo(null)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Reaction Popover */}
        <Popover
          open={Boolean(reactionAnchorEl)}
          anchorEl={reactionAnchorEl}
          onClose={() => {
            setReactionAnchorEl(null);
            setSelectedMessageForReaction(null);
            setSelectedAnnouncementForReaction(null);
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <IconButton key={emoji} onClick={() => handleReaction(emoji)}>
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Popover>

        <Popover
          open={groupActionMenuOpen}
          onClose={() => {
            setGroupActionMenuOpen(false);
            setSelectedGroupMessage(null);
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ top: groupActionMenuPos.y, left: groupActionMenuPos.x }}
        >
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', minWidth: 220, bgcolor: 'background.paper', color: 'text.primary' }}>
            <Button sx={{ color: 'text.primary' }} onClick={() => {
              if (selectedGroupMessage?.content) {
                const quoted = `> ${selectedGroupMessage.content}\n`;
                setGroupChatInput(prev => `${quoted}${prev || ''}`);
              }
              setGroupActionMenuOpen(false);
            }}>Reply</Button>
            <Button sx={{ color: 'text.primary' }} onClick={() => {
              setGroupActionMenuOpen(false);
              navigate('/personal-messages', { state: { forwardingMessage: selectedGroupMessage } });
            }}>Forward</Button>
            <Button sx={{ color: 'text.primary' }} onClick={() => {
              if (selectedGroupMessage?.content) {
                navigator.clipboard?.writeText(selectedGroupMessage.content).catch(() => { });
              }
              setGroupActionMenuOpen(false);
            }}>Copy</Button>
            <Button sx={{ color: 'error.main' }} onClick={async () => {
              try {
                await api.delete(`/group-messages/${selectedGroupMessage._id}`);
              } catch (_) { }
              setGroupActionMenuOpen(false);
            }}>Delete</Button>
            <Button sx={{ color: 'text.primary' }} onClick={async () => {
              try {
                const pin = !selectedGroupMessage?.isPinned;
                const resp = await api.patch(`/group-messages/${selectedGroupMessage._id}/pin`, { pin });
                const updated = resp?.data?.data;
                if (updated) {
                  setGroupChatMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
                }
              } catch (_) { }
              setGroupActionMenuOpen(false);
            }}>{selectedGroupMessage?.isPinned ? 'Unpin' : 'Pin'}</Button>
            <Button sx={{ color: 'text.primary' }} onClick={async () => {
              try {
                const resp = await api.patch(`/group-messages/${selectedGroupMessage._id}/star`);
                const updated = resp?.data?.data;
                if (updated) {
                  setGroupChatMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
                }
              } catch (_) { }
              setGroupActionMenuOpen(false);
            }}>{(selectedGroupMessage?.isStarredBy || []).includes(user?._id) ? 'Unstar' : 'Star'}</Button>
            <Button sx={{ color: 'text.primary' }} onClick={handleGroupMessageInfo}>Info</Button>
          </Box>
        </Popover>

        <Dialog open={groupInfoDialogOpen} onClose={() => setGroupInfoDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Message Info</Typography>
            {messageInfo ? (
              <List>
                <ListItem>
                  <ListItemText
                    primary="Read by"
                    secondary={`${messageInfo.readBy?.length || 0} participants`}
                  />
                </ListItem>
                <Divider />
                {messageInfo.readBy?.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar src={item?.user?.avatar} alt={item?.user?.name}>
                        {(item?.user?.name || '').charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item?.user?.name || 'Unknown'}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CheckCircle fontSize="small" color="primary" sx={{ width: 16, height: 16 }} />
                          {new Date(item.readAt).toLocaleString()}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
                {(!messageInfo.readBy || messageInfo.readBy.length === 0) && (
                  <ListItem>
                    <ListItemText secondary="No one has read this message yet" />
                  </ListItem>
                )}
              </List>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupInfoDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Create Poll Dialog */}
        <Dialog open={pollDialogOpen} onClose={() => setPollDialogOpen(false)}>
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Create Poll</Typography>
            <TextField
              label="Question"
              fullWidth
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              sx={{ mb: 2 }}
            />
            {pollOptions.map((opt, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label={`Option ${i + 1}`}
                  fullWidth
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                />
                {pollOptions.length > 2 && (
                  <IconButton onClick={() => {
                    const newOpts = pollOptions.filter((_, idx) => idx !== i);
                    setPollOptions(newOpts);
                  }}>
                    <Close />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button onClick={() => setPollOptions([...pollOptions, ''])}>Add Option</Button>
            <Box sx={{ mt: 2 }}>
              <FormControl component="fieldset">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={() => setAllowMultipleAnswers(!allowMultipleAnswers)}>
                    {allowMultipleAnswers ? <CheckCircle color="primary" /> : <RadioButtonUnchecked />}
                  </IconButton>
                  <Typography>Allow Multiple Answers</Typography>
                </Box>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPollDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreatePoll} disabled={!pollQuestion || pollOptions.filter(o => o).length < 2}>
              Create
            </Button>
          </DialogActions>
        </Dialog>

        <MediaGallery
          open={mediaGalleryOpen}
          onClose={() => setMediaGalleryOpen(false)}
          messages={groupChatMessages}
          title={groupInfo ? `Media in ${groupInfo.subject}` : 'Media Gallery'}
        />

        <ScheduleMessageModal
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          type="group"
          groupId={groupInfo?._id}
          onScheduleCreated={() => {
            setScheduleModalOpen(false);
            alert('Message scheduled successfully');
          }}
        />

        {/* Announcements List */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          </motion.div>
        ) : filteredAnnouncements.length === 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {feedTab === 2 && selectedGroupId ? (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Announcement sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    No announcements in this group yet
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                    <Button variant="contained" onClick={openSelectedGroupInfo}>
                      Open Group Info & Chat
                    </Button>
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <Button variant="outlined" onClick={openCreateGroupAnnDialog}>
                        Create Group Announcement
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <Announcement sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No announcements found
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    There are no announcements matching your criteria.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : (
          <>
            <Grid container spacing={3} component={motion.div} layout>
              <AnimatePresence>
                {filteredAnnouncements.map((announcement, index) => (
                  <Grid item xs={12} key={announcement._id} component={motion.div} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }} transition={{ duration: 0.4, delay: index * 0.05 }}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          borderRadius: 3,
                          overflow: 'hidden',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s ease',
                          // Highlight new announcements
                          ...(isNewAnnouncement(announcement.createdAt) && {
                            border: '2px solid #4caf50',
                            animation: 'pulse 2s infinite'
                          }),
                          // Highlight pinned announcements
                          ...(announcement.isPinned && {
                            backgroundColor: 'rgba(255, 193, 7, 0.1)'
                          })
                        }}
                      >
                        <Box sx={{ p: 3, flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                {announcement.title}
                                {announcement.isPinned && (
                                  <PushPin sx={{ fontSize: '1rem', color: '#ff9800' }} />
                                )}
                                {isNewAnnouncement(announcement.createdAt) && (
                                  <Chip
                                    label="NEW"
                                    size="small"
                                    sx={{
                                      backgroundColor: '#4caf50',
                                      color: 'white',
                                      fontWeight: 'bold',
                                      animation: 'pulse 1.5s infinite'
                                    }}
                                  />
                                )}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                {feedTab !== 2 && (
                                  <>
                                    <Chip
                                      icon={<Person />}
                                      label={announcement.postedBy.name}
                                      size="small"
                                      variant="outlined"
                                    />
                                    <Chip
                                      icon={<CalendarToday />}
                                      label={new Date(announcement.createdAt).toLocaleDateString()}
                                      size="small"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={announcement.section}
                                      size="small"
                                      color="primary"
                                      variant="filled"
                                    />
                                    {announcement.isGlobal && (
                                      <Chip
                                        icon={<Public />}
                                        label="GLOBAL"
                                        size="small"
                                        sx={{ backgroundColor: '#9c27b0', color: 'white' }}
                                      />
                                    )}
                                    {announcement.expiryDate && (
                                      <Chip
                                        icon={<Event />}
                                        label={`Expires: ${new Date(announcement.expiryDate).toLocaleDateString()}`}
                                        size="small"
                                        sx={{ backgroundColor: '#f44336', color: 'white' }}
                                      />
                                    )}
                                  </>
                                )}
                              </Box>
                            </Box>
                          </Box>

                          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                            {announcement.description}
                          </Typography>

                          {announcement.files && announcement.files.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Attachment /> Attachments ({announcement.files.length})
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {announcement.files.map((file, index) => {
                                  const id = file.publicId || file.url;
                                  const opened = isOpened(id);
                                  const label = file.fileName || `File ${index + 1}`;
                                  return (
                                    <Chip
                                      key={index}
                                      icon={getFileIcon(file.fileType)}
                                      label={label}
                                      onClick={() => handleAttachmentClick(file)}
                                      onDelete={() => handleDownload(file, file.fileName)}
                                      deleteIcon={<Download />}
                                      variant={opened ? 'filled' : 'outlined'}
                                      color={opened ? 'success' : 'default'}
                                      sx={{ mb: 1, cursor: 'pointer' }}
                                    />
                                  );
                                })}
                              </Box>
                            </Box>
                          )}

                          {/* Poll Section for Announcement */}
                          {announcement.poll && announcement.poll.question && (
                            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                                {announcement.poll.question}
                                {announcement.poll.allowMultipleAnswers && <Chip label="Multiple Choice" size="small" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />}
                              </Typography>
                              {announcement.poll.options.map((opt, i) => {
                                const totalVotes = announcement.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
                                const voteCount = opt.votes?.length || 0;
                                const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                const hasVoted = opt.votes?.includes(user._id);
                                const allowMultiple = !!announcement.poll.allowMultipleAnswers;

                                return (
                                  <Box key={i} sx={{ mb: 1 }}>
                                    <Box
                                      onClick={() => handleAnnouncementVote(announcement._id, i)}
                                      sx={{
                                        p: 1,
                                        border: '1px solid',
                                        borderColor: hasVoted ? 'primary.main' : 'divider',
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        bgcolor: hasVoted ? 'primary.light' : 'transparent',
                                        '&:hover': { bgcolor: 'action.hover' }
                                      }}
                                    >
                                      <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percent}%`, bgcolor: 'action.selected' }} />
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {hasVoted ? (
                                              <CheckCircle fontSize="inherit" />
                                            ) : (
                                              <RadioButtonUnchecked fontSize="inherit" />
                                            )}
                                          </Box>
                                          <Typography variant="body2">{opt.text}</Typography>
                                        </Box>
                                        <Typography variant="caption">{voteCount} ({percent}%)</Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          )}

                          {/* Reactions Section for Announcement */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setReactionAnchorEl(e.currentTarget);
                                setSelectedAnnouncementForReaction(announcement._id);
                              }}
                            >
                              <AddReaction fontSize="small" />
                            </IconButton>

                            {Object.entries(
                              (announcement.reactions || []).reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]) => (
                              <Chip
                                key={emoji}
                                label={`${emoji} ${count}`}
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  // Toggle reaction directly if clicking on existing one
                                  handleReaction(emoji);
                                  setSelectedAnnouncementForReaction(announcement._id);
                                  // Note: The handleReaction logic uses state, so we need to set state first then call API, 
                                  // but handleReaction reads state. 
                                  // Better to just set state and open popover or implement direct toggle.
                                  // For now, let's just open popover or do nothing on click.
                                  // Actually, let's make it toggle reaction:
                                  api.post(`/announcements/${announcement._id}/reaction`, { emoji })
                                    .catch(e => console.error(e));
                                }}
                                sx={{ cursor: 'pointer', borderColor: 'transparent', bgcolor: 'action.hover' }}
                              />
                            ))}
                          </Box>

                        </Box>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </motion.div>
            )}
          </>
        )}
      </Container>
    </motion.div>
  );
};

export default Announcements;
