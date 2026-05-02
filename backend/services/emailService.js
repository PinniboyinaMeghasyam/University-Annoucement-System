const nodemailer = require('nodemailer');

// Create transporter with better error handling
let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s/g, '') // Remove spaces from app password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  // Verify connection configuration
  transporter.verify(function(error, success) {
    if (error) {
      console.log('⚠️  Email service configuration error:', error.message);
      console.log('📝 Please check your Gmail credentials in .env file');
    } else {
      console.log('✅ Email service is ready to send messages');
    }
  });
} catch (error) {
  console.log('⚠️  Email transporter initialization failed:', error.message);
}

// Send OTP email
const sendOTPEmail = async (to, otp, purpose = 'verification') => {
  try {
    // Check if transporter is configured
    if (!transporter) {
      console.log('⚠️  Email service not configured. OTP:', otp);
      return { 
        success: false, 
        message: 'Email service not configured. Please check Gmail credentials.',
        fallback: true,
        otp: otp // Return OTP for testing
      };
    }

    const mailOptions = {
      from: `"University Smart Announcement" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: purpose === 'password' ? 'Password Reset OTP' : 'Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(45deg, #1976d2 30%, #2196f3 90%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">University Smart Announcement</h1>
          </div>
          <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">${purpose === 'password' ? 'Password Reset' : 'Email Verification'}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              ${purpose === 'password' 
                ? 'You have requested to reset your password. Use the OTP below to proceed with password reset.' 
                : 'Thank you for registering! Please use the OTP below to verify your email address.'}
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">Your OTP Code</p>
              <h1 style="color: #1976d2; font-size: 48px; margin: 0; letter-spacing: 10px; font-weight: bold;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This OTP will expire in <strong>${process.env.OTP_EXPIRY_MINUTES || 10} minutes</strong>.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to: ${to}`);
    return { success: true, message: 'OTP sent successfully to your email' };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.log('🔑 OTP (for testing):', otp);
    
    // Return fallback with OTP for testing
    return { 
      success: false, 
      message: `Failed to send email: ${error.message}. OTP: ${otp}`,
      fallback: true,
      otp: otp,
      error: error.message
    };
  }
};

module.exports = { sendOTPEmail };
