import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Divider,
  useTheme,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Visibility, VisibilityOff, Email, Lock, Phone,
  Brightness4, Brightness7, School,
} from '@mui/icons-material';

// ── Floating blob shape ───────────────────────────────────────────
const Blob = ({ size, top, left, delay, opacity = 0.15 }) => (
  <motion.div
    animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
    transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: '50%',
      background: `rgba(255,255,255,${opacity})`,
      top, left,
      pointerEvents: 'none',
      filter: 'blur(2px)',
    }}
  />
);

const Login = ({ toggleDarkMode, darkMode }) => {
  const [loginMethod, setLoginMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginData = { password, ...(loginMethod === 'email' ? { email } : { mobileNumber }) };
      const response = await api.post('/auth/login', loginData);
      const { token, user } = response.data;
      login(user, token);
      if (user.role === 'admin') navigate('/departments');
      else if (user.role === 'teacher') navigate('/create-announcement');
      else navigate('/announcements');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to login';
      setError(msg);
      if (err.response?.data?.requiresVerification) {
        setTimeout(() => navigate('/verify-email-otp', { state: { email: err.response.data.email } }), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.09 + 0.3, duration: 0.4, ease: [0.4,0,0.2,1] } }),
  };

  const features = [
    { icon: '📢', text: 'Real-time announcements' },
    { icon: '💬', text: 'Direct messaging system' },
    { icon: '🏛️', text: 'Department management' },
    { icon: '🔔', text: 'Smart notifications' },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left Panel ────────────────────────────────────────── */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #3730A3 0%, #4F46E5 35%, #6D28D9 70%, #7C3AED 100%)' }}
        className="mobile-hidden"
      >
        {/* Decorative blobs */}
        <Blob size="220px" top="-60px" left="-60px" delay={0} opacity={0.1} />
        <Blob size="160px" top="60%" left="70%" delay={1.5} opacity={0.12} />
        <Blob size="100px" top="40%" left="-20px" delay={2.5} opacity={0.08} />
        <Blob size="80px" top="20%" left="75%" delay={1} opacity={0.15} />
        <Blob size="140px" top="75%" left="10%" delay={3} opacity={0.09} />

        {/* Decorative ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.06)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}
        />

        {/* Brand */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} style={{ zIndex: 1, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '14px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <School sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              UniAnnounce
            </Typography>
          </Box>

          <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.2, mb: 2, letterSpacing: '-0.025em' }}>
            Stay Connected,<br />Stay Informed
          </Typography>
          <Typography sx={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', mb: 5, lineHeight: 1.6 }}>
            Your university's smart announcement & communication hub
          </Typography>

          {/* Feature chips */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'flex-start', maxWidth: 280, mx: 'auto' }}>
            {features.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.45 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', px: 2, py: 1 }}>
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{f.text}</Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      </motion.div>

      {/* ── Right Panel ───────────────────────────────────────── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: { xs: 3, sm: 6, md: 8 },
        py: 4,
        overflowY: 'auto',
        bgcolor: isDark ? '#0F0F1A' : '#F5F3FF',
        position: 'relative',
      }}>
        {/* Dark mode toggle */}
        <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
          <IconButton
            onClick={toggleDarkMode}
            sx={{ bgcolor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)', border: `1px solid ${isDark ? 'rgba(129,140,248,0.2)' : 'rgba(79,70,229,0.15)'}`, '&:hover': { bgcolor: isDark ? 'rgba(129,140,248,0.18)' : 'rgba(79,70,229,0.14)' } }}
          >
            {isDark ? <Brightness7 sx={{ color: '#FCD34D' }} /> : <Brightness4 sx={{ color: '#4F46E5' }} />}
          </IconButton>
        </Box>

        <motion.div variants={formVariants} initial="hidden" animate="visible" style={{ width: '100%', maxWidth: 420 }}>
          {/* Header */}
          <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
            <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: '-0.025em', color: isDark ? '#E2E8F0' : '#1E1B4B', mb: 0.5 }}>
              Welcome back 👋
            </Typography>
            <Typography sx={{ color: isDark ? '#94A3B8' : '#6B7280', mb: 3.5, fontSize: 15 }}>
              Sign in to your account to continue
            </Typography>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: 2, fontWeight: 500 }}>{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login method toggle */}
          <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5, p: 0.5, bgcolor: isDark ? 'rgba(129,140,248,0.08)' : 'rgba(79,70,229,0.06)', borderRadius: 3, border: `1px solid ${isDark ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.1)'}` }}>
              {['email', 'mobile'].map((m) => (
                <Box
                  key={m}
                  onClick={() => setLoginMethod(m)}
                  sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, py: 1.2, borderRadius: 2.5, cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.25s ease', color: loginMethod === m ? '#fff' : isDark ? '#94A3B8' : '#6B7280', background: loginMethod === m ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'transparent', boxShadow: loginMethod === m ? '0 4px 12px rgba(79,70,229,0.35)' : 'none' }}
                >
                  {m === 'email' ? <Email sx={{ fontSize: 16 }} /> : <Phone sx={{ fontSize: 16 }} />}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Box>
              ))}
            </Box>
          </motion.div>

          {/* Fields */}
          <Box component="form" onSubmit={handleSubmit}>
            <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
              <TextField
                fullWidth required
                label={loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
                value={loginMethod === 'email' ? email : mobileNumber}
                onChange={(e) => {
                  if (loginMethod === 'email') setEmail(e.target.value);
                  else { const v = e.target.value.replace(/\D/g,''); if (v.length <= 10) setMobileNumber(v); }
                }}
                autoFocus
                InputProps={{ startAdornment: <InputAdornment position="start">{loginMethod === 'email' ? <Email sx={{ color: '#4F46E5', fontSize: 20 }} /> : <Phone sx={{ color: '#4F46E5', fontSize: 20 }} />}</InputAdornment> }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: isDark ? 'rgba(129,140,248,0.05)' : 'rgba(79,70,229,0.03)', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5', borderWidth: 2, boxShadow: '0 0 0 3px rgba(79,70,229,0.12)' } } }}
              />
            </motion.div>

            <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
              <TextField
                fullWidth required
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#4F46E5', fontSize: 20 }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                }}
                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: isDark ? 'rgba(129,140,248,0.05)' : 'rgba(79,70,229,0.03)', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5', borderWidth: 2, boxShadow: '0 0 0 3px rgba(79,70,229,0.12)' } } }}
              />
            </motion.div>

            <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible">
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  <Typography sx={{ color: '#4F46E5', fontWeight: 600, fontSize: 14, '&:hover': { textDecoration: 'underline' } }}>
                    Forgot Password?
                  </Typography>
                </Link>
              </Box>
            </motion.div>

            <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible">
              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading}
                sx={{ py: 1.6, borderRadius: '12px', fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)', '&:hover': { boxShadow: '0 6px 28px rgba(79,70,229,0.55)', background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)' }, '&:disabled': { opacity: 0.6 } }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Sign In'}
              </Button>
            </motion.div>

            <motion.div custom={6} variants={fieldVariants} initial="hidden" animate="visible">
              <Divider sx={{ my: 3, '&::before,&::after': { borderColor: isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.12)' } }}>
                <Typography sx={{ px: 1.5, fontSize: 13, color: isDark ? '#475569' : '#9CA3AF', fontWeight: 500 }}>
                  New here?
                </Typography>
              </Divider>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button fullWidth variant="outlined" size="large"
                  sx={{ py: 1.5, borderRadius: '12px', fontSize: 15, fontWeight: 600, borderColor: isDark ? 'rgba(129,140,248,0.3)' : 'rgba(79,70,229,0.3)', color: isDark ? '#818CF8' : '#4F46E5', '&:hover': { borderColor: '#4F46E5', bgcolor: 'rgba(79,70,229,0.06)' } }}
                >
                  Create an Account
                </Button>
              </Link>
            </motion.div>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Login;
