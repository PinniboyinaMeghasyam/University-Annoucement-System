import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { authAPI } from '../services/api';
import { Email, Timer } from '@mui/icons-material';

const VerifyEmailOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const isProfileChange = location.state?.isProfileChange || false;

  useEffect(() => {
    if (!email) {
      navigate(isProfileChange ? '/profile' : '/register');
      return;
    }

    // Countdown timer for resend
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtp(newOtp);
      // Focus on the next empty input or last input
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter complete OTP');
      setLoading(false);
      return;
    }

    try {
      let response;

      // Use different API endpoint based on context
      if (isProfileChange) {
        // Profile email change verification
        response = await authAPI.verifyEmailChange({ otp: otpString });
        setSuccess('Email updated successfully! Redirecting...');
      } else {
        // Registration email verification
        response = await authAPI.verifyEmail({ email, otp: otpString });
        setSuccess('Email verified successfully! Redirecting...');

        // Login the user with the received token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      // Update user context if profile change
      if (isProfileChange && response.data.user) {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        localStorage.setItem('user', JSON.stringify({ ...storedUser, ...response.data.user }));
      }

      setTimeout(() => {
        navigate(isProfileChange ? '/profile' : '/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');
    try {
      await authAPI.resendOTP({ email });
      setSuccess('OTP resent successfully');
      setTimer(60);
      setCanResend(false);

      // Restart countdown
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Container component="main" maxWidth="xs">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 100 }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 4,
              mt: 8,
              borderRadius: 3,
              background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(145deg, #1b1b1b, #222222)' : 'linear-gradient(145deg, #f0f0f0, #ffffff)',
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.1)',
              border: (theme) => `1px solid ${theme.palette.divider}`
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{ textAlign: 'center', marginBottom: '24px' }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(45deg, #1565c0 30%, #0288d1 90%)' : 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(33, 150, 243, 0.25)' : '0 4px 20px rgba(33, 150, 243, 0.4)',
                  border: (theme) => `1px solid ${theme.palette.divider}`
                }}
              >
                <Email sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography component="h1" variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {isProfileChange ? 'Verify New Email' : 'Verify Your Email'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isProfileChange
                  ? 'We\'ve sent a 6-digit OTP to your new email:'
                  : 'We\'ve sent a 6-digit OTP to'}
              </Typography>
              <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                {email}
              </Typography>
            </motion.div>

            {error && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                  {success}
                </Alert>
              </motion.div>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
                  {otp.map((digit, index) => (
                    <TextField
                      key={index}
                      inputRef={(el) => (inputRefs.current[index] = el)}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      inputProps={{
                        maxLength: 1,
                        style: {
                          textAlign: 'center',
                          fontSize: '24px',
                          fontWeight: 'bold',
                          padding: '12px'
                        }
                      }}
                      sx={{
                        width: '50px',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  ))}
                </Box>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{ textAlign: 'center', marginBottom: '16px' }}
              >
                <Typography variant="body2" color="text.secondary">
                  <Timer sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  Time remaining: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </Typography>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 2,
                    mb: 2,
                    py: 1.5,
                    background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(45deg, #1976d2 30%, #0ea5e9 90%)' : 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                    borderRadius: 3,
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 15px rgba(33, 150, 243, 0.3)' : '0 4px 15px rgba(33, 150, 243, 0.4)',
                    fontWeight: 'bold'
                  }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verify OTP'}
                </Button>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                style={{ textAlign: 'center' }}
              >
                <Button
                  onClick={handleResendOTP}
                  disabled={!canResend}
                  variant="outlined"
                  fullWidth
                >
                  {canResend ? 'Resend OTP' : `Resend OTP in ${timer}s`}
                </Button>
              </motion.div>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </motion.div>
  );
};

export default VerifyEmailOTP;
