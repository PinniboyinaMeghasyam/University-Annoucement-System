@echo off
echo University Smart Announcement System - Setup Script
echo ==================================================
echo.
echo This script will help you set up the project.
echo.
echo 1. Make sure you have Node.js installed (version 14 or higher)
echo 2. Make sure you have MongoDB running
echo 3. Make sure you have a Cloudinary account
echo.
pause
echo.
echo Setting up backend...
cd backend
echo Installing backend dependencies...
npm install
echo.
echo Backend setup complete!
echo.
echo Setting up frontend...
cd ..\frontend
echo Installing frontend dependencies...
npm install
echo.
echo Frontend setup complete!
echo.
echo Setup finished!
echo.
echo To run the application:
echo 1. Start MongoDB server
echo 2. Update .env file in backend with your configuration
echo 3. In backend directory: npm start
echo 4. In frontend directory: npm start
echo.
pause