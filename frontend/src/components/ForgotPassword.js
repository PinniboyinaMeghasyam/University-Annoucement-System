import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert, CircularProgress,
  ToggleButton, ToggleButtonGroup, InputAdornment, IconButton
} from '@mui/material';
import { authAPI } from '../services/api';
import { Email, Phone, Lock, Visibility, VisibilityOff } from '@mui/icons-material';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
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
  }, []);

  const handleMethodChange = (e, newMethod) => {
    if (newMethod !== null) setMethod(newMethod);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword({
        ...(method === 'email' ? { email } : { mobileNumber })
      });
      setSuccess('OTP sent successfully');
      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOTP = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter complete OTP');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await authAPI.verifyForgotPassword({
        ...(method === 'email' ? { email } : { mobileNumber }),
        otp: otpString,
        newPassword
      });
      setSuccess('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await authAPI.resendOTP({
        ...(method === 'email' ? { email } : { mobileNumber })
      });
      setSuccess('OTP resent successfully');
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Container component="main" maxWidth="xs">
        <Paper elevation={6} sx={{ p: 4, mt: 8, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(45deg, #ff9800 30%, #ffa726 90%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Forgot Password</Typography>
            <Typography variant="body2" color="text.secondary">Step {step} of 2</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {step === 1 && (
            <Box component="form" onSubmit={handleSendOTP}>
              <ToggleButtonGroup value={method} exclusive onChange={handleMethodChange} fullWidth sx={{ mb: 2 }}>
                <ToggleButton value="email"><Email sx={{ mr: 1 }} />Email</ToggleButton>
                <ToggleButton value="mobile"><Phone sx={{ mr: 1 }} />Mobile</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                margin="normal"
                required
                fullWidth
                label={method === 'email' ? 'Email Address' : 'Mobile Number'}
                value={method === 'email' ? email : mobileNumber}
                onChange={(e) => {
                  if (method === 'email') setEmail(e.target.value);
                  else {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setMobileNumber(val);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {method === 'email' ? <Email /> : <Phone />}
                    </InputAdornment>
                  )
                }}
              />

              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>
                {loading ? <CircularProgress size={24} /> : 'Send OTP'}
              </Button>
            </Box>
          )}

          {step === 2 && (
            <Box component="form" onSubmit={handleVerifyOTP}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Enter OTP sent to {method === 'email' ? email : mobileNumber}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
                {otp.map((digit, index) => (
                  <TextField
                    key={index}
                    inputRef={(el) => (inputRefs.current[index] = el)}
                    value={digit}
                    onChange={(e) => handleChangeOTP(index, e.target.value)}
                    inputProps={{ maxLength: 1, style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' } }}
                    sx={{ width: '50px' }}
                  />
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </Typography>

              <TextField
                margin="normal"
                required
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>
                }}
              />

              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2 }}>
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>

              <Button onClick={handleResendOTP} disabled={!canResend} variant="outlined" fullWidth sx={{ mt: 1 }}>
                {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </motion.div>
  );
};

export default ForgotPassword;
