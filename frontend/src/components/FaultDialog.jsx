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
  Autocomplete,
} from '@mui/material';
import { vehiclesAPI, ridersAPI } from '../services/api';

const severityOptions = [
  { value: 'critical', label: 'קריטית' },
  { value: 'high', label: 'גבוהה' },
  { value: 'medium', label: 'בינונית' },
  { value: 'low', label: 'נמוכה' },
];

const statusOptions = [
  { value: 'open', label: 'פתוחה' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'resolved', label: 'נפתרה' },
];

export default function FaultDialog({ open, onClose, onSave, fault }) {
  const [formData, setFormData] = useState({
    vehicleId: '',
    riderId: '',
    description: '',
    severity: 'medium',
    status: 'open',
    reportedDate: new Date().toISOString().split('T')[0],
    resolvedDate: '',
    notes: '',
  });

  const [vehicles, setVehicles] = useState([]);
  const [riders, setRiders] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      loadVehicles();
      loadRiders();
    }
  }, [open]);

  useEffect(() => {
    if (fault) {
      setFormData({
        vehicleId: fault.vehicleId || '',
        riderId: fault.riderId || '',
        description: fault.description || '',
        severity: fault.severity || 'medium',
        status: fault.status || 'open',
        reportedDate: fault.reportedDate ? fault.reportedDate.split('T')[0] : new Date().toISOString().split('T')[0],
        resolvedDate: fault.resolvedDate ? fault.resolvedDate.split('T')[0] : '',
        notes: fault.notes || '',
      });
    } else {
      setFormData({
        vehicleId: '',
        riderId: '',
        description: '',
        severity: 'medium',
        status: 'open',
        reportedDate: new Date().toISOString().split('T')[0],
        resolvedDate: '',
        notes: '',
      });
    }
    setErrors({});
  }, [fault, open]);

  const loadVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      setVehicles(response.data.vehicles || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  const loadRiders = async () => {
    try {
      const response = await ridersAPI.getAll();
      setRiders(response.data.riders || []);
    } catch (err) {
      console.error('Error loading riders:', err);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleAutocompleteChange = (field) => (event, value) => {
    setFormData({ ...formData, [field]: value?.id || '' });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = 'שדה חובה';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'שדה חובה';
    }

    if (!formData.reportedDate) {
      newErrors.reportedDate = 'שדה חובה';
    }

    if (formData.status === 'resolved' && !formData.resolvedDate) {
      newErrors.resolvedDate = 'חובה להזין תאריך פתרון לתקלה שנפתרה';
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>{fault ? 'עריכת תקלה' : 'הוספת תקלה חדשה'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={vehicles}
              getOptionLabel={(option) => option.licensePlate || ''}
              value={vehicles.find(v => v.id === formData.vehicleId) || null}
              onChange={handleAutocompleteChange('vehicleId')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="כלי"
                  error={!!errors.vehicleId}
                  helperText={errors.vehicleId}
                  required
                />
              )}
              dir="rtl"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={riders}
              getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''}`.trim()}
              value={riders.find(r => r.id === formData.riderId) || null}
              onChange={handleAutocompleteChange('riderId')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="רוכב"
                />
              )}
              dir="rtl"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="תיאור התקלה"
              value={formData.description}
              onChange={handleChange('description')}
              error={!!errors.description}
              helperText={errors.description}
              required
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>חומרה</InputLabel>
              <Select
                value={formData.severity}
                onChange={handleChange('severity')}
                label="חומרה"
              >
                {severityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={formData.status}
                onChange={handleChange('status')}
                label="סטטוס"
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="תאריך דיווח"
              type="date"
              value={formData.reportedDate}
              onChange={handleChange('reportedDate')}
              error={!!errors.reportedDate}
              helperText={errors.reportedDate}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="תאריך פתרון"
              type="date"
              value={formData.resolvedDate}
              onChange={handleChange('resolvedDate')}
              error={!!errors.resolvedDate}
              helperText={errors.resolvedDate}
              InputLabelProps={{ shrink: true }}
              disabled={formData.status !== 'resolved'}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="הערות"
              value={formData.notes}
              onChange={handleChange('notes')}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained">
          {fault ? 'עדכן' : 'הוסף'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
