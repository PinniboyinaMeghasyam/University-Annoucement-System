# Project Structure Visualization

```
University Smart Announcement & File-Sharing System
├── backend/
│   ├── controllers/
│   │   ├── authController.js          # Authentication logic
│   │   ├── announcementController.js   # Announcement management
│   │   ├── departmentController.js     # Department operations
│   │   └── userController.js          # User management
│   ├── middleware/
│   │   └── auth.js                    # Authentication middleware
│   ├── models/
│   │   ├── User.js                    # User schema and model
│   │   ├── Announcement.js            # Announcement schema and model
│   │   └── Department.js              # Department schema and model
│   ├── routes/
│   │   ├── auth.js                    # Authentication routes
│   │   ├── announcements.js           # Announcement routes
│   │   ├── departments.js             # Department routes
│   │   └── users.js                   # User routes
│   ├── utils/
│   │   └── cloudinary.js              # Cloudinary configuration
│   ├── server.js                      # Main server entry point
│   └── .env                           # Environment variables
│
├── frontend/
│   ├── public/
│   │   └── index.html                 # Main HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js              # Navigation header
│   │   │   ├── Login.js               # Login form
│   │   │   ├── Register.js            # Registration form
│   │   │   ├── Dashboard.js           # Role-based dashboard
│   │   │   ├── Announcements.js       # Announcement listing
│   │   │   ├── CreateAnnouncement.js  # Announcement creation
│   │   │   └── Departments.js         # Department management
│   │   ├── context/
│   │   │   └── AuthContext.js         # Authentication state
│   │   ├── services/
│   │   │   └── api.js                 # HTTP client configuration
│   │   ├── App.js                     # Main application component
│   │   └── index.js                   # React DOM renderer
│   └── package.json                   # Frontend dependencies
│
├── Documentation/
│   ├── README.md                      # Project overview and setup
│   ├── PROJECT_SUMMARY.md             # Technical implementation
│   ├── FINAL_PROJECT_OVERVIEW.md      # Comprehensive project review
│   ├── TROUBLESHOOTING.md             # Issue resolution guide
│   ├── setup.bat                      # Automated setup script
│   └── PROJECT_STRUCTURE.md           # This file
│
└── .gitignore                         # Git ignored files
```

## Component Relationships

### Backend Architecture Flow
```
[Client Request] 
        ↓
[Express Router] → [Auth Middleware] → [Controller] → [Model] → [MongoDB]
        ↓
[Response]
```

### Frontend Component Hierarchy
```
App
├── Header (Navigation)
├── Routes
│   ├── Login
│   ├── Register
│   ├── Dashboard
│   ├── Announcements
│   ├── CreateAnnouncement
│   └── Departments
└── AuthContext (State Management)
```

### Data Flow
```
Frontend Component 
        ↓ (API Call)
API Service (Axios)
        ↓ (HTTP Request)
Backend Route
        ↓ (Middleware)
Controller Logic
        ↓ (Mongoose)
Database Operation
        ↓ (Response)
Frontend State Update
        ↓ (Re-render)
UI Update
```

### Authentication Flow
```
1. User submits Login/Register form
2. Frontend sends request to /api/auth endpoint
3. Backend validates credentials
4. JWT token generated and returned
5. Frontend stores token in localStorage
6. Subsequent requests include Authorization header
7. Backend middleware verifies token
8. Access granted/denied based on role
```

### Real-time Communication Flow
```
[Teacher creates announcement]
        ↓
[Backend saves to database]
        ↓
[Backend emits Socket.io event]
        ↓
[Frontend receives event via Socket.io]
        ↓
[Frontend updates UI in real-time]
```

### File Upload Flow
```
[User selects files]
        ↓
[Frontend sends multipart form data]
        ↓
[Backend Multer processes upload]
        ↓
[Files sent to Cloudinary]
        ↓
[Cloudinary returns URLs]
        ↓
[Backend saves announcement with file URLs]
        ↓
[Frontend displays files via URLs]
```

## Folder Purposes

### `/backend/controllers/`
Contains business logic separated by entity. Each controller handles CRUD operations for a specific model.

### `/backend/middleware/`
Contains reusable functions that process requests before reaching controllers (e.g., authentication).

### `/backend/models/`
Defines MongoDB schemas using Mongoose and exports model classes.

### `/backend/routes/`
Maps HTTP endpoints to controller functions and applies middleware.

### `/backend/utils/`
Utility functions and third-party service configurations.

### `/frontend/src/components/`
Reusable UI components that encapsulate specific functionality.

### `/frontend/src/context/`
React Context providers for global state management.

### `/frontend/src/services/`
API clients and service layer for communicating with the backend.

### `/Documentation/`
Project documentation including setup guides, troubleshooting, and architectural overviews.