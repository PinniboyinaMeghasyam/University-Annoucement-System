const Department = require('../models/Department');
const User = require('../models/User');

// Create department
const createDepartment = async (req, res) => {
  try {
    const { name, sections } = req.body;
    
    // Check if department already exists
    const existingDepartment = await Department.findOne({ name });
    
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department already exists' });
    }
    
    // Create department
    const department = new Department({
      name,
      sections: sections || []
    });
    
    await department.save();
    
    res.status(201).json({
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all departments with counts
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    
    // For each department, get teacher and student counts
    const departmentsWithCounts = await Promise.all(departments.map(async (dept) => {
      const teacherCount = await User.countDocuments({ department: dept.name, role: 'teacher' });
      const studentCount = await User.countDocuments({ department: dept.name, role: 'student' });
      
      return {
        ...dept,
        teacherCount,
        studentCount
      };
    }));
    
    res.json(departmentsWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get department members (teachers or students)
const getDepartmentMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query; // 'teacher' or 'student'
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    const query = { department: department.name };
    if (role) {
      query.role = role;
    }
    
    const members = await User.find(query)
      .select('name rollNumber email role')
      .sort({ name: 1 });
      
    res.json({ members });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { name, sections } = req.body;
    
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, sections },
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json({
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add section to department
const addSectionToDepartment = async (req, res) => {
  try {
    const { section } = req.body;
    
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if section already exists
    if (department.sections.includes(section)) {
      return res.status(400).json({ message: 'Section already exists in this department' });
    }
    
    department.sections.push(section);
    await department.save();
    
    res.json({
      message: 'Section added successfully',
      department
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove section from department
const removeSectionFromDepartment = async (req, res) => {
  try {
    const { section } = req.params;
    
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if section exists
    if (!department.sections.includes(section)) {
      return res.status(400).json({ message: 'Section does not exist in this department' });
    }
    
    department.sections = department.sections.filter(s => s !== section);
    await department.save();
    
    res.json({
      message: 'Section removed successfully',
      department
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  addSectionToDepartment,
  removeSectionFromDepartment,
  getDepartmentMembers
};