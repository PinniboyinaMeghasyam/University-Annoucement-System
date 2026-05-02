const express = require('express');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/auth');
const { 
  register, 
  login, 
  getCurrentUser,
  verifyEmail,
  verifyMobile,
  resendOTP,
  forgotPasswordRequest,
  verifyForgotPasswordOTP,
  updateProfile,
  changePassword,
  verifyEmailChange,
  verifyMobileChange
} = require('../controllers/authController');

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later.'
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: 'Too many password reset attempts, please try again later.'
});

const resendOTPLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 requests per 10 minutes
  message: 'Too many OTP resend attempts, please try again later.'
});

// Register
router.post('/register', register);

// Login
router.post('/login', loginLimiter, login);

// Get current user
router.get('/me', auth, getCurrentUser);

// Verify email
router.post('/verify-email', verifyEmail);

// Verify mobile
router.post('/verify-mobile', auth, verifyMobile);

// Resend OTP
router.post('/resend-otp', resendOTPLimiter, resendOTP);

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordRequest);

// Verify forgot password OTP and reset password
router.post('/verify-forgot-password-otp', verifyForgotPasswordOTP);

// Update profile
router.put('/profile', auth, updateProfile);

// Change password
router.put('/change-password', auth, changePassword);

// Verify email change
router.post('/verify-email-change', auth, verifyEmailChange);

// Verify mobile change
router.post('/verify-mobile-change', auth, verifyMobileChange);

module.exports = router;