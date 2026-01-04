import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Typography,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Box,
  Autocomplete,
} from '@mui/material';
import { vehiclesAPI, ridersAPI } from '../services/api';

const userRoles = [
  { value: 'super_admin', label: 'מנהל על' },
  { value: 'manager', label: 'מנהל' },
  { value: 'secretary', label: 'מזכירה' },
  { value: 'logistics', label: 'לוגיסטיקה' },
  { value: 'rider', label: 'רוכב' },
  { value: 'regional_manager', label: 'מנהל אזורי' },
];

export default function UserDialog({ open, onClose, onSave, user }) {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    roles: ['rider'],
    isActive: true,
    vehicleAccess: [],
    riderId: null, // שיוך לרוכב
  });

  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [riders, setRiders] = useState([]);

  // טעינת רשימת כלים ורוכבים
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehiclesResponse, ridersResponse] = await Promise.all([
          vehiclesAPI.getAll(),
          ridersAPI.getAll()
        ]);
        setVehicles(vehiclesResponse.data.vehicles || []);
        setRiders(ridersResponse.data.riders || ridersResponse.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (user) {
      // תמיכה הן ב-roles חדש והן ב-role ישן
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'rider'];

      setFormData({
        username: user.username || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        roles: userRoles,
        isActive: user.isActive !== undefined ? user.isActive : true,
        vehicleAccess: user.vehicleAccess || [],
        riderId: user.riderId || null,
      });
    } else {
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        roles: ['rider'],
        isActive: true,
        vehicleAccess: [],
        riderId: null,
      });
    }
    setErrors({});
  }, [user, open]);

  const handleChange = (field) => (event) => {
    const value = field === 'isActive' ? event.target.checked : event.target.value;
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleRolesChange = (event) => {
    const value = event.target.value;
    setFormData({ ...formData, roles: typeof value === 'string' ? value.split(',') : value });
    if (errors.roles) {
      setErrors({ ...errors, roles: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'שדה חובה';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'שדה חובה';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'שדה חובה';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    if (!user && !formData.password) {
      newErrors.password = 'שדה חובה למשתמש חדש';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'סיסמה חייבת להכיל לפחות 6 תווים';
    }

    if (!formData.roles || formData.roles.length === 0) {
      newErrors.roles = 'חובה לבחור לפחות תפקיד אחד';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const dataToSave = { ...formData };
      if (user && !dataToSave.password) {
        delete dataToSave.password;
      }
      onSave(dataToSave);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{user ? 'עריכת משתמש' : 'הוספת משתמש חדש'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="שם משתמש"
              value={formData.username}
              onChange={handleChange('username')}
              error={!!errors.username}
              helperText={errors.username}
              required
            />
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

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="אימייל"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="טלפון"
              value={formData.phone}
              onChange={handleChange('phone')}
              helperText="אופציונלי"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={user ? 'סיסמה חדשה (השאר ריק לשמירה)' : 'סיסמה'}
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              error={!!errors.password}
              helperText={errors.password || (user ? 'השאר ריק אם אין צורך לשנות' : '')}
              required={!user}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.roles}>
              <InputLabel>תפקידים</InputLabel>
              <Select
                multiple
                value={formData.roles}
                onChange={handleRolesChange}
                label="תפקידים"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const role = userRoles.find(r => r.value === value);
                      return (
                        <Chip key={value} label={role?.label || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {userRoles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Checkbox checked={formData.roles.indexOf(role.value) > -1} />
                    <ListItemText primary={role.label} />
                  </MenuItem>
                ))}
              </Select>
              {errors.roles && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                  {errors.roles}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* שיוך לרוכב - רק אם יש תפקיד 'rider' */}
          {formData.roles.includes('rider') && (
            <Grid item xs={12}>
              <Autocomplete
                options={riders}
                getOptionLabel={(option) =>
                  `${option.firstName || ''} ${option.lastName || ''} ${option.idNumber ? `(ת.ז: ${option.idNumber})` : ''}`
                }
                value={riders.find(r => (r._id || r.id) === formData.riderId) || null}
                onChange={(event, newValue) => {
                  setFormData({
                    ...formData,
                    riderId: newValue ? (newValue._id || newValue.id) : null,
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="שיוך לרוכב (אופציונלי)"
                    helperText="חבר משתמש זה לפרופיל רוכב קיים במערכת"
                  />
                )}
                noOptionsText="לא נמצאו רוכבים"
                isOptionEqualToValue={(option, value) =>
                  (option._id || option.id) === (value._id || value.id)
                }
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={vehicles}
              getOptionLabel={(option) => {
                const licensePlate = option.licensePlate || 'ללא ל"ז';
                const internalNumber = option.internalNumber || 'ללא מספר פנימי';
                return `ל"ז: ${licensePlate} | מספר פנימי: ${internalNumber}`;
              }}
              value={vehicles.filter(v => formData.vehicleAccess.includes(v._id || v.id))}
              onChange={(event, newValue) => {
                setFormData({
                  ...formData,
                  vehicleAccess: newValue.map(v => v._id || v.id),
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="הרשאות צפייה בכלים"
                  helperText={`נבחרו ${formData.vehicleAccess.length} כלים`}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option._id || option.id}
                    label={option.internalNumber || option.licensePlate || 'כלי'}
                    {...getTagProps({ index })}
                    size="small"
                  />
                ))
              }
              noOptionsText="לא נמצאו כלים"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange('isActive')}
                  color="primary"
                />
              }
              label="משתמש פעיל"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained">
          {user ? 'עדכן' : 'הוסף'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
