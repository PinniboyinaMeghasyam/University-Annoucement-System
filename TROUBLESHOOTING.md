# Troubleshooting Guide

## Common Issues and Solutions

### 1. npm install fails with permission errors

**Problem:** EACCES permission errors when installing npm packages

**Solution:**
- On Windows: Run Command Prompt or PowerShell as Administrator
- On macOS/Linux: Use `sudo npm install` (not recommended) or fix npm permissions

### 2. MongoDB connection fails

**Problem:** Application cannot connect to MongoDB

**Solutions:**
1. Ensure MongoDB is running:
   - Windows: `net start MongoDB` or run MongoDB service
   - macOS: `brew services start mongodb-community` or `mongod`
   - Linux: `sudo systemctl start mongod`

2. Check your MongoDB URI in `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/university_announcement_system
   ```

3. Verify MongoDB is listening on the correct port (default: 27017)

### 3. Cloudinary configuration errors

**Problem:** File uploads fail with Cloudinary errors

**Solutions:**
1. Verify your Cloudinary credentials in `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

2. Ensure you have a Cloudinary account and have created these credentials

### 4. Port already in use

**Problem:** Error saying port 5000 or 3000 is already in use

**Solutions:**
1. Kill the process using the port:
   - Windows: 
     ```
     netstat -ano | findstr :5000
     taskkill /PID <PID> /F
     ```
   - macOS/Linux:
     ```
     lsof -i :5000
     kill -9 <PID>
     ```

2. Or change the port in your configuration:
   - Backend: Modify `PORT` in `.env`
   - Frontend: Set `PORT=3001` in environment variables

### 5. CORS errors

**Problem:** Browser shows CORS errors when making API requests

**Solutions:**
1. Ensure the frontend and backend are configured for CORS:
   - Backend: CORS is already configured in `server.js`
   - Frontend: API calls should use the correct base URL

2. Check that both servers are running

### 6. JWT token issues

**Problem:** Authentication fails with token errors

**Solutions:**
1. Verify JWT secret in `.env`:
   ```
   JWT_SECRET=your_secret_key_here_change_this
   ```

2. Ensure the secret is sufficiently complex

3. Clear browser localStorage if tokens are corrupted:
   ```javascript
   localStorage.clear();
   ```

### 7. Frontend dependencies installation fails

**Problem:** npm install fails in frontend directory

**Solutions:**
1. Clear npm cache:
   ```
   npm cache clean --force
   ```

2. Delete node_modules and package-lock.json:
   ```
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Use a different package manager:
   ```
   yarn install
   ```
   or
   ```
   pnpm install
   ```

### 8. React scripts not found

**Problem:** Error "react-scripts: command not found"

**Solution:**
```
npm install react-scripts
```

### 9. Database models not syncing

**Problem:** Changes to Mongoose models aren't reflected

**Solutions:**
1. Restart the backend server
2. Ensure MongoDB is running
3. Check for syntax errors in model files

### 10. File upload limitations

**Problem:** Large files fail to upload

**Solutions:**
1. Increase payload limits in `server.js`:
   ```javascript
   app.use(express.json({ limit: '50mb' }));
   app.use(express.urlencoded({ extended: true, limit: '50mb' }));
   ```

2. Configure Cloudinary upload limits in your Cloudinary account settings

## Development Tips

### Debugging API Calls

1. Use browser developer tools Network tab to inspect requests
2. Use Postman or curl to test API endpoints directly
3. Add console.log statements in controllers for debugging

### Environment Variables

1. Always restart the server after changing `.env` files
2. Never commit `.env` files to version control
3. Use different `.env` files for different environments:
   - `.env.development`
   - `.env.production`
   - `.env.test`

### Performance Optimization

1. Use database indexing for frequently queried fields
2. Implement pagination for large datasets
3. Use caching for static content
4. Optimize images before uploading

## Testing Checklist

Before deployment, ensure:

- [ ] All API endpoints are working
- [ ] Authentication is functioning correctly
- [ ] File uploads are successful
- [ ] Real-time notifications work
- [ ] All user roles have appropriate access
- [ ] Mobile responsiveness is working
- [ ] Dark/light mode toggle functions
- [ ] Error handling works properly
- [ ] Loading states are implemented
- [ ] Form validation is in place

## Getting Help

If you're still experiencing issues:

1. Check the console logs in both frontend and backend
2. Verify all environment variables are set correctly
3. Ensure all required services (MongoDB, etc.) are running
4. Review the README.md and this troubleshooting guide
5. Search for error messages online
6. Consult the documentation for the specific technologies used:
   - Express.js: https://expressjs.com/
   - React: https://reactjs.org/
   - MongoDB: https://docs.mongodb.com/
   - Mongoose: https://mongoosejs.com/
   - Material UI: https://mui.com/

If you're unable to resolve an issue, consider:
1. Creating a detailed issue report with:
   - Error messages
   - Steps to reproduce
   - Environment information (OS, Node version, etc.)
2. Seeking help on developer forums like Stack Overflow