// SMS Service for OTP verification
// NOTE: This is a TEST implementation that logs OTP to console
// For production, integrate with Twilio, Msg91, or other SMS providers

const sendOTPSMS = async (mobileNumber, otp) => {
  try {
    // TEST MODE: Log OTP to console
    console.log('===========================================');
    console.log('[SMS OTP] Test Mode - In production, integrate with real SMS API');
    console.log(`[SMS OTP] To: ${mobileNumber}`);
    console.log(`[SMS OTP] OTP: ${otp}`);
    console.log('===========================================');
    
    // For production integration with Twilio:
    /*
    const twilio = require('twilio');
    const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: `Your University Smart Announcement OTP is: ${otp}. This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber
    });
    */
    
    // For production integration with Msg91 (India):
    /*
    const axios = require('axios');
    await axios.post('https://api.msg91.com/api/v5/otp', {
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile: mobileNumber,
      OTP: otp
    }, {
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY
      }
    });
    */
    
    return { success: true, message: 'OTP sent successfully (Test Mode - Check console)' };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, message: 'Failed to send OTP SMS', error: error.message };
  }
};

module.exports = { sendOTPSMS };
