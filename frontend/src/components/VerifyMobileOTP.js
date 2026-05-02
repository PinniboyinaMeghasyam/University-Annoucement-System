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
import { Phone, Timer } from '@mui/icons-material';

const VerifyMobileOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber || '';
  const isProfileChange = location.state?.isProfileChange || false;

  useEffect(() => {
    if (!mobileNumber) {
      navigate(isProfileChange ? '/profile' : '/register');
      return;
    }

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
  }, [mobileNumber, navigate]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
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
        // Profile mobile change verification
        response = await authAPI.verifyMobileChange({ otp: otpString });
        setSuccess('Mobile number updated successfully!');
      } else {
        // Registration mobile verification (if needed in future)
        response = await authAPI.verifyMobile({ mobileNumber, otp: otpString });
        setSuccess('Mobile number verified successfully!');
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
      await authAPI.resendOTP({ mobileNumber });
      setSuccess('OTP resent successfully');
      setTimer(60);
      setCanResend(false);

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
      transition={{ duration: 0.5 }}
    >
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            mt: 8,
            borderRadius: 3,
            background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(145deg, #1b1b1b, #222222)' : 'linear-gradient(145deg, #f0f0f0, #ffffff)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Phone sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {isProfileChange ? 'Verify New Mobile Number' : 'Verify Mobile Number'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {isProfileChange ? 'OTP sent to your new number:' : 'OTP sent to'}
            </Typography>
            <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
              {mobileNumber}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={(el) => (inputRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  inputProps={{ maxLength: 1, style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' } }}
                  sx={{ width: '50px' }}
                />
              ))}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
              <Timer sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
              Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </Typography>

            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mb: 2 }}>
              {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
            </Button>

            <Button onClick={handleResendOTP} disabled={!canResend} variant="outlined" fullWidth>
              {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
            </Button>
          </Box>
        </Paper>
      </Container>
    </motion.div>
  );
};

export default VerifyMobileOTP;
