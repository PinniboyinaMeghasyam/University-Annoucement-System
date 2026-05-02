import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert, CircularProgress,
  Avatar, Divider, IconButton, InputAdornment
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Person, Email, Phone, Lock, Visibility, VisibilityOff, Save } from '@mui/icons-material';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setName(user.name || '');
    setEmail(user.email || '');
    setMobileNumber(user.mobileNumber || '');
  }, [user, navigate]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateProfile({ name, email, mobileNumber });

      // Update local storage with new user data
      const updatedUser = { ...user, ...response.data.user };
      updateUser(updatedUser);

      setSuccess('Profile updated successfully');

      // If email/mobile verification required, redirect with proper state
      if (response.data.requiresEmailVerification) {
        setTimeout(() => navigate('/verify-email-otp', {
          state: {
            email: email,
            isProfileChange: true
          }
        }), 1500);
      } else if (response.data.requiresMobileVerification) {
        setTimeout(() => navigate('/verify-mobile-otp', {
          state: {
            mobileNumber: mobileNumber,
            isProfileChange: true
          }
        }), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      setError('New password must be different from your current password');
      setLoading(false);
      return;
    }

    try {
      await authAPI.changePassword({ currentPassword, newPassword, confirmPassword });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar sx={{ width: 100, height: 100, margin: '0 auto 16px', bgcolor: 'primary.main' }}>
              <Person sx={{ fontSize: 60 }} />
            </Avatar>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Profile Settings</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Profile Information */}
          <Box component="form" onSubmit={handleProfileUpdate}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Personal Information</Typography>

            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }}
              sx={{ mb: 2 }}
            />
            {email !== user?.email && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 2 }}>
                * Changing email requires OTP verification
              </Typography>
            )}

            <TextField
              margin="normal"
              fullWidth
              label="Mobile Number"
              value={mobileNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) setMobileNumber(val);
              }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Phone /></InputAdornment> }}
              sx={{ mb: 2 }}
            />
            {mobileNumber !== user?.mobileNumber && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 2 }}>
                * Changing mobile number requires OTP verification
              </Typography>
            )}

            <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={<Save />}>
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Change Password */}
          <Box component="form" onSubmit={handlePasswordChange}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Change Password</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': { color: 'primary.dark' }
                }}
                onClick={() => {
                  const remember = window.confirm('Do you remember your current password?\n\nClick OK if you remember it.\nClick Cancel if you forgot it and need to reset.');
                  if (!remember) {
                    navigate('/forgot-password');
                  }
                }}
              >
                Forgot Password?
              </Typography>
            </Box>

            <TextField
              margin="normal"
              required
              fullWidth
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              helperText="Don't remember? Click 'Forgot Password?' above"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Lock /></InputAdornment> }}
              sx={{ mb: 2 }}
            />

            <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={<Lock />}>
              {loading ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </motion.div>
  );
};

export default Profile;
