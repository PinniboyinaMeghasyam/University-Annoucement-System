import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  Box,
  Typography,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close,
  Image as ImageIcon,
  Description as FileIcon,
  Download
} from '@mui/icons-material';

const MediaGallery = ({ open, onClose, messages, title = "Media Gallery" }) => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter messages with files
  const mediaMessages = messages.filter(msg => 
    msg.files && msg.files.length > 0
  );

  // Extract all files with metadata
  const allFiles = mediaMessages.flatMap(msg => 
    msg.files.map(file => ({
      ...file,
      messageId: msg._id,
      sender: msg.sender,
      createdAt: msg.createdAt,
      type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/jpeg' : 'application/octet-stream')
    }))
  );

  const images = allFiles.filter(f => f.type?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  const docs = allFiles.filter(f => !f.type?.startsWith('image/') && !f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));

  const handleDownload = (url, filename) => {
     const link = document.createElement('a');
     link.href = url;
     link.download = filename || 'download';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
        <Typography variant="h6">{title}</Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      
      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label={`Images (${images.length})`} />
        <Tab label={`Documents (${docs.length})`} />
      </Tabs>

      <DialogContent dividers>
        {tab === 0 && (
          <Grid container spacing={2}>
            {images.length > 0 ? (
              images.map((file, index) => (
                <Grid item xs={4} sm={3} md={2} key={index}>
                  <Box 
                    position="relative"
                    sx={{ 
                      aspectRatio: '1/1',
                      cursor: 'pointer',
                      border: '1px solid #eee',
                      borderRadius: 1,
                      overflow: 'hidden',
                      '&:hover .overlay': { opacity: 1 }
                    }}
                  >
                    <img 
                      src={file.url || file.secure_url} 
                      alt={file.fileName} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onClick={() => window.open(file.url || file.secure_url, '_blank')}
                    />
                    <Box
                      className="overlay"
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bgcolor="rgba(0,0,0,0.3)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      opacity={0}
                      transition="opacity 0.2s"
                    >
                        <IconButton 
                            size="small" 
                            sx={{ color: 'white' }}
                            onClick={() => handleDownload(file.url || file.secure_url, file.fileName)}
                        >
                            <Download />
                        </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))
            ) : (
              <Box p={4} width="100%" textAlign="center">
                <Typography color="textSecondary">No images found</Typography>
              </Box>
            )}
          </Grid>
        )}

        {tab === 1 && (
          <Box>
            {docs.length > 0 ? (
              docs.map((file, index) => (
                <Box 
                  key={index} 
                  p={2} 
                  mb={1} 
                  border="1px solid #eee" 
                  borderRadius={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center">
                    <FileIcon color="action" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle2">{file.fileName || 'Unknown File'}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(file.createdAt).toLocaleDateString()} • {file.sender?.name || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={() => handleDownload(file.url || file.secure_url, file.fileName)}>
                    <Download />
                  </IconButton>
                </Box>
              ))
            ) : (
              <Box p={4} textAlign="center">
                <Typography color="textSecondary">No documents found</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaGallery;
