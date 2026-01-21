import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Close } from '@mui/icons-material';

const taskStatuses = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

const priorities = [
  { value: 'low', label: 'נמוך' },
  { value: 'medium', label: 'בינוני' },
  { value: 'high', label: 'גבוה' },
];

export default function TaskDialog({ open, onClose, onSave, task }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    riderId: '',
    riderName: '',
    vehicleId: '',
    vehiclePlate: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        dueDate: task.dueDate ? formatDateForInput(task.dueDate) : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        riderId: '',
        riderName: '',
        vehicleId: '',
        vehiclePlate: '',
        priority: 'medium',
        status: 'pending',
        dueDate: '',
      });
    }
    setErrors({});
  }, [task, open]);

  const formatDateForInput = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'שדה חובה';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'שדה חובה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      dir="rtl"
    >
      {isMobile ? (
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={onClose}>
              <Close />
            </IconButton>
            <Typography sx={{ flex: 1 }} variant="h6">
              {task ? 'עריכת משימה' : 'הוספת משימה חדשה'}
            </Typography>
            <Button autoFocus color="inherit" onClick={handleSubmit}>
              {task ? 'עדכן' : 'הוסף'}
            </Button>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle>{task ? 'עריכת משימה' : 'הוספת משימה חדשה'}</DialogTitle>
      )}
      <DialogContent sx={{ pt: isMobile ? 3 : 1 }}>
        <Grid container spacing={2} sx={{ mt: isMobile ? 0 : 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="כותרת"
              value={formData.title}
              onChange={handleChange('title')}
              error={!!errors.title}
              helperText={errors.title}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="תיאור"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange('description')}
              error={!!errors.description}
              helperText={errors.description}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="שם רוכב"
              value={formData.riderName}
              onChange={handleChange('riderName')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="מספר רישוי כלי"
              value={formData.vehiclePlate}
              onChange={handleChange('vehiclePlate')}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>עדיפות</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleChange('priority')}
                label="עדיפות"
              >
                {priorities.map((priority) => (
                  <MenuItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={formData.status}
                onChange={handleChange('status')}
                label="סטטוס"
              >
                {taskStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="תאריך יעד"
              type="date"
              value={formData.dueDate}
              onChange={handleChange('dueDate')}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      {!isMobile && (
        <DialogActions>
          <Button onClick={onClose}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained">
            {task ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
