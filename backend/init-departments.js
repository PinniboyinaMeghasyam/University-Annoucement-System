const mongoose = require('mongoose');
const Department = require('./models/Department');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_announcement_system')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const initDepartments = async () => {
  try {
    // Clear existing departments
    await Department.deleteMany({});
    
    // Create default departments
    const departments = [
      {
        name: 'CSE',
        sections: ['Section-A', 'Section-B', 'Section-C']
      },
      {
        name: 'AI/ML',
        sections: ['Section-AI', 'Section-ML']
      }
    ];
    
    for (const dept of departments) {
      const existingDept = await Department.findOne({ name: dept.name });
      if (!existingDept) {
        const newDept = new Department(dept);
        await newDept.save();
        console.log(`Created department: ${dept.name}`);
      }
    }
    
    console.log('Departments initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing departments:', error);
    process.exit(1);
  }
};

initDepartments();