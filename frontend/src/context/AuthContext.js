import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../services/api';
import io from 'socket.io-client';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    // Check if user is logged in
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      // Initialize socket connection
      initializeSocket(storedToken);
    }
    
    setLoading(false);
    
    // Clean up socket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const initializeSocket = (token) => {
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Create new socket connection
    const socketUrl = (process.env.REACT_APP_API_URL || 'https://university-annoucement-system.onrender.com').replace('/api', '');
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token
      }
    });
    
    // Helper to check if chat is muted
    const isMuted = (chatId) => {
      const u = JSON.parse(localStorage.getItem('user'));
      if (!u || !u.mutedChats) return false;
      return u.mutedChats.some(m => {
        if (m.chatId !== chatId) return false;
        if (!m.muteUntil) return true; // Muted forever
        return new Date(m.muteUntil) > new Date();
      });
    };

    // Listen for new announcements
    socketRef.current.on('newAnnouncement', (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'new_announcement',
        message: `New announcement: ${data.announcement.title}`,
        timestamp: new Date(),
        read: false,
        data: data.announcement
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    
    // Listen for deleted announcements
    socketRef.current.on('deleteAnnouncement', (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'deleted_announcement',
        message: 'An announcement has been deleted',
        timestamp: new Date(),
        read: false,
        data
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Listen for new personal messages
    socketRef.current.on('newPersonalMessage', (data) => {
      const msg = data.message;
      const senderId = msg.sender._id || msg.sender;
      
      // Check if muted
      if (isMuted(senderId)) return;

      // Don't notify if we are on the messaging page with this user (handled by component)
      // But for global context, we might still want to track unread count? 
      // For now, let's add a notification toast.
      
      const newNotification = {
        id: Date.now(),
        type: 'new_personal_message',
        message: `New message from ${msg.sender.name}`,
        timestamp: new Date(),
        read: false,
        data: msg
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Listen for new group messages
    socketRef.current.on('newGroupMessage', (data) => {
      const msg = data.message;
      const groupId = msg.groupId;
      
      // Check if muted
      if (isMuted(groupId)) return;

      const newNotification = {
        id: Date.now(),
        type: 'new_group_message',
        message: `New group message`,
        timestamp: new Date(),
        read: false,
        data: msg
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    
    // Listen for new admin messages
    socketRef.current.on('newAdminMessage', (data) => {
      const msg = data.message;
      
      // Admin messages are important, usually not muted, but let's check if we want to support muting admins?
      // Probably not.
      
      const newNotification = {
        id: Date.now(),
        type: 'new_admin_message',
        message: `New admin message`,
        timestamp: new Date(),
        read: false,
        data: msg
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  };

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    // Set default authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    // Initialize socket connection
    initializeSocket(authToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    // Remove default authorization header
    delete api.defaults.headers.common['Authorization'];
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    loading,
    notifications,
    unreadCount,
    setUnreadCount,
    setNotifications,
    socketRef
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
