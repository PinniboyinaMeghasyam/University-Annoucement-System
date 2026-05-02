import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputAdornment
} from '@mui/material';
import {
  Delete,
  Upload,
  Send,
  Title,
  Description,
  Category,
  CloudUpload,
  Attachment,
  Public,
  PushPin,
  Event
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CreateAnnouncement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);

      // For teachers, we don't need to send section as it's determined by their profile
      // For admins, we send the selected section
      if (user.role === 'admin') {
        formData.append('section', section);
        // If admin selected 'All-Sections', we'll set isGlobal to true in the backend
        if (section === 'All-Sections') {
          formData.append('isGlobal', true);
        }
      }

      // Append notice options
      formData.append('isGlobal', isGlobal);
      formData.append('isPinned', isPinned);
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }

      files.forEach(file => {
        formData.append('files', file);
      });

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await api.post('/announcements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(interval);
      setUploadProgress(100);
      setSuccess(true);
      setTitle('');
      setDescription('');
      setSection(user?.section || '');
      setIsGlobal(false);
      setIsPinned(false);
      setExpiryDate('');
      setFiles([]);

      // Redirect to announcements page after a short delay
      setTimeout(() => {
        navigate('/announcements');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create announcement');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user || user.role === 'student') {
    navigate('/announcements');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Container component="main" maxWidth="md">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 4,
              mt: 4,
              borderRadius: 3,
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #ff9800 30%, #ffc107 90%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)'
                  }}
                >
                  <Send sx={{ fontSize: 40, color: 'white' }} />
                </Box>
              </motion.div>
              <Typography component="h1" variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Create New Announcement
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.role === 'admin'
                  ? 'Share important information with all users or specific sections'
                  : 'Share important information with your students'}
              </Typography>
            </Box>

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

            {success && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert
                  severity="success"
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  Announcement created successfully!
                </Alert>
              </motion.div>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="title"
                  label="Announcement Title"
                  name="title"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  InputProps={{
                    startAdornment: <Title sx={{ mr: 1, color: 'text.primary' }} />
                  }}
                  sx={{ mb: 3 }}
                />
              </motion.div>

              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="description"
                  label="Description"
                  name="description"
                  multiline
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  InputProps={{
                    startAdornment: <Description sx={{ mr: 1, color: 'text.primary' }} />
                  }}
                  sx={{ mb: 3 }}
                />
              </motion.div>

              {user.role === 'admin' && (
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
                    <InputLabel id="section-label">Target Section</InputLabel>
                    <Select
                      labelId="section-label"
                      id="section"
                      value={section}
                      label="Target Section"
                      onChange={(e) => setSection(e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          <Category sx={{ color: 'text.primary' }} />
                        </InputAdornment>
                      }
                    >
                      {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => (
                        <MenuItem key={num} value={`Section-${num}`}>
                          {`Section-${num}`}
                        </MenuItem>
                      ))}
                      <MenuItem value="All-Sections">All Sections</MenuItem>
                    </Select>
                    {section === 'All-Sections' && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        This announcement will be visible to all students and staff.
                      </Typography>
                    )}
                  </FormControl>
                </motion.div>
              )}

              {/* Global and Pinned Notice Options */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Card sx={{ mb: 3, borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                      <PushPin /> Notice Options
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isGlobal}
                            onChange={(e) => setIsGlobal(e.target.checked)}
                            icon={<Public />}
                            checkedIcon={<Public />}
                          />
                        }
                        label={<span style={{ color: 'var(--mui-palette-text-primary)' }}>Global Notice (Visible to ALL users)</span>}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            icon={<PushPin />}
                            checkedIcon={<PushPin />}
                          />
                        }
                        label={<span style={{ color: 'var(--mui-palette-text-primary)' }}>Pin this notice (Stay at top)</span>}
                      />
                    </FormGroup>

                    <TextField
                      fullWidth
                      label="Expiry Date (optional)"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      InputProps={{
                        startAdornment: <Event sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Card sx={{ mb: 3, borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                      <Upload /> Attach Files
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <input
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        id="raised-button-file"
                        multiple
                        type="file"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="raised-button-file">
                        <Button
                          variant="outlined"
                          component="span"
                          sx={{
                            py: 2,
                            px: 4,
                            borderRadius: 3,
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'primary.main',
                              color: 'white'
                            }
                          }}
                        >
                          <CloudUpload sx={{ mr: 1 }} />
                          Choose Files
                        </Button>
                      </label>
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        Supported formats: PDF, PPT, DOC, JPG, PNG
                      </Typography>
                    </Box>

                    {files.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.primary' }}>
                          Selected Files:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {files.map((file, index) => (
                            <motion.div
                              key={index}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.1 * index }}
                            >
                              <Card
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.02)'
                                  }
                                }}
                              >
                                <CardContent sx={{ py: 1, px: 2 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Attachment sx={{ color: 'text.secondary' }} />
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                          {file.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {formatFileSize(file.size)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveFile(index)}
                                      sx={{
                                        '&:hover': {
                                          backgroundColor: 'error.light',
                                          color: 'error.main'
                                        }
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1 }} />
                    <Typography variant="body2" align="center" sx={{ mt: 1, color: 'text.primary' }}>
                      Uploading... {uploadProgress}%
                    </Typography>
                  </Box>
                </motion.div>
              )}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 2,
                    mb: 2,
                    py: 1.5,
                    background: 'linear-gradient(45deg, #ff9800 30%, #ffc107 90%)',
                    borderRadius: 3,
                    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #f57c00 30%, #ffa000 90%)',
                      boxShadow: '0 6px 20px rgba(255, 152, 0, 0.6)'
                    }
                  }}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Send />}
                >
                  {loading ? 'Publishing...' : 'Publish Announcement'}
                </Button>
              </motion.div>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </motion.div>
  );
};

export default CreateAnnouncement;