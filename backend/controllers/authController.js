const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const User = require('../models/User');
const { sendOTPEmail } = require('../services/emailService');
const { sendOTPSMS } = require('../services/smsService');
const { validateEmail, validateMobile, validatePassword } = require('../middleware/validation');

// Register user
const register = async (req, res) => {
  try {
    const { name, email, mobileNumber, password, role, department, section, rollNumber } = req.body;
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Validate mobile number if provided
    if (mobileNumber && !validateMobile(mobileNumber)) {
      return res.status(400).json({ message: 'Invalid mobile number format. Must be 10 digits' });
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }
    
    // Check if user already exists
    let existingUser;
    if (role === 'student' && rollNumber) {
      existingUser = await User.findOne({ 
        $or: [{ email }, { rollNumber }] 
      });
    } else {
      existingUser = await User.findOne({ email });
    }
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or roll number' });
    }
    
    // Check if mobile number already exists
    if (mobileNumber) {
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile) {
        return res.status(400).json({ message: 'Mobile number already registered' });
      }
    }
    
    // Validate sections for teachers
    if (role === 'teacher' && Array.isArray(section)) {
      if (section.length < 2) {
        return res.status(400).json({ message: 'Teachers must select at least 2 sections' });
      }
      if (section.length > 10) {
        return res.status(400).json({ message: 'Teachers can select maximum 10 sections' });
      }
    }

    // Generate email OTP
    const emailOTP = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });
    
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10));

    // Create user
    const user = new User({
      name,
      email,
      mobileNumber: mobileNumber || null,
      password,
      role,
      department: role === 'admin' ? undefined : department,
      section: role === 'admin' ? undefined : section,
      rollNumber: role === 'student' ? rollNumber : undefined,
      isEmailVerified: false,
      isMobileVerified: mobileNumber ? false : true,
      otp: emailOTP,
      otpExpiry,
      otpType: 'email'
    });
    
    await user.save();
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, emailOTP, 'verification');
    
    // Even if email fails, we'll return success with OTP in console for testing
    if (!emailResult.success) {
      console.log('⚠️  Email sending failed, but user registered successfully');
      console.log('🔑 Use this OTP for testing:', emailOTP);
    }
    
    // Send mobile OTP if mobile number provided
    if (mobileNumber) {
      await sendOTPSMS(mobileNumber, emailOTP); // Using same OTP for simplicity
    }
    
    res.status(201).json({
      message: emailResult.success 
        ? 'Registration successful. Please verify your email with the OTP sent to your email address.'
        : `Registration successful. OTP: ${emailOTP}. Check console for mobile OTP.`,
      userId: user._id,
      email: user.email,
      otpForTesting: process.env.NODE_ENV === 'development' ? emailOTP : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, mobileNumber, password } = req.body;
    
    // Determine login method
    const loginIdentifier = email || mobileNumber;
    
    if (!loginIdentifier) {
      return res.status(400).json({ message: 'Please provide email or mobile number' });
    }
    
    // Find user by email or mobile number
    let user;
    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      user = await User.findOne({ email });
    } else if (mobileNumber) {
      if (!validateMobile(mobileNumber)) {
        return res.status(400).json({ message: 'Invalid mobile number format' });
      }
      user = await User.findOne({ mobileNumber });
    }
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        requiresVerification: true,
        email: user.email
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        department: user.department,
        section: user.section,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified,
        mutedChats: user.mutedChats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      mobileNumber: req.user.mobileNumber,
      role: req.user.role,
      department: req.user.department,
      section: req.user.section,
      profilePhoto: req.user.profilePhoto,
      isEmailVerified: req.user.isEmailVerified,
      isMobileVerified: req.user.isMobileVerified,
      mutedChats: req.user.mutedChats
    }
  });
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    
    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Verify email
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpType = undefined;
    await user.save();
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        department: user.department,
        section: user.section,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify mobile
