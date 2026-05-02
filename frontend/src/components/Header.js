import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem,
  Box, Avatar, Badge, Tooltip, Divider, ListItemIcon, ListItemText,
  useTheme, useMediaQuery, Drawer, List, ListItem,
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Brightness4, Brightness7, AccountCircle, Notifications,
  Home, Dashboard, School, Work, AdminPanelSettings, Announcement,
  Delete, Person, Logout, Menu as MenuIcon, Close, Message,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ toggleDarkMode, darkMode }) => {
  const { user, logout, unreadCount, notifications, setUnreadCount, setNotifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleNotifMenu = (e) => { setNotifAnchorEl(e.currentTarget); setUnreadCount(0); };
  const handleNotifClose = () => setNotifAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); handleClose(); };
  const clearNotifications = () => { setNotifications([]); setUnreadCount(0); handleNotifClose(); };

  const formatTime = (ts) => {
    const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin': return <AdminPanelSettings sx={{ fontSize: 16 }} />;
      case 'teacher': return <Work sx={{ fontSize: 16 }} />;
      case 'student': return <School sx={{ fontSize: 16 }} />;
      default: return <AccountCircle sx={{ fontSize: 16 }} />;
    }
  };

  const getRoleBg = () => {
    switch (user?.role) {
      case 'admin': return 'linear-gradient(135deg, #F59E0B, #D97706)';
      case 'teacher': return 'linear-gradient(135deg, #10B981, #059669)';
      case 'student': return 'linear-gradient(135deg, #4F46E5, #7C3AED)';
      default: return 'linear-gradient(135deg, #4F46E5, #7C3AED)';
    }
  };

  const navItems = [
    { text: 'Home', icon: <Home sx={{ fontSize: 18 }} />, path: '/' },
    { text: 'Admin Msgs', icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, path: '/admin-messages' },
    { text: 'Messages', icon: <Message sx={{ fontSize: 18 }} />, path: '/personal-messages' },
    ...(user?.role === 'admin' ? [{ text: 'Departments', icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, path: '/departments' }] : []),
    ...(user?.role === 'teacher' ? [{ text: 'Create', icon: <Work sx={{ fontSize: 18 }} />, path: '/create-announcement' }] : []),
    ...(user?.role !== 'admin' ? [{ text: 'Announcements', icon: <School sx={{ fontSize: 18 }} />, path: '/announcements' }] : []),
  ];

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // ── Nav item component ─────────────────────────────────────────
  const NavItem = ({ item, onClick }) => {
    const active = isActive(item.path);
    return (
      <Button
        component={Link}
        to={item.path}
        onClick={onClick}
        startIcon={item.icon}
        sx={{
          position: 'relative',
          px: 1.8,
          py: 0.9,
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          color: active ? (isDark ? '#818CF8' : '#4F46E5') : (isDark ? '#94A3B8' : '#6B7280'),
          borderRadius: '10px',
          bgcolor: active ? (isDark ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.08)') : 'transparent',
          border: active ? `1px solid ${isDark ? 'rgba(129,140,248,0.2)' : 'rgba(79,70,229,0.15)'}` : '1px solid transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.06)',
            color: isDark ? '#818CF8' : '#4F46E5',
          },
          minWidth: 'unset',
          textTransform: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {item.text}
        {active && (
          <motion.div
            layoutId="nav-active-indicator"
            style={{
              position: 'absolute',
              bottom: -2,
              left: '20%',
              right: '20%',
              height: 2,
              borderRadius: 2,
              background: isDark ? '#818CF8' : '#4F46E5',
            }}
          />
        )}
      </Button>
    );
  };

  // ── Mobile Drawer ─────────────────────────────────────────────
  const MobileDrawer = (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: isDark ? '#1A1A2E' : '#fff',
          p: 2,
          borderLeft: `1px solid ${isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)'}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: isDark ? '#E2E8F0' : '#1E1B4B' }}>
          UniAnnounce
        </Typography>
        <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: isDark ? '#94A3B8' : '#6B7280' }}>
          <Close />
        </IconButton>
      </Box>
      {user && (
        <Box sx={{ p: 2, mb: 2, borderRadius: '12px', bgcolor: isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.05)', border: `1px solid ${isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ background: getRoleBg(), width: 36, height: 36, fontSize: 14 }}>
              {user.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: isDark ? '#E2E8F0' : '#1E1B4B' }}>{user.name}</Typography>
              <Typography sx={{ fontSize: 12, color: isDark ? '#94A3B8' : '#6B7280', textTransform: 'capitalize' }}>{user.role}</Typography>
            </Box>
          </Box>
        </Box>
      )}
      <List sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <Button fullWidth component={Link} to={item.path} onClick={() => setDrawerOpen(false)} startIcon={item.icon}
              sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: '10px', fontWeight: isActive(item.path) ? 700 : 500, fontSize: 14, color: isActive(item.path) ? (isDark ? '#818CF8' : '#4F46E5') : (isDark ? '#94A3B8' : '#6B7280'), bgcolor: isActive(item.path) ? (isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.06)') : 'transparent' }}>
              {item.text}
            </Button>
          </ListItem>
        ))}
        <Divider sx={{ my: 1, borderColor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)' }} />
        <ListItem disablePadding>
          <Button fullWidth startIcon={<Person />} onClick={() => { navigate('/profile'); setDrawerOpen(false); }}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: '10px', fontWeight: 500, fontSize: 14, color: isDark ? '#94A3B8' : '#6B7280' }}>
            Profile
          </Button>
        </ListItem>
        <ListItem disablePadding>
          <Button fullWidth startIcon={<Logout />} onClick={() => { handleLogout(); setDrawerOpen(false); }}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: '10px', fontWeight: 500, fontSize: 14, color: '#EF4444' }}>
            Logout
          </Button>
        </ListItem>
      </List>
    </Drawer>
  );

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, minHeight: '60px !important', px: { xs: 2, md: 3 } }}>
          {/* ── Brand ──────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', background: isDark ? 'linear-gradient(135deg, #818CF8, #A78BFA)' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                UniAnnounce
              </Typography>
            </Link>
          </motion.div>

          {/* ── Desktop Nav ─────────────────────────── */}
          {user && !isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, position: 'relative' }}>
              {navItems.map((item) => <NavItem key={item.text} item={item} />)}
            </Box>
          )}

          {/* ── Right Controls ─────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Dark mode toggle */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
                <IconButton onClick={toggleDarkMode} size="small" sx={{ width: 36, height: 36, bgcolor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.06)', border: `1px solid ${isDark ? 'rgba(129,140,248,0.2)' : 'rgba(79,70,229,0.12)'}`, '&:hover': { bgcolor: isDark ? 'rgba(129,140,248,0.18)' : 'rgba(79,70,229,0.12)' } }}>
                  <AnimatePresence mode="wait">
                    {darkMode
                      ? <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}><Brightness7 sx={{ fontSize: 18, color: '#FCD34D' }} /></motion.div>
                      : <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.25 }}><Brightness4 sx={{ fontSize: 18, color: '#4F46E5' }} /></motion.div>
                    }
                  </AnimatePresence>
                </IconButton>
              </Tooltip>
            </motion.div>

            {user && (
              <>
                {/* Notifications */}
                <Tooltip title="Notifications">
                  <IconButton onClick={handleNotifMenu} size="small" sx={{ width: 36, height: 36, bgcolor: isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.05)', '&:hover': { bgcolor: isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)' } }}>
                    <Badge badgeContent={unreadCount} sx={{ '& .MuiBadge-badge': { background: 'linear-gradient(135deg, #EF4444, #DC2626)', fontSize: 10, minWidth: 16, height: 16 } }}>
                      <Notifications sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#6B7280' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* User avatar */}
                {!isMobile && (
                  <Tooltip title={`${user.name} · ${user.role}`}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <IconButton onClick={handleMenu} sx={{ p: 0.4 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, background: getRoleBg(), border: `2px solid ${isDark ? 'rgba(129,140,248,0.3)' : 'rgba(79,70,229,0.25)'}` }}>
                          {user.name?.charAt(0).toUpperCase()}
                        </Avatar>
                      </IconButton>
                    </motion.div>
                  </Tooltip>
                )}

                {/* Mobile hamburger */}
                {isMobile && (
                  <IconButton onClick={() => setDrawerOpen(true)} size="small" sx={{ width: 36, height: 36 }}>
                    <MenuIcon sx={{ fontSize: 20, color: isDark ? '#94A3B8' : '#6B7280' }} />
                  </IconButton>
                )}
              </>
            )}

            {!user && (
              <Box sx={{ display: 'flex', gap: 0.8 }}>
                <Button component={Link} to="/login" variant="text" sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#818CF8' : '#4F46E5', borderRadius: '10px', px: 2 }}>Login</Button>
                <Button component={Link} to="/register" variant="contained" size="small" sx={{ fontSize: 13, fontWeight: 600, borderRadius: '10px', px: 2, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>Register</Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Notification Menu ─────────────────────────────── */}
      <Menu
        anchorEl={notifAnchorEl}
        open={Boolean(notifAnchorEl)}
        onClose={handleNotifClose}
        PaperProps={{ sx: { width: 340, maxHeight: 420, borderRadius: '14px', border: `1px solid ${isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)'}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: isDark ? '#E2E8F0' : '#1E1B4B' }}>Notifications</Typography>
        </Box>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: isDark ? '#475569' : '#9CA3AF' }}>All caught up! No new notifications.</Typography>
          </Box>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <MenuItem key={n.id} onClick={handleNotifClose} sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: isDark ? 'rgba(129,140,248,0.06)' : 'rgba(79,70,229,0.04)' } }}>
              <ListItemIcon>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: n.type === 'new_announcement' ? 'rgba(79,70,229,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  {n.type === 'new_announcement' ? <Announcement sx={{ fontSize: 16, color: '#4F46E5' }} /> : <Delete sx={{ fontSize: 16, color: '#EF4444' }} />}
                </Box>
              </ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: 13, fontWeight: 500, color: isDark ? '#E2E8F0' : '#1E1B4B' }}>{n.message}</Typography>} secondary={<Typography sx={{ fontSize: 11, color: isDark ? '#475569' : '#9CA3AF' }}>{formatTime(n.timestamp)}</Typography>} />
            </MenuItem>
          ))
        )}
        <Box sx={{ borderTop: `1px solid ${isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.06)'}`, p: 1 }}>
          <Button fullWidth onClick={clearNotifications} sx={{ fontSize: 12, color: isDark ? '#94A3B8' : '#6B7280', borderRadius: '8px', py: 0.8 }}>Clear all</Button>
        </Box>
      </Menu>

      {/* ── User Menu ─────────────────────────────────────── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ sx: { width: 220, borderRadius: '14px', border: `1px solid ${isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', p: 0.5 } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 1.5, mb: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: isDark ? '#E2E8F0' : '#1E1B4B' }}>{user?.name}</Typography>
          <Typography sx={{ fontSize: 12, color: isDark ? '#94A3B8' : '#6B7280', textTransform: 'capitalize' }}>{user?.role}</Typography>
        </Box>
        <Divider sx={{ borderColor: isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.06)', mb: 0.5 }} />
        <MenuItem onClick={() => { navigate('/profile'); handleClose(); }} sx={{ borderRadius: '8px', mx: 0.5, '&:hover': { bgcolor: isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.05)' } }}>
          <ListItemIcon><Person sx={{ fontSize: 18, color: isDark ? '#818CF8' : '#4F46E5' }} /></ListItemIcon>
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Edit Profile</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ borderRadius: '8px', mx: 0.5, '&:hover': { bgcolor: 'rgba(239,68,68,0.06)' } }}>
          <ListItemIcon><Logout sx={{ fontSize: 18, color: '#EF4444' }} /></ListItemIcon>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#EF4444' }}>Logout</Typography>
        </MenuItem>
      </Menu>

      {/* ── Mobile Drawer ─────────────────────────────────── */}
      {MobileDrawer}
    </>
  );
};

export default Header;
