import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TextField, Button, Typography, Box, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, IconButton, InputAdornment,
  LinearProgress, useTheme, Chip,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Visibility, VisibilityOff, Person, Email, Lock,
  School, Work, AdminPanelSettings, Phone, ArrowForward, ArrowBack,
  Brightness4, Brightness7, CheckCircle,
} from '@mui/icons-material';

// ── Floating blob ──────────────────────────────────────────────────
const Blob = ({ size, top, left, delay, opacity = 0.12 }) => (
  <motion.div
    animate={{ y: [0, -18, 0], rotate: [0, 4, 0] }}
    transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: `rgba(255,255,255,${opacity})`, top, left, pointerEvents: 'none', filter: 'blur(1px)' }}
  />
);

// ── Step indicator ────────────────────────────────────────────────
const StepDot = ({ active, completed, label }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
    <Box sx={{
      width: 32, height: 32, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: completed ? '#10B981' : active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
      border: active ? '2px solid #fff' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {completed
        ? <CheckCircle sx={{ fontSize: 18, color: '#fff' }} />
        : <Typography sx={{ fontSize: 13, fontWeight: 700, color: active ? '#4F46E5' : 'rgba(255,255,255,0.7)' }}>{label}</Typography>
      }
    </Box>
  </Box>
);

const Register = ({ toggleDarkMode, darkMode }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [teacherSections, setTeacherSections] = useState([]);
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear] = useState(1);
  const [batchStart, setBatchStart] = useState(new Date().getFullYear());
  const [batchEnd, setBatchEnd] = useState(new Date().getFullYear() + 4);
  const [branch, setBranch] = useState('');
  const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (department) {
      const d = departments.find(d => d.name === department);
      setSections(d?.sections || []);
      setSection('');
    } else {
      setSections([]);
      setSection('');
    }
  }, [department, departments]);

  const validateStep1 = () => {
    if (!name.trim()) { setError('Please enter your full name'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return false; }
    if (mobileNumber && mobileNumber.length !== 10) { setError('Mobile number must be 10 digits'); return false; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userData = {
        name, email,
        mobileNumber: mobileNumber || undefined,
        password, role,
        department: role === 'admin' ? undefined : department,
        section: role === 'admin' ? undefined : (role === 'teacher' ? teacherSections : section),
        rollNumber: role === 'student' ? rollNumber : undefined,
        year: role === 'student' ? year : undefined,
        batchStart: role === 'student' ? batchStart : undefined,
        batchEnd: role === 'student' ? batchEnd : undefined,
        branch: role !== 'admin' ? branch : undefined,
      };
      const response = await api.post('/auth/register', userData);
      navigate('/verify-email-otp', { state: { email: response.data.email, userId: response.data.userId } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const roleCards = [
    { value: 'student', icon: <School sx={{ fontSize: 28 }} />, label: 'Student', desc: 'Receive announcements & updates', color: '#3B82F6' },
    { value: 'teacher', icon: <Work sx={{ fontSize: 28 }} />, label: 'Teacher', desc: 'Post & manage announcements', color: '#10B981' },
    { value: 'admin', icon: <AdminPanelSettings sx={{ fontSize: 28 }} />, label: 'Admin/HOD', desc: 'Full system administration', color: '#F59E0B' },
  ];

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.4,0,0.2,1] } },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.25, ease: [0.4,0,0.2,1] } }),
  };
  const [direction, setDirection] = useState(1);

  const goNext = () => { setDirection(1); handleNext(); };
  const goBack = () => { setDirection(-1); setStep(1); setError(''); };

  const leftGradients = [
    'linear-gradient(145deg, #065F46 0%, #059669 35%, #10B981 70%, #34D399 100%)',
    'linear-gradient(145deg, #3730A3 0%, #4F46E5 35%, #6D28D9 70%, #7C3AED 100%)',
  ];

  const fieldSx = {
    mb: 2,
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: isDark ? 'rgba(129,140,248,0.05)' : 'rgba(79,70,229,0.03)',
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5', borderWidth: 2, boxShadow: '0 0 0 3px rgba(79,70,229,0.12)' },
    },
  };

  const progress = step === 1 ? 45 : 90;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left Panel ─────────────────────────────────────────── */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.4,0,0.2,1] }}
        style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden', background: leftGradients[step - 1], transition: 'background 0.6s ease' }}
        className="mobile-hidden"
      >
        <Blob size="200px" top="-50px" left="-50px" delay={0} />
        <Blob size="130px" top="65%" left="65%" delay={1.5} />
        <Blob size="90px" top="35%" left="-15px" delay={2} />
        <Blob size="70px" top="15%" left="70%" delay={1} />
        <Blob size="110px" top="78%" left="8%" delay={3} />

        <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

        <Box sx={{ zIndex: 1, textAlign: 'center', width: '100%' }}>
          {/* Step indicator */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 4 }}>
            <StepDot active={step === 1} completed={step > 1} label="1" />
            <Box sx={{ width: 40, height: 2, bgcolor: step > 1 ? '#10B981' : 'rgba(255,255,255,0.3)', borderRadius: 2, transition: 'background 0.4s' }} />
            <StepDot active={step === 2} completed={false} label="2" />
          </Box>

          <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Box sx={{ fontSize: 64, mb: 2 }}>{step === 1 ? '🎓' : '🏛️'}</Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2, mb: 1.5, letterSpacing: '-0.02em' }}>
              {step === 1 ? 'Create Your Account' : 'Set Up Your Profile'}
            </Typography>
            <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              {step === 1 ? 'Join UniAnnounce and never miss an important announcement again.' : 'Tell us about your role so we can personalize your experience.'}
            </Typography>
          </motion.div>
        </Box>
      </motion.div>

      {/* ── Right Panel ──────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', px: { xs: 3, sm: 5, md: 7 }, py: 4, overflowY: 'auto', bgcolor: isDark ? '#0F0F1A' : '#F5F3FF', position: 'relative' }}>
        {/* Dark mode toggle */}
        <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
          <IconButton onClick={toggleDarkMode} sx={{ bgcolor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)', border: `1px solid ${isDark ? 'rgba(129,140,248,0.2)' : 'rgba(79,70,229,0.15)'}` }}>
            {isDark ? <Brightness7 sx={{ color: '#FCD34D' }} /> : <Brightness4 sx={{ color: '#4F46E5' }} />}
          </IconButton>
        </Box>

        {/* Progress bar */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 3, bgcolor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(79,70,229,0.08)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' } }} />
        </Box>

        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 800, color: isDark ? '#E2E8F0' : '#1E1B4B', mb: 0.5, letterSpacing: '-0.02em' }}>
            {step === 1 ? 'Join UniAnnounce' : 'Your Role & Details'}
          </Typography>
          <Typography sx={{ color: isDark ? '#94A3B8' : '#6B7280', mb: 3, fontSize: 14 }}>
            {step === 1 ? 'Step 1 of 2 — Basic Information' : 'Step 2 of 2 — Academic Details'}
          </Typography>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated Steps */}
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 ? (
              <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
                <TextField fullWidth required label="Full Name" value={name} onChange={e => setName(e.target.value)} autoFocus
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: '#4F46E5', fontSize: 20 }} /></InputAdornment> }}
                  sx={fieldSx} />
                <TextField fullWidth required label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: '#4F46E5', fontSize: 20 }} /></InputAdornment> }}
                  sx={fieldSx} />
                <TextField fullWidth label="Mobile Number (Optional)" value={mobileNumber}
                  onChange={e => { const v = e.target.value.replace(/\D/g,''); if(v.length<=10) setMobileNumber(v); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ color: '#4F46E5', fontSize: 20 }} /></InputAdornment> }}
                  sx={fieldSx} />
                <TextField fullWidth required label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#4F46E5', fontSize: 20 }} /></InputAdornment>,
                    endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                  }}
                  sx={fieldSx} />
                <Button fullWidth variant="contained" size="large" onClick={goNext} endIcon={<ArrowForward />}
                  sx={{ mt: 1, py: 1.6, borderRadius: '12px', fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)', '&:hover': { boxShadow: '0 6px 28px rgba(79,70,229,0.55)' } }}>
                  Continue
                </Button>
              </motion.div>
            ) : (
              <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
                <Box component="form" onSubmit={handleSubmit}>
                  {/* Role Cards */}
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94A3B8' : '#6B7280', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Your Role</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2.5 }}>
                    {roleCards.map(rc => (
                      <Box key={rc.value} onClick={() => setRole(rc.value)}
                        sx={{ p: 1.5, borderRadius: '12px', border: `2px solid ${role === rc.value ? rc.color : isDark ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.1)'}`, bgcolor: role === rc.value ? `${rc.color}18` : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease', '&:hover': { borderColor: rc.color, bgcolor: `${rc.color}10` } }}>
                        <Box sx={{ color: role === rc.value ? rc.color : isDark ? '#94A3B8' : '#6B7280', mb: 0.5 }}>{rc.icon}</Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: role === rc.value ? rc.color : isDark ? '#94A3B8' : '#6B7280' }}>{rc.label}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {role !== 'admin' && (
                    <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                      <InputLabel>Department</InputLabel>
                      <Select value={department} label="Department" onChange={e => setDepartment(e.target.value)} required>
                        {departments.map(d => <MenuItem key={d._id} value={d.name}>{d.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  {role === 'teacher' && (
                    <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                      <InputLabel>Sections (Select multiple)</InputLabel>
                      <Select multiple value={teacherSections} onChange={e => setTeacherSections(e.target.value)} label="Sections (Select multiple)" renderValue={sel => sel.join(', ')} required>
                        {Array.from({length:40},(_,i)=>i+1).map(n => <MenuItem key={n} value={`Section-${n}`}>{`Section-${n}`}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  {role === 'student' && (
                    <>
                      <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                        <InputLabel>Section</InputLabel>
                        <Select value={section} label="Section" onChange={e => setSection(e.target.value)} required>
                          {Array.from({length:40},(_,i)=>i+1).map(n => <MenuItem key={n} value={`Section-${n}`}>{`Section-${n}`}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField fullWidth required label="Roll Number" value={rollNumber} onChange={e => setRollNumber(e.target.value)} sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                      <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                        <InputLabel>Current Year</InputLabel>
                        <Select value={year} label="Current Year" onChange={e => setYear(e.target.value)} required>
                          {[1,2,3,4].map(y => <MenuItem key={y} value={y}>{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                        <TextField fullWidth label="Batch Start" type="number" value={batchStart} onChange={e => setBatchStart(parseInt(e.target.value))} required InputProps={{ inputProps: { min:2000,max:2030 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                        <TextField fullWidth label="Batch End" type="number" value={batchEnd} onChange={e => setBatchEnd(parseInt(e.target.value))} required InputProps={{ inputProps: { min:2004,max:2034 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                      </Box>
                    </>
                  )}

                  {role !== 'admin' && (
                    <FormControl fullWidth sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                      <InputLabel>Branch</InputLabel>
                      <Select value={branch} label="Branch" onChange={e => setBranch(e.target.value)} required>
                        {branches.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                    <Button variant="outlined" size="large" onClick={goBack} startIcon={<ArrowBack />}
                      sx={{ flex: '0 0 auto', px: 3, py: 1.6, borderRadius: '12px', fontWeight: 600, borderColor: isDark ? 'rgba(129,140,248,0.3)' : 'rgba(79,70,229,0.3)', color: isDark ? '#818CF8' : '#4F46E5' }}>
                      Back
                    </Button>
                    <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                      sx={{ py: 1.6, borderRadius: '12px', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)', '&:hover': { boxShadow: '0 6px 28px rgba(79,70,229,0.55)' } }}>
                      {loading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Create Account'}
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign in link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography sx={{ fontSize: 14, color: isDark ? '#94A3B8' : '#6B7280' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;
