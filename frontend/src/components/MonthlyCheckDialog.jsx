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
} from '@mui/material';

const checkStatuses = [
  { value: 'passed', label: 'עבר' },
  { value: 'failed', label: 'נכשל' },
  { value: 'pending', label: 'ממתין' },
];

export default function MonthlyCheckDialog({ open, onClose, onSave, check }) {
  const [formData, setFormData] = useState({
    vehicleId: '',
    vehiclePlate: '',
    riderId: '',
    riderName: '',
    checkDate: '',
    kilometers: 0,
    status: 'pending',
    notes: '',
    checkedItems: {
      brakes: false,
      lights: false,
      tires: false,
      engine: false,
      oil: false,
      battery: false,
    },
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (check) {
      setFormData({
        ...check,
        checkDate: check.checkDate ? formatDateForInput(check.checkDate) : '',
        checkedItems: check.checkedItems || {
          brakes: false,
          lights: false,
          tires: false,
          engine: false,
          oil: false,
          battery: false,
        },
      });
    } else {
      setFormData({
        vehicleId: '',
        vehiclePlate: '',
        riderId: '',
        riderName: '',
        checkDate: new Date().toISOString().split('T')[0],
        kilometers: 0,
        status: 'pending',
        notes: '',
        checkedItems: {
          brakes: false,
          lights: false,
          tires: false,
          engine: false,
          oil: false,
          battery: false,
        },
      });
    }
    setErrors({});
  }, [check, open]);

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

    if (!formData.vehiclePlate.trim()) {
      newErrors.vehiclePlate = 'שדה חובה';
    }

    if (!formData.checkDate) {
      newErrors.checkDate = 'שדה חובה';
    }

    if (!formData.kilometers || formData.kilometers < 0) {
      newErrors.kilometers = 'יש להזין מספר חיובי';
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
      <DialogTitle>{check ? 'עריכת בקרה' : 'הוספת בקרה חדשה'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="מספר רישוי"
              value={formData.vehiclePlate}
              onChange={handleChange('vehiclePlate')}
              error={!!errors.vehiclePlate}
              helperText={errors.vehiclePlate}
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

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="תאריך בקרה"
              type="date"
              value={formData.checkDate}
              onChange={handleChange('checkDate')}
              error={!!errors.checkDate}
              helperText={errors.checkDate}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="קילומטרז"
              type="number"
              value={formData.kilometers}
              onChange={handleChange('kilometers')}
              error={!!errors.kilometers}
              helperText={errors.kilometers}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={formData.status}
                onChange={handleChange('status')}
                label="סטטוס"
              >
                {checkStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="הערות"
              multiline
              rows={3}
              value={formData.notes}
              onChange={handleChange('notes')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained">
          {check ? 'עדכן' : 'הוסף'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
