import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Authentication API methods
export const authAPI = {
  // Register
  register: (data) => api.post('/auth/register', data),
  
  // Login
  login: (data) => api.post('/auth/login', data),
  
  // Get current user
  getCurrentUser: () => api.get('/auth/me'),
  
  // Verify email
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  
  // Verify mobile
  verifyMobile: (data) => api.post('/auth/verify-mobile', data),
  
  // Resend OTP
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  
  // Forgot password
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  
  // Verify forgot password OTP and reset password
  verifyForgotPassword: (data) => api.post('/auth/verify-forgot-password-otp', data),
  
  // Update profile
  updateProfile: (data) => api.put('/auth/profile', data),
  
  // Change password
  changePassword: (data) => api.put('/auth/change-password', data),
  
  // Verify email change
  verifyEmailChange: (data) => api.post('/auth/verify-email-change', data),
  
  // Verify mobile change
  verifyMobileChange: (data) => api.post('/auth/verify-mobile-change', data),
};

// Group API methods
export const groupAPI = {
  // Create group
  createGroup: (data) => api.post('/groups', data),
  
  // Get my groups
  getMyGroups: () => api.get('/groups/my'),
  
  // Get group info
  getGroupInfo: (id) => api.get(`/groups/${id}`),
  
  // Get group messages
  getGroupMessages: (id, params) => api.get(`/groups/${id}/messages`, { params }),
  
  // Send message
  sendMessage: (id, formData) => api.post(`/groups/${id}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Delete group (Admin only)
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  
  // Exit group
  exitGroup: (id) => api.post(`/groups/${id}/exit`),
  
  // Remove member (Admin/Teacher only)
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  
  // Trigger year progression (Admin only)
  triggerYearProgression: () => api.post('/groups/progression'),
  
  // Delete group
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  
  // Toggle reaction on message
  toggleReaction: (messageId, emoji) => api.post(`/groups/messages/${messageId}/reaction`, { emoji }),
  
  // Vote on poll
  votePoll: (messageId, optionIndex) => api.post(`/groups/messages/${messageId}/vote`, { optionIndex }),
  
  // Pin message
  pinMessage: (messageId) => api.post(`/groups/messages/${messageId}/pin`),
  
  // Toggle star
  toggleStar: (messageId) => api.put(`/groups/messages/${messageId}/star`),
  
  // Create poll
  createPoll: (data) => api.post('/groups/poll', data),
};
