import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Fab, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyboardArrowUp } from '@mui/icons-material';

// Components
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Announcements from './components/Announcements';
import CreateAnnouncement from './components/CreateAnnouncement';
import Departments from './components/Departments';
import AdminMessages from './components/AdminMessages';
import WhatsAppAdminMessages from './components/WhatsAppAdminMessages';
import PersonalMessages from './components/PersonalMessages';
import VerifyEmailOTP from './components/VerifyEmailOTP';
import VerifyMobileOTP from './components/VerifyMobileOTP';
import ForgotPassword from './components/ForgotPassword';
import Profile from './components/Profile';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// ─── Premium Design Tokens ────────────────────────────────────────────────────
const commonTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.025em' },
  h2: { fontWeight: 800, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, letterSpacing: '-0.015em' },
  h4: { fontWeight: 700, letterSpacing: '-0.01em' },
  h5: { fontWeight: 600, letterSpacing: '-0.005em' },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  subtitle2: { fontWeight: 500 },
  button: { fontWeight: 600, letterSpacing: '0.01em' },
};

const commonShape = { borderRadius: 12 };

const commonComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 10,
        padding: '10px 20px',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': { transform: 'translateY(-1px)' },
        '&:active': { transform: 'translateY(0)' },
      },
      contained: {
        boxShadow: '0 4px 14px 0 rgba(79,70,229,0.35)',
        '&:hover': { boxShadow: '0 6px 20px rgba(79,70,229,0.45)' },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': { transform: 'translateY(-3px)' },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
    },
  },
  MuiChip: {
    styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
  },
};

// ─── Light Theme ──────────────────────────────────────────────────────────────
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#4F46E5', light: '#818CF8', dark: '#3730A3', contrastText: '#fff' },
    secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#fff' },
    success:   { main: '#10B981', light: '#34D399', dark: '#059669' },
    warning:   { main: '#F59E0B', light: '#FCD34D', dark: '#D97706' },
    error:     { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
    info:      { main: '#06B6D4', light: '#67E8F9', dark: '#0891B2' },
    background: {
      default: '#F5F3FF',
      paper: '#FFFFFF',
    },
    text: {
      primary:   '#1E1B4B',
      secondary: '#6B7280',
      disabled:  '#9CA3AF',
    },
    divider: 'rgba(79,70,229,0.1)',
  },
  typography: commonTypography,
  shape: commonShape,
  components: {
    ...commonComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 24px rgba(79,70,229,0.08)',
          border: '1px solid rgba(79,70,229,0.1)',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(79,70,229,0.14)',
            transform: 'translateY(-3px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation6: { boxShadow: '0 20px 60px rgba(79,70,229,0.12)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(79,70,229,0.1)',
          boxShadow: '0 1px 24px rgba(79,70,229,0.08)',
          color: '#1E1B4B',
        },
      },
    },
  },
});

// ─── Dark Theme ───────────────────────────────────────────────────────────────
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#818CF8', light: '#A5B4FC', dark: '#4F46E5', contrastText: '#fff' },
    secondary: { main: '#A78BFA', light: '#C4B5FD', dark: '#7C3AED', contrastText: '#fff' },
    success:   { main: '#34D399', light: '#6EE7B7', dark: '#10B981' },
    warning:   { main: '#FCD34D', light: '#FDE68A', dark: '#F59E0B' },
    error:     { main: '#F87171', light: '#FCA5A5', dark: '#EF4444' },
    info:      { main: '#67E8F9', light: '#A5F3FC', dark: '#06B6D4' },
    background: {
      default: '#0F0F1A',
      paper:   '#1A1A2E',
    },
    text: {
      primary:   '#E2E8F0',
      secondary: '#94A3B8',
      disabled:  '#475569',
    },
    divider: 'rgba(129,140,248,0.12)',
  },
  typography: commonTypography,
  shape: commonShape,
  components: {
    ...commonComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          border: '1px solid rgba(129,140,248,0.12)',
          background: '#1A1A2E',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(129,140,248,0.18)',
            border: '1px solid rgba(129,140,248,0.25)',
            transform: 'translateY(-3px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', background: '#1A1A2E' },
        elevation6: { boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(15,15,26,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(129,140,248,0.15)',
          boxShadow: '0 1px 24px rgba(0,0,0,0.4)',
          color: '#E2E8F0',
        },
      },
    },
  },
});

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="80vh">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

// ─── Scroll to Top ────────────────────────────────────────────────────────────
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggle = () => setIsVisible(window.pageYOffset > 300);
    window.addEventListener('scroll', toggle);
    return () => window.removeEventListener('scroll', toggle);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 1000 }}
        >
          <Fab
            color="primary"
            aria-label="scroll back to top"
            onClick={scrollToTop}
            sx={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              boxShadow: '0 4px 20px rgba(79,70,229,0.45)',
              '&:hover': { boxShadow: '0 6px 28px rgba(79,70,229,0.6)' },
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Page Transition Variants ─────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
};

const PageWrapper = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="enter"
    exit="exit"
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

// ─── App Content ──────────────────────────────────────────────────────────────
function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('uniannounce-dark') === 'true'; } catch { return false; }
  });
  const { user } = useAuth();
  const location = useLocation();

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      try { localStorage.setItem('uniannounce-dark', String(next)); } catch {}
      return next;
    });
  };

  const theme = darkMode ? darkTheme : lightTheme;

  const isAuthPage = ['/login', '/register', '/verify-email-otp', '/verify-mobile-otp', '/forgot-password'].includes(location.pathname);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: 'background-color 0.3s ease',
        }}
      >
        {!isAuthPage && <Header toggleDarkMode={toggleDarkMode} darkMode={darkMode} />}
        <Box sx={{ flexGrow: 1 }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={user ? <PageWrapper><Dashboard /></PageWrapper> : <Navigate to="/login" replace />} />
              <Route path="/login"            element={<Login toggleDarkMode={toggleDarkMode} darkMode={darkMode} />} />
              <Route path="/register"         element={<Register toggleDarkMode={toggleDarkMode} darkMode={darkMode} />} />
              <Route path="/verify-email-otp" element={<PageWrapper><VerifyEmailOTP /></PageWrapper>} />
              <Route path="/verify-mobile-otp" element={<PageWrapper><VerifyMobileOTP /></PageWrapper>} />
              <Route path="/forgot-password"  element={<PageWrapper><ForgotPassword /></PageWrapper>} />
              <Route path="/profile"          element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>} />
              <Route path="/dashboard"        element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>} />
              <Route path="/announcements"    element={<ProtectedRoute><PageWrapper><Announcements /></PageWrapper></ProtectedRoute>} />
              <Route path="/create-announcement" element={<ProtectedRoute allowedRoles={['teacher','admin']}><PageWrapper><CreateAnnouncement /></PageWrapper></ProtectedRoute>} />
              <Route path="/departments"      element={<ProtectedRoute allowedRoles={['admin']}><PageWrapper><Departments /></PageWrapper></ProtectedRoute>} />
              <Route path="/admin-messages"   element={<ProtectedRoute><PageWrapper><AdminMessages /></PageWrapper></ProtectedRoute>} />
              <Route path="/personal-messages" element={<ProtectedRoute><PersonalMessages /></ProtectedRoute>} />
            </Routes>
          </AnimatePresence>
        </Box>
        {!isAuthPage && <ScrollToTop />}
      </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;