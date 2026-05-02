import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
  Chip
} from '@mui/material';
import { Delete, Add, Schedule, AttachFile } from '@mui/icons-material';
import api from '../services/api';

const DateTime12hPicker = ({ label, value, onChange, sx }) => {
  const datePart = value ? value.split('T')[0] : '';
  const timePart = value ? value.split('T')[1] : '12:00';
  const [hStr, mStr] = timePart ? timePart.split(':') : ['12', '00'];
  const h = parseInt(hStr) || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = (h % 12 || 12).toString();
  const minute = mStr || '00';

  const update = (d, h, m, ap) => {
    if (!d) {
       onChange({ target: { value: '' } });
       return;
    }
    let h24 = parseInt(h);
    if (ap === 'PM' && h24 !== 12) h24 += 12;
    if (ap === 'AM' && h24 === 12) h24 = 0;
    const timeStr = `${h24.toString().padStart(2, '0')}:${m}`;
    onChange({ target: { value: `${d}T${timeStr}` } });
  };

  return (
    <Box sx={{ ...sx, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          type="date"
          value={datePart}
          onChange={(e) => update(e.target.value, h12, minute, ampm)}
          sx={{ flex: 2 }}
          size="small"
        />
        <Select
          value={h12}
          onChange={(e) => update(datePart, e.target.value, minute, ampm)}
          sx={{ flex: 1, minWidth: '60px' }}
          size="small"
        >
          {[...Array(12)].map((_, i) => (
            <MenuItem key={i+1} value={(i+1).toString()}>{i+1}</MenuItem>
          ))}
        </Select>
        <Typography sx={{ alignSelf: 'center' }}>:</Typography>
        <Select
          value={minute}
          onChange={(e) => update(datePart, h12, e.target.value, ampm)}
          sx={{ flex: 1, minWidth: '60px' }}
          size="small"
        >
          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
            <MenuItem key={m} value={m}>{m}</MenuItem>
          ))}
        </Select>
        <Select
          value={ampm}
          onChange={(e) => update(datePart, h12, minute, e.target.value)}
          sx={{ flex: 1, minWidth: '70px' }}
          size="small"
        >
          <MenuItem value="AM">AM</MenuItem>
          <MenuItem value="PM">PM</MenuItem>
        </Select>
      </Box>
    </Box>
  );
};

