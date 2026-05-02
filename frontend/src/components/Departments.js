import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  IconButton,
  Alert,
  Avatar,
  Tooltip,
  Pagination,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  School,
  Group,
  AdminPanelSettings,
  Search,
  FilterList,
  Email,
  Badge
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Departments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [name, setName] = useState('');
  const [sections, setSections] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const departmentsPerPage = 6;

  // Member list state
  const [memberListOpen, setMemberListOpen] = useState(false);
  const [memberListType, setMemberListType] = useState(''); // 'teacher' or 'student'
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptMembers, setDeptMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await api.get('/departments');
        setDepartments(response.data);
        setTotalPages(Math.ceil(response.data.length / departmentsPerPage));
      } catch (err) {
        console.error('Failed to fetch departments', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [user, navigate]);

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setCurrentDepartment(null);
    setName('');
    setSections('');
    setError('');
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (department) => {
    setDialogMode('edit');
    setCurrentDepartment(department);
    setName(department.name);
    setSections(department.sections.join(', '));
    setError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async () => {
    try {
      const sectionsArray = sections.split(',').map(s => s.trim()).filter(s => s);

      if (dialogMode === 'create') {
        const response = await api.post('/departments', { name, sections: sectionsArray });
        setDepartments([...departments, response.data.department]);
      } else {
        const response = await api.put(`/departments/${currentDepartment._id}`, { name, sections: sectionsArray });
        setDepartments(departments.map(d => d._id === currentDepartment._id ? response.data.department : d));
      }

      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDelete = async (departmentId) => {
    try {
      await api.delete(`/departments/${departmentId}`);
      setDepartments(departments.filter(d => d._id !== departmentId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleFetchMembers = async (dept, type) => {
    try {
      setSelectedDept(dept);
      setMemberListType(type);
      setLoadingMembers(true);
      setMemberListOpen(true);

      const response = await api.get(`/departments/${dept._id}/members`, {
        params: { role: type }
      });

      setDeptMembers(response.data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Failed to load member list');
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.sections.some(section => section.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedDepartments = filteredDepartments.slice(
    (page - 1) * departmentsPerPage,
    page * departmentsPerPage
  );

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <Box sx={{ mb: 4, mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Departments
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Manage academic departments and sections
              </Typography>
            </Box>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenCreateDialog}
                sx={{
                  py: 1.5,
                  px: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(45deg, #f44336 30%, #ff5252 90%)',
                  boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
                  fontWeight: 'bold',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #d32f2f 30%, #ff1744 90%)',
                    boxShadow: '0 6px 20px rgba(244, 67, 54, 0.6)'
                  }
                }}
              >
                Add Department
              </Button>
            </motion.div>
          </Box>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <Card sx={{ mb: 3, borderRadius: 3, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                label="Search departments or sections"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <IconButton sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                <FilterList />
              </IconButton>
            </Box>
          </Card>
        </motion.div>

        {error && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          </motion.div>
        )}

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          </motion.div>
        ) : paginatedDepartments.length === 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <School sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No departments found
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  {searchTerm ? 'No departments match your search criteria.' : 'Get started by adding a new department.'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleOpenCreateDialog}
                  sx={{
                    py: 1.5,
                    px: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(45deg, #f44336 30%, #ff5252 90%)',
                    boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
                    fontWeight: 'bold'
                  }}
                >
                  Add Department
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <Grid container spacing={3}>
                {paginatedDepartments.map((department, index) => (
                  <Grid item xs={12} sm={6} md={4} key={department._id}>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 * index }}
                      whileHover={{ y: -5 }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          borderRadius: 3,
                          overflow: 'hidden',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <School />
                              </Avatar>
                              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                {department.name}
                              </Typography>
                            </Box>
                            <Box>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleOpenEditDialog(department)}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(department._id)}
                                  sx={{
                                    '&:hover': {
                                      backgroundColor: 'error.light',
                                      color: 'error.main'
                                    }
                                  }}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Group sx={{ fontSize: '1rem' }} /> Sections ({department.sections.length})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {department.sections.map((section, index) => (
                                <Chip
                                  key={index}
                                  label={section}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Chip
                              icon={<AdminPanelSettings />}
                              label={`${department.teacherCount || 0} Teachers`}
                              size="small"
                              variant="filled"
                              onClick={() => handleFetchMembers(department, 'teacher')}
                              sx={{
                                bgcolor: 'secondary.light',
                                color: 'secondary.dark',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'secondary.main', color: 'white' }
                              }}
                            />
                            <Chip
                              icon={<Group />}
                              label={`${department.studentCount || 0} Students`}
                              size="small"
                              variant="filled"
                              onClick={() => handleFetchMembers(department, 'student')}
                              sx={{
                                bgcolor: 'info.light',
                                color: 'info.dark',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'info.main', color: 'white' }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </motion.div>
            )}
          </>
        )}

        {/* Department Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            {dialogMode === 'create' ? 'Add New Department' : 'Edit Department'}
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <DialogContentText sx={{ mb: 2 }}>
              {dialogMode === 'create'
                ? 'Enter the details for the new department.'
                : 'Update the department details.'}
            </DialogContentText>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, borderRadius: 2 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            <TextField
              autoFocus
              margin="dense"
              label="Department Name"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <School sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            <TextField
              margin="dense"
              label="Sections (comma separated)"
              fullWidth
              variant="outlined"
              value={sections}
              onChange={(e) => setSections(e.target.value)}
              helperText="Example: Section-A, Section-B, Section-C"
              InputProps={{
                startAdornment: <Group sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(45deg, #f44336 30%, #ff5252 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #d32f2f 30%, #ff1744 90%)'
                }
              }}
            >
              {dialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Member List Dialog */}
        <Dialog
          open={memberListOpen}
          onClose={() => setMemberListOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
            {memberListType === 'teacher' ? <AdminPanelSettings color="secondary" /> : <Group color="info" />}
            {selectedDept?.name} - {memberListType === 'teacher' ? 'Teachers' : 'Students'}
          </DialogTitle>
          <DialogContent dividers>
            {loadingMembers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} />
              </Box>
            ) : deptMembers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="textSecondary">
                  No {memberListType}s found in this department.
                </Typography>
              </Box>
            ) : (
              <List sx={{ pt: 0 }}>
                {deptMembers.map((member, index) => (
                  <React.Fragment key={member._id}>
                    <ListItem sx={{ px: 1, py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: member.role === 'teacher' ? 'secondary.main' : 'info.main' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {member.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            {member.role === 'student' && (
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 'medium' }}>
                                <Badge sx={{ fontSize: '14px' }} /> Reg No: {member.rollNumber || 'N/A'}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Email sx={{ fontSize: '14px' }} /> {member.email}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < deptMembers.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setMemberListOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </motion.div>
  );
};

export default Departments;