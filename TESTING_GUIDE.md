# Secure Authentication & Profile Management - Testing Guide

## ✅ Implementation Complete!

All features have been successfully implemented. Follow this guide to test the system.

---

## 🚀 Step 1: Setup Email Configuration

Before testing, you need to configure Gmail SMTP for sending OTP emails:

### Generate Gmail App Password:
1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left panel
3. Enable **2-Step Verification** (if not already enabled)
4. Go to **App passwords**: https://myaccount.google.com/apppasswords
5. Select **Mail** and your device
6. Click **Generate**
7. Copy the 16-character password

### Update .env file:
Open `backend/.env` and update:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

---

## 🚀 Step 2: Start the Backend Server

```bash
cd "c:\Users\Administrator\Desktop\App(1)\backend"
npm start
```

Expected output:
```
Server running on port 5001
MongoDB Connected
```

---

## 🚀 Step 3: Start the Frontend Server

Open a new terminal:
```bash
cd "c:\Users\Administrator\Desktop\App(1)\frontend"
npm start
```

The app will open at: http://localhost:3000

---

## 🧪 Step 4: Test Registration Flow

### Test Case 1: Register with Email
1. Go to http://localhost:3000/register
2. Fill in the form:
   - Full Name: Test User
   - Email: your-test-email@gmail.com
   - Mobile Number: 1234567890 (optional)
   - Password: test123
   - Role: Student
   - Department: (select one)
   - Section: (select one)
   - Roll Number: 001
3. Click **Sign Up**
4. You should be redirected to **Email OTP Verification** page
5. Check your email for the OTP (or check backend console for mobile OTP)
6. Enter the 6-digit OTP
7. Click **Verify OTP**
8. Should redirect to dashboard

### Test Case 2: Validation Tests
- Try registering with invalid email format → Should show error
- Try registering with mobile number less than 10 digits → Should show error
- Try registering with password less than 6 characters → Should show error

---

## 🧪 Step 5: Test Login Flow

### Test Case 3: Login with Email
1. Go to http://localhost:3000/login
2. Select **Email** toggle
3. Enter your registered email
4. Enter password
5. Click **Sign In**
6. Should redirect to dashboard

### Test Case 4: Login with Mobile
1. Go to http://localhost:3000/login
2. Select **Mobile** toggle
3. Enter your registered mobile number
4. Enter password
5. Click **Sign In**
6. Should redirect to dashboard

### Test Case 5: Forgot Password
1. Click **Forgot Password?** link
2. Enter your email or mobile number
3. Click **Send OTP**
4. Enter the OTP received
5. Enter new password and confirm
6. Click **Reset Password**
7. Should redirect to login page
8. Try logging in with new password

---

## 🧪 Step 6: Test Profile Management

### Test Case 6: Access Profile
1. Login to your account
2. Click on your avatar in the top-right corner
3. Click **Profile Edit**
4. Should open profile page

### Test Case 7: Update Profile
1. Change your name
2. Click **Save Changes**
3. Should show success message

### Test Case 8: Change Email (Requires OTP)
1. In profile page, change email to a new email
2. Click **Save Changes**
3. Should show message: "Changing email requires OTP verification"
4. Should redirect to email verification page
5. Enter OTP sent to new email
6. Email should be updated

### Test Case 9: Change Mobile Number (Requires OTP)
1. In profile page, change mobile number
2. Click **Save Changes**
3. Should redirect to mobile verification page
4. Check backend console for OTP (test mode)
5. Enter OTP
6. Mobile number should be updated

### Test Case 10: Change Password
1. In profile page, scroll to "Change Password" section
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click **Change Password**
6. Should show success message
7. Logout and try logging in with new password

---

## 🧪 Step 7: Test Security Features

### Test Case 11: Unverified Email Login
1. Register a new account but don't verify email
2. Try to login
3. Should show error: "Email not verified"
4. Should redirect to verification page

### Test Case 12: Invalid OTP
1. During verification, enter wrong OTP
2. Should show error: "Invalid OTP"

### Test Case 13: Expired OTP
1. Wait for 10 minutes (or change OTP_EXPIRY_MINUTES in .env to 1 for testing)
2. Try to use expired OTP
3. Should show error: "OTP has expired"

### Test Case 14: Rate Limiting
1. Try to login with wrong credentials 10 times
2. Should show: "Too many login attempts"

---

## 📱 OTP Delivery Information

### Email OTP:
- Sent to the email address provided
- Check your inbox (and spam folder)
- Contains beautiful HTML template with university branding

### Mobile OTP (Test Mode):
- **Logged to backend console** (not sent via SMS)
- Look for this in backend terminal:
  ```
  ===========================================
  [SMS OTP] Test Mode - In production, integrate with real SMS API
  [SMS OTP] To: 1234567890
  [SMS OTP] OTP: 123456
  ===========================================
  ```

### To Enable Real SMS (Optional):
1. Sign up for Twilio or Msg91
2. Get API credentials
3. Uncomment the code in `backend/services/smsService.js`
4. Add credentials to `.env`

---

## 🎨 UI Features to Verify

### Login Page:
- ✅ Email/Mobile toggle buttons
- ✅ Dynamic input field changes based on selection
- ✅ Forgot Password link
- ✅ Smooth animations
- ✅ Loading spinner during submission

### Registration Page:
- ✅ Mobile number field (optional)
- ✅ Phone icon
- ✅ Validation for 10-digit mobile number
- ✅ Redirects to OTP verification after registration