const ScheduleMessageModal = ({ open, onClose, type, groupId, recipientId, onScheduleCreated }) => {
  const [scheduleType, setScheduleType] = useState('one-time');
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  // Recurring state
  const [frequency, setFrequency] = useState('weekly');
  const [days, setDays] = useState([]);
  const [time, setTime] = useState('09:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Multi-step state
  const [followUps, setFollowUps] = useState([]);
  const [newFollowUpContent, setNewFollowUpContent] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');

  const handleAddFollowUp = () => {
    if (newFollowUpContent && newFollowUpDate) {
      setFollowUps([...followUps, { content: newFollowUpContent, scheduledAt: newFollowUpDate }]);
      setNewFollowUpContent('');
      setNewFollowUpDate('');
    }
  };

  const handleRemoveFollowUp = (index) => {
    setFollowUps(followUps.filter((_, i) => i !== index));
  };

  const handleDayToggle = (day) => {
    setDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append('type', type);
      if (groupId) formData.append('groupId', groupId);
      if (recipientId) formData.append('recipientId', recipientId);
      formData.append('content', content);
      formData.append('scheduleType', scheduleType);
      
      if (scheduleType === 'one-time') {
        formData.append('scheduledAt', scheduledAt ? new Date(scheduledAt).toISOString() : '');
      } else if (scheduleType === 'recurring') {
        const rule = {
          frequency,
          days,
          time,
          startDate: startDate ? new Date(startDate).toISOString() : '',
          endDate: endDate ? new Date(endDate).toISOString() : ''
        };
        formData.append('recurringRule', JSON.stringify(rule));
      } else if (scheduleType === 'multi-step') {
        formData.append('scheduledAt', scheduledAt ? new Date(scheduledAt).toISOString() : '');
        const follow = followUps.map(f => ({
          content: f.content,
          scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : ''
        }));
        formData.append('followUpMessages', JSON.stringify(follow));
      }
      
      files.forEach(file => formData.append('files', file));

      await api.post('/scheduled-messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onScheduleCreated();
      onClose();
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Failed to schedule message');
    }
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Schedule /> Schedule Message
      </DialogTitle>
      <DialogContent>
        {files.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Attachments:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {files.map((file, index) => (
                <Chip
                  key={index}
                  label={`${file.name}`}
                  onDelete={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                  size="small"
                  icon={<AttachFile />}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              if (selected.length > 0) {
                setFiles(prev => [...prev, ...selected]);
              }
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            style={{ display: 'none' }}
            multiple
          />
          <IconButton 
            onClick={() => fileInputRef.current?.click()}
            color="primary"
          >
            <AttachFile />
          </IconButton>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Message Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            sx={{ mt: 1 }}
          />
        </Box>
        
        <Box sx={{ mb: 2 }} />

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Schedule Type</FormLabel>
          <RadioGroup row value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
            <FormControlLabel value="one-time" control={<Radio />} label="One-time" />
            <FormControlLabel value="recurring" control={<Radio />} label="Recurring" />
            <FormControlLabel value="multi-step" control={<Radio />} label="Multi-step" />
          </RadioGroup>
        </FormControl>

        {scheduleType === 'one-time' && (
          <DateTime12hPicker
            label="Schedule Date & Time"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        )}

        {scheduleType === 'recurring' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value)} label="Frequency">
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>

            {frequency === 'weekly' && (
              <Box>
                <Typography variant="caption">Repeat on:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {weekDays.map(day => (
                    <Chip
                      key={day}
                      label={day.slice(0, 3)}
                      onClick={() => handleDayToggle(day)}
                      color={days.includes(day) ? "primary" : "default"}
                      variant={days.includes(day) ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
               <Typography variant="caption" color="text.secondary">Time:</Typography>
               <Select
                  value={(parseInt(time.split(':')[0]) % 12 || 12).toString()}
                  onChange={(e) => {
                     const h12 = parseInt(e.target.value);
                     const m = time.split(':')[1];
                     const oldH = parseInt(time.split(':')[0]);
                     const isPM = oldH >= 12;
                     let h24 = h12;
                     if (isPM && h12 !== 12) h24 += 12;
                     if (!isPM && h12 === 12) h24 = 0;
                     setTime(`${h24.toString().padStart(2, '0')}:${m}`);
                  }}
                  size="small"
                  sx={{ minWidth: '70px' }}
               >
                 {[...Array(12)].map((_, i) => <MenuItem key={i+1} value={(i+1).toString()}>{i+1}</MenuItem>)}
               </Select>
               <Typography>:</Typography>
               <Select
                  value={time.split(':')[1]}
                  onChange={(e) => {
                      const h = time.split(':')[0];
                      setTime(`${h}:${e.target.value}`);
                  }}
                  size="small"
                  sx={{ minWidth: '70px' }}
               >
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
               </Select>
               <Select
                  value={parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                  onChange={(e) => {
                      const newAmpm = e.target.value;
                      let h = parseInt(time.split(':')[0]);
                      const m = time.split(':')[1];
                      if (newAmpm === 'PM' && h < 12) h += 12;
                      if (newAmpm === 'AM' && h >= 12) h -= 12;
                      setTime(`${h.toString().padStart(2, '0')}:${m}`);
                  }}
                  size="small"
                  sx={{ minWidth: '80px' }}
               >
                  <MenuItem value="AM">AM</MenuItem>
                  <MenuItem value="PM">PM</MenuItem>
               </Select>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="date"
                  label="End Date (Optional)"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
            </Box>
          </Box>
        )}

        {scheduleType === 'multi-step' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Initial Message:</Typography>
            <DateTime12hPicker
                label="Send Initial Message At"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
            />
            
            <Typography variant="subtitle2" gutterBottom>Follow-up Messages:</Typography>
            <List dense>
              {followUps.map((f, i) => (
                <ListItem key={i}>
                  <ListItemText primary={f.content} secondary={`At: ${new Date(f.scheduledAt).toLocaleString()}`} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleRemoveFollowUp(i)}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ border: '1px dashed grey', p: 1, borderRadius: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Follow-up Message"
                  value={newFollowUpContent}
                  onChange={(e) => setNewFollowUpContent(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <DateTime12hPicker
                  label="Send At"
                  value={newFollowUpDate}
                  onChange={(e) => setNewFollowUpDate(e.target.value)}
                />
                <Button startIcon={<Add />} onClick={handleAddFollowUp} size="small">Add Follow-up</Button>
            </Box>
          </Box>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Schedule</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleMessageModal;
