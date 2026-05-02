import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container, Grid, Card, CardContent, Typography, Button, Box,
  CircularProgress, Avatar, Chip, Divider, Tabs, Tab, Badge, useTheme,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  School, Work, AdminPanelSettings, Announcement, Add, Groups,
  Assignment, CalendarToday, TrendingUp, Public, PushPin,
  ArrowForward, CheckCircle,
} from '@mui/icons-material';

// ── Animated counter hook ─────────────────────────────────────────
const useCounter = (target, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev + step >= target) { clearInterval(timer); return target; }
        return prev + step;
      });
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

// ── Stat Card ──────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, gradient, delay }) => {
  const count = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4 }}
    >
      <Card sx={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {/* Accent bar */}
        <Box sx={{ height: 4, background: gradient }} />
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {count}
              </Typography>
            </Box>
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', opacity: 0.9 }}>
              <Box sx={{ color: '#fff', display: 'flex' }}>{icon}</Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ── Announcement Card ─────────────────────────────────────────────
const AnnCard = ({ announcement, index, isNew }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35 }}
      whileHover={{ x: 4 }}
    >
      <Box sx={{
        p: 2, mb: 1.5, borderRadius: '12px',
        bgcolor: isDark ? 'rgba(129,140,248,0.05)' : 'rgba(79,70,229,0.03)',
        border: `1px solid ${isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)'}`,
        borderLeft: `4px solid ${announcement.isPinned ? '#F59E0B' : '#4F46E5'}`,
        transition: 'all 0.25s ease',
        '&:hover': { boxShadow: '0 4px 16px rgba(79,70,229,0.1)' },
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary', flex: 1, mr: 1 }} noWrap>
            {announcement.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {isNew && (
              <Chip label="NEW" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 800, bgcolor: '#10B981', color: '#fff', animation: 'pulse-glow 2s infinite' }} />
            )}
            {announcement.isPinned && (
              <Chip icon={<PushPin sx={{ fontSize: '10px !important' }} />} label="Pinned" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B30' }} />
            )}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
          {announcement.postedBy?.name} · {new Date(announcement.createdAt).toLocaleDateString()}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.primary', opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {announcement.description}
        </Typography>
      </Box>
    </motion.div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [announcements, setAnnouncements] = useState([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({ totalAnnouncements: 0, unreadAnnouncements: 0, departments: 0, users: 0 });
  const errorLogRef = useRef(0);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const fetchData = async () => {
      try {
        const resp = user.role === 'admin' ? await api.get('/announcements/all') : await api.get(`/announcements/section/${user.section}`);
        setAnnouncements(resp.data.announcements);
        const gResp = await api.get('/announcements/global');
        setGlobalAnnouncements(gResp.data.announcements);
        const sResp = await api.get('/announcements/dashboard-stats');
        setStats(sResp.data.stats);
      } catch (err) {
        if (errorLogRef.current < 2) { console.error('Dashboard fetch error', err?.message); errorLogRef.current++; }
        setStats({ totalAnnouncements: 0, unreadAnnouncements: 0, departments: 0, users: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  if (!user) return null;

  const isNew = (d) => Math.abs(Date.now() - new Date(d)) / 36e5 < 24;

  const getRoleGradient = () => {
    switch (user.role) {
      case 'admin': return 'linear-gradient(135deg, #F59E0B, #D97706)';
      case 'teacher': return 'linear-gradient(135deg, #10B981, #059669)';
      default: return 'linear-gradient(135deg, #4F46E5, #7C3AED)';
    }
  };

  const getRoleLabel = () => ({ admin: 'Administrator', teacher: 'Faculty', student: 'Student' }[user.role] || user.role);

  const statCards = [
    { title: 'Total Announcements', value: stats.totalAnnouncements, icon: <Announcement sx={{ fontSize: 22 }} />, gradient: 'linear-gradient(135deg, #4F46E5, #818CF8)' },
    { title: 'Unread', value: stats.unreadAnnouncements, icon: <Assignment sx={{ fontSize: 22 }} />, gradient: 'linear-gradient(135deg, #EF4444, #F87171)' },
    { title: 'Departments', value: stats.departments, icon: <Groups sx={{ fontSize: 22 }} />, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
    { title: 'Users', value: stats.users, icon: <TrendingUp sx={{ fontSize: 22 }} />, gradient: 'linear-gradient(135deg, #F59E0B, #FCD34D)' },
  ];

  const quickActions = [
    ...(user.role === 'admin' ? [
      { title: 'Create Announcement', icon: <Add />, action: () => navigate('/create-announcement'), gradient: 'linear-gradient(135deg, #10B981, #059669)' },
      { title: 'Manage Departments', icon: <Groups />, action: () => navigate('/departments'), gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
    ] : []),
    ...(user.role === 'teacher' ? [
      { title: 'Create Announcement', icon: <Add />, action: () => navigate('/create-announcement'), gradient: 'linear-gradient(135deg, #10B981, #059669)' },
      { title: 'View Announcements', icon: <Announcement />, action: () => navigate('/announcements'), gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)' },
    ] : []),
    ...(user.role === 'student' ? [
      { title: 'View Announcements', icon: <Announcement />, action: () => navigate('/announcements'), gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)' },
      { title: 'My Schedule', icon: <CalendarToday />, action: () => {}, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    ] : []),
  ];

  const displayAnnouncements = user.role === 'admin' ? globalAnnouncements : tabValue === 0 ? announcements : globalAnnouncements;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* ── Welcome Banner ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Box sx={{
            p: { xs: 3, md: 4 }, mb: 4, borderRadius: '20px',
            background: getRoleGradient(),
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
          }}>
            {/* Background decoration */}
            <Box sx={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <Box sx={{ position: 'absolute', right: 80, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <motion.div whileHover={{ scale: 1.08, rotate: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Avatar sx={{ width: 64, height: 64, fontSize: 26, fontWeight: 800, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.35)' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </Avatar>
              </motion.div>
              <Box>
                <Typography sx={{ fontSize: { xs: 20, md: 26 }, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                  Welcome back, {user.name?.split(' ')[0]}! 👋
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.8, flexWrap: 'wrap' }}>
                  <Chip label={getRoleLabel()} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 11, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' }} />
                  {user.role !== 'admin' && user.department && (
                    <Chip label={user.department} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 11, border: '1px solid rgba(255,255,255,0.2)' }} />
                  )}
                  {user.role !== 'admin' && user.section && (
                    <Chip label={user.section} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 11, border: '1px solid rgba(255,255,255,0.2)' }} />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {statCards.map((s, i) => (
            <Grid item xs={6} md={3} key={s.title}>
              <StatCard {...s} delay={i * 0.08} />
            </Grid>
          ))}
        </Grid>

        {/* ── Content Grid ──────────────────────────────────── */}
        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={5}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
              <Card sx={{ borderRadius: '16px', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5, color: 'text.primary' }}>Quick Actions</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>Jump to key features</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {quickActions.map((qa, i) => (
                      <motion.div key={qa.title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }} whileHover={{ x: 4 }}>
                        <Button
                          fullWidth variant="outlined" startIcon={qa.icon} onClick={qa.action}
                          endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                          sx={{ justifyContent: 'space-between', py: 1.5, px: 2, borderRadius: '12px', fontWeight: 600, fontSize: 14, textAlign: 'left', borderColor: isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.15)', color: 'text.primary', '&:hover': { borderColor: '#4F46E5', bgcolor: isDark ? 'rgba(79,70,229,0.08)' : 'rgba(79,70,229,0.04)', '& .MuiButton-startIcon': { color: '#4F46E5' } } }}
                        >
                          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span>{qa.title}</span>
                          </Box>
                        </Button>
                      </motion.div>
                    ))}
                  </Box>

                  {/* Role info card */}
                  <Box sx={{ mt: 3, p: 2, borderRadius: '12px', background: isDark ? 'rgba(129,140,248,0.06)' : 'rgba(79,70,229,0.04)', border: `1px solid ${isDark ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.1)'}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#10B981' }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>Account Active</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                      {user.role === 'admin' && 'You have full administrative privileges.'}
                      {user.role === 'teacher' && `You can post announcements for ${user.section || 'your sections'}.`}
                      {user.role === 'student' && `Showing announcements for ${user.section || 'your section'}.`}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Recent Announcements */}
          <Grid item xs={12} md={7}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45, duration: 0.5 }}>
              <Card sx={{ borderRadius: '16px', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'text.primary' }}>Recent Announcements</Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Latest updates</Typography>
                    </Box>
                    <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/announcements')}
                      sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#818CF8' : '#4F46E5', borderRadius: '8px', '&:hover': { bgcolor: isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.06)' } }}>
                      View All
                    </Button>
                  </Box>

                  {user.role !== 'admin' && (
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: '8px', mx: 0.25 }, '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #4F46E5, #7C3AED)', height: 2, borderRadius: 2 } }}>
                      <Tab icon={<School sx={{ fontSize: 15 }} />} iconPosition="start" label={<Badge badgeContent={announcements.filter(a => isNew(a.createdAt)).length} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 14, height: 14 } }}>Section</Badge>} />
                      <Tab icon={<Public sx={{ fontSize: 15 }} />} iconPosition="start" label={<Badge badgeContent={globalAnnouncements.filter(a => isNew(a.createdAt)).length} color="secondary" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 14, height: 14 } }}>Global</Badge>} />
                    </Tabs>
                  )}

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#4F46E5' }} /></Box>
                  ) : displayAnnouncements.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No announcements yet.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
                      {displayAnnouncements.slice(0, 6).map((a, i) => (
                        <AnnCard key={a._id} announcement={a} index={i} isNew={isNew(a.createdAt)} />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </motion.div>
  );
};

export default Dashboard;
