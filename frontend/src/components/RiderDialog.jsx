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
  Autocomplete,
} from '@mui/material';
import { vehiclesAPI } from '../services/api';

const riderStatuses = [
  { value: 'active', label: 'פעיל' },
  { value: 'inactive', label: 'לא פעיל' },
  { value: 'frozen', label: 'מוקפא' },
];

const assignmentStatuses = [
  { value: 'assigned', label: 'משויך' },
  { value: 'unassigned', label: 'לא משויך' },
];

const districts = [
  'מחוז מרכז',
  'מחוז תל אביב',
  'מחוז ירושלים',
  'מחוז צפון',
  'מחוז דרום',
  'מחוז חיפה',
  'מחוז באר שבע',
];

export default function RiderDialog({ open, onClose, onSave, rider }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    phone: '',
    email: '',
    region: {
      district: '',
      station: '',
    },
    riderStatus: 'active',
    assignmentStatus: 'unassigned',
    assignedVehicleId: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
    },
  });

  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);

  // טעינת רשימת כלים פעילים ולא משויכים
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const response = await vehiclesAPI.getAll();
        console.log('All vehicles:', response.data.vehicles);

        // סינון רק כלים פעילים שלא משויכים (או הכלי הנוכחי אם עורכים)
        const availableVehicles = (response.data.vehicles || []).filter(vehicle => {
          // אם עורכים רוכב, להציג את הכלי הנוכחי שלו גם אם משויך
          if (rider && vehicle.id === rider.assignedVehicleId) {
            return true;
          }
          // אחרת, להציג רק כלים לא משויכים
          return !vehicle.isAssigned || vehicle.assignedRider === null || vehicle.assignedRider === undefined;
        });

        console.log('Available vehicles:', availableVehicles);
        setVehicles(availableVehicles);
      } catch (err) {
        console.error('Error loading vehicles:', err);
      }
    };

    if (open) {
      loadVehicles();
    }
  }, [open, rider]);

  useEffect(() => {
    if (rider) {
      setFormData({
        firstName: rider.firstName || '',
        lastName: rider.lastName || '',
        idNumber: rider.idNumber || '',
        phone: rider.phone || '',
        email: rider.email || '',
        region: rider.region || { district: '', station: '' },
        riderStatus: rider.riderStatus || 'active',
        assignmentStatus: rider.assignmentStatus || 'unassigned',
        assignedVehicleId: rider.assignedVehicleId || '',
        address: rider.address || { street: '', city: '', postalCode: '' },
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        idNumber: '',
        phone: '',
        email: '',
        region: {
          district: '',
          station: '',
        },
        riderStatus: 'active',
        assignmentStatus: 'unassigned',
        assignedVehicleId: '',
        address: {
          street: '',
          city: '',
          postalCode: '',
        },
      });
    }
    setErrors({});
  }, [rider, open]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }

    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'שדה חובה';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'שדה חובה';
    }

    if (!formData.idNumber.trim()) {
      newErrors.idNumber = 'שדה חובה';
    } else if (!/^\d{9}$/.test(formData.idNumber)) {
      newErrors.idNumber = 'תעודת זהות חייבת להכיל 9 ספרות';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'שדה חובה';
    } else if (!/^0\d{1,2}-?\d{7}$/.test(formData.phone)) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    // בדיקה שיש כלי משויך אם הסטטוס הוא "משויך"
    if (formData.assignmentStatus === 'assigned' && !formData.assignedVehicleId) {
      newErrors.assignedVehicleId = 'חובה לבחור כלי משויך';
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
      <DialogTitle>{rider ? 'עריכת רוכב' : 'הוספת רוכב חדש'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* פרטים אישיים */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">
              פרטים אישיים
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="שם פרטי"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="שם משפחה"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="תעודת זהות"
              value={formData.idNumber}
              onChange={handleChange('idNumber')}
              error={!!errors.idNumber}
              helperText={errors.idNumber}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="טלפון"
              value={formData.phone}
              onChange={handleChange('phone')}
              error={!!errors.phone}
              helperText={errors.phone}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="אימייל"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>

          {/* מחוז ותחנה */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
              מחוז ותחנה
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>מחוז</InputLabel>
              <Select
                value={formData.region.district}
                onChange={handleChange('region.district')}
                label="מחוז"
              >
                {districts.map((district) => (
                  <MenuItem key={district} value={district}>
                    {district}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="תחנה"
              value={formData.region.station}
              onChange={handleChange('region.station')}
            />
          </Grid>

          {/* כתובת */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
              כתובת
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="רחוב"
              value={formData.address.street}
              onChange={handleChange('address.street')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="עיר"
              value={formData.address.city}
              onChange={handleChange('address.city')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="מיקוד"
              value={formData.address.postalCode}
              onChange={handleChange('address.postalCode')}
            />
          </Grid>

          {/* סטטוסים */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
              סטטוסים
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>סטטוס רוכב</InputLabel>
              <Select
                value={formData.riderStatus}
                onChange={handleChange('riderStatus')}
                label="סטטוס רוכב"
              >
                {riderStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>סטטוס שיוך</InputLabel>
              <Select
                value={formData.assignmentStatus}
                onChange={handleChange('assignmentStatus')}
                label="סטטוס שיוך"
              >
                {assignmentStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* שדה בחירת כלי - רק אם משויך */}
          {formData.assignmentStatus === 'assigned' && (
            <Grid item xs={12}>
              <Autocomplete
                options={vehicles}
                getOptionLabel={(option) => {
                  const number = option.vehicleNumber || option.internalNumber || option.licensePlate || 'ללא מספר';
                  const type = option.type || 'אופנוע';
                  return `${number} - ${type}`;
                }}
                value={vehicles.find(v => v.id === formData.assignedVehicleId) || null}
                onChange={(event, newValue) => {
                  setFormData({
                    ...formData,
                    assignedVehicleId: newValue ? newValue.id : '',
                  });
                  if (errors.assignedVehicleId) {
                    setErrors({ ...errors, assignedVehicleId: '' });
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="כלי משויך"
                    required={formData.assignmentStatus === 'assigned'}
                    error={!!errors.assignedVehicleId}
                    helperText={errors.assignedVehicleId || `בחר כלי (${vehicles.length} כלים זמינים)`}
                  />
                )}
                noOptionsText="לא נמצאו כלים זמינים"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained">
          {rider ? 'עדכן' : 'הוסף'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