const verifyMobile = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    
    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required' });
    }
    
    const user = await User.findOne({ mobileNumber });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Verify mobile
    user.isMobileVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpType = undefined;
    await user.save();
    
    res.json({
      message: 'Mobile number verified successfully',
      isMobileVerified: user.isMobileVerified
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate new OTP
    const newOTP = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });
    
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10));
    
    user.otp = newOTP;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // Send OTP
    if (email) {
      await sendOTPEmail(email, newOTP, user.otpType || 'verification');
    }
    if (mobileNumber) {
      await sendOTPSMS(mobileNumber, newOTP);
    }
    
    res.json({
      message: 'OTP resent successfully',
      email: user.email,
      mobileNumber: user.mobileNumber
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot password request
const forgotPasswordRequest = async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    
    if (!email && !mobileNumber) {
      return res.status(400).json({ message: 'Please provide email or mobile number' });
    }
    
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });
    
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10));
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpType = 'password';
    await user.save();
    
    // Send OTP
    if (email) {
      await sendOTPEmail(email, otp, 'password');
    }
    if (mobileNumber) {
      await sendOTPSMS(mobileNumber, otp);
    }
    
    res.json({
      message: 'OTP sent successfully. Please check your email or mobile.',
      email: user.email,
      mobileNumber: user.mobileNumber
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify forgot password OTP and reset password
const verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, mobileNumber, otp, newPassword } = req.body;
    
    if (!email && !mobileNumber) {
      return res.status(400).json({ message: 'Please provide email or mobile number' });
    }
    
    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required' });
    }
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }
    
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Update password
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpType = undefined;
    await user.save();
    
    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, mobileNumber, profilePhoto } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update name if provided
    if (name) {
      user.name = name;
    }
    
    // Update profile photo if provided
    if (profilePhoto !== undefined) {
      user.profilePhoto = profilePhoto;
    }
    
    // Update email with OTP verification
    if (email && email !== user.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Generate OTP for new email
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
      });
      
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10));
      
      user.newEmail = email;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.otpType = 'email';
      
      const emailResult = await sendOTPEmail(email, otp, 'verification');
      if (!emailResult.success) {
        console.log('⚠️  Email sending failed for profile change');
        console.log('🔑 OTP for testing:', otp);
      }
    }
    
    // Update mobile number with OTP verification
    if (mobileNumber && mobileNumber !== user.mobileNumber) {
      if (!validateMobile(mobileNumber)) {
        return res.status(400).json({ message: 'Invalid mobile number format' });
      }
      
      // Check if mobile number already exists
      const existingUser = await User.findOne({ mobileNumber });
      if (existingUser) {
        return res.status(400).json({ message: 'Mobile number already in use' });
      }
      
      // Generate OTP for new mobile
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
      });
      
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10));
      
      user.newMobileNumber = mobileNumber;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.otpType = 'mobile';
      
      const smsResult = await sendOTPSMS(mobileNumber, otp);
      if (!smsResult.success) {
        console.log('⚠️  SMS sending failed for profile change');
      }
      console.log('🔑 Mobile OTP for testing:', otp);
    }
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified
      },
      requiresEmailVerification: !!user.newEmail,
      requiresMobileVerification: !!user.newMobileNumber
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }
    
    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email change
const verifyEmailChange = async (req, res) => {
  try {
    const { otp } = req.body;
    
    console.log('📧 Verifying email change...');
    console.log('👤 User ID from token:', req.user?._id);
    console.log('🔑 OTP received:', otp);
    
    if (!req.user || !req.user._id) {
      console.log('❌ No user ID in token');
      return res.status(401).json({ message: 'Authentication required. Please login again.' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User found:', user.email);
    console.log('📝 Pending new email:', user.newEmail);
    console.log('🔐 Stored OTP:', user.otp);
    
    if (!user.newEmail) {
      return res.status(400).json({ message: 'No pending email change. Please update your email first.' });
    }
    
    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Update email
    user.email = user.newEmail;
    user.newEmail = undefined;
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpType = undefined;
    await user.save();
    
    console.log('✅ Email updated successfully to:', user.email);
    
    res.json({
      message: 'Email updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified
      }
    });
  } catch (error) {
    console.error('❌ Error in verifyEmailChange:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify mobile change
const verifyMobileChange = async (req, res) => {
  try {
    const { otp } = req.body;
    
    console.log('📱 Verifying mobile change...');
    console.log('👤 User ID from token:', req.user?._id);
    console.log('🔑 OTP received:', otp);
    
    if (!req.user || !req.user._id) {
      console.log('❌ No user ID in token');
      return res.status(401).json({ message: 'Authentication required. Please login again.' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User found:', user.email);
    console.log('📝 Pending new mobile:', user.newMobileNumber);
    console.log('🔐 Stored OTP:', user.otp);
    
    if (!user.newMobileNumber) {
      return res.status(400).json({ message: 'No pending mobile number change. Please update your mobile number first.' });
    }
    
    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Update mobile number
    user.mobileNumber = user.newMobileNumber;
    user.newMobileNumber = undefined;
    user.isMobileVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpType = undefined;
    await user.save();
    
    console.log('✅ Mobile number updated successfully to:', user.mobileNumber);
    
    res.json({
      message: 'Mobile number updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified
      }
    });
  } catch (error) {
    console.error('❌ Error in verifyMobileChange:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
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
};