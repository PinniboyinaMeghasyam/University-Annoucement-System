// Validation functions for authentication

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateMobile = (mobileNumber) => {
  // Accepts 10-digit mobile numbers (can be extended for international formats)
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobileNumber);
};

const validatePassword = (password) => {
  // Minimum 6 characters
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true, message: 'Valid password' };
};

module.exports = {
  validateEmail,
  validateMobile,
  validatePassword
};