### OTP Verification Pages:
- ✅ 6-digit OTP input boxes
- ✅ Auto-focus next box on input
- ✅ Countdown timer (60 seconds for resend)
- ✅ Resend OTP button (disabled during cooldown)
- ✅ Paste support (paste full OTP in first box)

### Forgot Password Page:
- ✅ Two-step process (Send OTP → Verify & Reset)
- ✅ Email/Mobile selection
- ✅ Password visibility toggle
- ✅ Password confirmation validation

### Profile Page:
- ✅ User avatar display
- ✅ Editable name, email, mobile
- ✅ Warning messages when changing email/mobile
- ✅ Password change section
- ✅ Current password verification
- ✅ Save button with loading state

### Header Menu:
- ✅ Username display
- ✅ Role display
- ✅ Profile Edit option with icon
- ✅ Logout option with icon

---

## 🔍 API Endpoints Testing (Optional - Using Postman)

You can test these endpoints directly:

### Register:
```
POST http://localhost:5001/api/auth/register
Body: {
  "name": "Test User",
  "email": "test@example.com",
  "mobileNumber": "1234567890",
  "password": "test123",
  "role": "student",
  "department": "CSE",
  "section": "Section-1",
  "rollNumber": "001"
}
```

### Verify Email:
```
POST http://localhost:5001/api/auth/verify-email
Body: {
  "email": "test@example.com",
  "otp": "123456"
}
```

### Login:
```
POST http://localhost:5001/api/auth/login
Body: {
  "email": "test@example.com",
  "password": "test123"
}
```

### Forgot Password:
```
POST http://localhost:5001/api/auth/forgot-password
Body: {
  "email": "test@example.com"
}
```

### Update Profile:
```
PUT http://localhost:5001/api/auth/profile
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Email not sending
**Solution:** 
- Check Gmail App Password is correct
- Ensure 2-Step Verification is enabled
- Check internet connection

### Issue 2: "Module not found" errors
**Solution:**
```bash
cd backend
npm install
```

### Issue 3: Frontend not loading
**Solution:**
```bash
cd frontend
npm install
npm start
```

### Issue 4: MongoDB connection error
**Solution:**
- Check MONGODB_URI in .env
- Ensure MongoDB Atlas IP whitelist includes your IP

### Issue 5: OTP not working
**Solution:**
- Check if OTP is expired (10 minutes expiry)
- Verify correct OTP is entered
- Check backend console for mobile OTP (test mode)

---

## 🎯 Feature Checklist

### Authentication:
- [x] Login with Email + Password
- [x] Login with Mobile + Password
- [x] Email format validation
- [x] Mobile number format validation
- [x] Email OTP verification
- [x] Mobile OTP verification
- [x] Forgot Password with OTP
- [x] Only verified emails can login

### Profile Management:
- [x] Profile Edit page
- [x] Update username
- [x] Update email (with OTP verification)
- [x] Update mobile number (with OTP verification)
- [x] Change password (requires current password)
- [x] Profile photo field (ready for integration)

### Security:
- [x] JWT Authentication
- [x] Password hashing with bcrypt
- [x] OTP generation & expiry
- [x] Rate limiting on auth endpoints
- [x] Email/mobile verification before login
- [x] Current password required for password change
- [x] OTP verification for sensitive changes

### UI/UX:
- [x] Modern animated login/register UI
- [x] OTP input boxes with auto-focus
- [x] Loading animations
- [x] Error & success notifications
- [x] Responsive design
- [x] Toggle between Email/Mobile login
- [x] Forgot Password link
- [x] Profile menu with Edit option

---

## 📊 Test Results Template

Use this to track your testing:

| Test Case | Status | Notes |
|-----------|--------|-------|
| Registration with Email | ☐ Pass / ☐ Fail | |
| Registration with Mobile | ☐ Pass / ☐ Fail | |
| Email Verification | ☐ Pass / ☐ Fail | |
| Mobile Verification | ☐ Pass / ☐ Fail | |
| Login with Email | ☐ Pass / ☐ Fail | |
| Login with Mobile | ☐ Pass / ☐ Fail | |
| Forgot Password | ☐ Pass / ☐ Fail | |
| Profile Update | ☐ Pass / ☐ Fail | |
| Email Change (OTP) | ☐ Pass / ☐ Fail | |
| Mobile Change (OTP) | ☐ Pass / ☐ Fail | |
| Password Change | ☐ Pass / ☐ Fail | |
| Invalid Email Validation | ☐ Pass / ☐ Fail | |
| Invalid Mobile Validation | ☐ Pass / ☐ Fail | |
| Rate Limiting | ☐ Pass / ☐ Fail | |

---

## 🎉 Success Criteria

Your implementation is working correctly if:
1. ✅ Users can register with email and mobile number
2. ✅ Email OTP is received and verified
3. ✅ Mobile OTP is logged to console (test mode)
4. ✅ Login works with both email and mobile
5. ✅ Unverified users cannot login
6. ✅ Forgot password flow works with OTP
7. ✅ Profile can be edited with OTP verification for sensitive changes
8. ✅ Password change requires current password
9. ✅ All validations work correctly
10. ✅ UI is modern, animated, and responsive

---

## 📞 Need Help?

If you encounter any issues:
1. Check backend console for errors
2. Check browser console (F12) for frontend errors
3. Verify all environment variables are set
4. Ensure MongoDB connection is working
5. Test API endpoints with Postman

---

**Implementation completed successfully!** 🎊

All requested features have been implemented and are ready for testing.
