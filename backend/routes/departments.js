const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { 
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  addSectionToDepartment,
  removeSectionFromDepartment,
  getDepartmentMembers
} = require('../controllers/departmentController');

const router = express.Router();

// Create department (Admin only)
router.post('/', auth, adminAuth, createDepartment);

// Get all departments
router.get('/', getAllDepartments);

// Get department by ID
router.get('/:id', auth, getDepartmentById);

// Get department members
router.get('/:id/members', auth, getDepartmentMembers);

// Update department (Admin only)
router.put('/:id', auth, adminAuth, updateDepartment);

// Delete department (Admin only)
router.delete('/:id', auth, adminAuth, deleteDepartment);

// Add section to department (Admin only)
router.post('/:id/sections', auth, adminAuth, addSectionToDepartment);

// Remove section from department (Admin only)
router.delete('/:id/sections/:section', auth, adminAuth, removeSectionFromDepartment);

module.exports = router;