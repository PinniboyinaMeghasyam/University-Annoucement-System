# University Smart Announcement & File-Sharing System

A complete, production-ready University Smart Announcement & File-Sharing Web Application built with the MERN stack. This system replaces WhatsApp for academic announcements and file sharing.

## 🧑💼 User Roles

### 1. Admin / HOD
- Secure login
- Create & manage departments and sections
- Add teachers and students
- Assign teachers to specific sections
- View all announcements

### 2. Teacher
- Secure login
- Select assigned sections
- Post announcements (text + images)
- Upload PDF, PPT, DOC, images
- Edit & delete their own announcements

### 3. Student
- Login using roll number / college email
- Automatically mapped to their section
- Receive only section-specific announcements
- View & download uploaded files

## ⚙️ Core Functional Requirements

- Section-wise message delivery (no irrelevant messages)
- No reply or chat system (announcement-only)
- Real-time announcement updates
- Notification badge for new announcements
- Search & filter by subject/date

## 🎨 UI / UX Features

- Highly animated modern UI with Framer Motion
- Smooth transitions and micro-interactions
- Clean card-based announcement feed
- Dashboard for Admin, Teacher, and Student
- Dark / Light mode with toggle
- Fully responsive (mobile-first)
- Gradient accents and visual enhancements
- Loading skeletons and progress indicators
- Scroll to top functionality

## 🛠️ Tech Stack

### Frontend
- React.js with Hooks
- Material UI (MUI) v5
- Framer Motion for animations
- React Router v6
- Axios for HTTP requests
- Custom CSS for enhanced styling

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT-based authentication
- Role-based access control
- Multer + Cloudinary for file uploads
- Socket.io for real-time updates

## 📂 Database Models

### User
- name, email, role (admin/teacher/student)
- department, section
- rollNumber (for students)

### Announcement
- title, description
- files (pdf/ppt/image)
- section
- postedBy (teacherId)
- createdAt

### Department
- name
- sections

## 📱 App Conversion Ready

- Separate frontend & backend clearly
- REST APIs only
- Clean folder structure
- Ready for React Native conversion

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account for file storage

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   ```
   
   Create a `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   PORT=5001
   ```

3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   ```

4. **Run the Application:**

   Start the backend server:
   ```bash
   cd backend
   npm start
   ```

   Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## 🎯 Enhanced Features

### Visual Enhancements
- **Gradient UI Elements**: Modern gradient buttons and cards
- **Animated Transitions**: Smooth page transitions with Framer Motion
- **Micro-interactions**: Hover effects and subtle animations
- **Loading States**: Skeleton loaders and progress indicators
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark/Light Mode**: Seamless theme switching with persistent preference

### User Experience Improvements
- **Intuitive Navigation**: Clear breadcrumbs and navigation paths
- **Search & Filter**: Advanced filtering capabilities
- **Pagination**: Efficient data loading for large datasets
- **File Previews**: Visual indicators for different file types
- **Form Validation**: Real-time feedback and error handling
- **Accessibility**: WCAG compliant components and keyboard navigation

### Performance Optimizations
- **Code Splitting**: Lazy loading for improved initial load times
- **Memoization**: Optimized re-renders with React.memo
- **Efficient APIs**: Paginated endpoints and selective data fetching
- **Asset Optimization**: Compressed images and minified resources

## 📁 Folder Structure

```
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

## 🔐 Authentication

The system uses JWT-based authentication with role-based access control:
- Admins have full access to all features
- Teachers can create/edit/delete announcements for their sections
- Students can only view announcements for their section

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Announcements
- `POST /api/announcements` - Create announcement (Teacher only)
- `GET /api/announcements/section/:section` - Get announcements for a section
- `GET /api/announcements/all` - Get all announcements (Admin only)
- `GET /api/announcements/:id` - Get announcement by ID
- `PUT /api/announcements/:id` - Update announcement (Teacher who posted it)
- `DELETE /api/announcements/:id` - Delete announcement (Teacher who posted it)

### Departments
- `POST /api/departments` - Create department (Admin only)
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department by ID
- `PUT /api/departments/:id` - Update department (Admin only)
- `DELETE /api/departments/:id` - Delete department (Admin only)
- `POST /api/departments/:id/sections` - Add section to department (Admin only)
- `DELETE /api/departments/:id/sections/:section` - Remove section from department (Admin only)

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `POST /api/users/assign-teacher` - Assign teacher to section (Admin only)

## 📱 Mobile Ready

The application is built with a mobile-first approach and follows responsive design principles, making it ready for React Native conversion.

## 📝 Sample Dummy Users

For testing purposes, you can create the following users:

1. **Admin User:**
   - Email: admin@university.edu
   - Password: admin123
   - Role: admin

2. **Teacher User:**
   - Email: teacher@university.edu
   - Password: teacher123
   - Role: teacher
   - Department: Computer Science
   - Section: Section-A

3. **Student User:**
   - Email: student@university.edu
   - Password: student123
   - Role: student
   - Department: Computer Science
   - Section: Section-A
   - Roll Number: CS2023001

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.