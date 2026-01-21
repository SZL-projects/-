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
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';

const vehicleTypes = [
  { value: 'motorcycle', label: 'אופנוע' },
  { value: 'scooter', label: 'קטנוע' },
];

const vehicleStatuses = [
  { value: 'active', label: 'פעיל' },
  { value: 'waiting_for_rider', label: 'ממתין לרוכב' },
  { value: 'faulty', label: 'תקול' },
  { value: 'unfit', label: 'לא כשיר' },
  { value: 'stolen_lost', label: 'גנוב/אבוד' },
  { value: 'decommissioned', label: 'מושבת' },
];

export default function VehicleDialog({ open, onClose, onSave, vehicle }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    licensePlate: '',
    internalNumber: '',
    type: 'motorcycle',
    manufacturer: '',
    model: '',
    year: new Date().getFullYear(),
    currentKilometers: 0,
    status: 'active',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
    } else {
      setFormData({
        licensePlate: '',
        internalNumber: '',
        type: 'motorcycle',
        manufacturer: '',
        model: '',
        year: new Date().getFullYear(),
        currentKilometers: 0,
        status: 'active',
      });
    }
    setErrors({});
  }, [vehicle, open]);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'שדה חובה';
    }

    if (!formData.manufacturer.trim()) {
      newErrors.manufacturer = 'שדה חובה';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'שדה חובה';
    }

    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'שנה לא תקינה';
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
              {vehicle ? 'עריכת כלי' : 'הוספת כלי חדש'}
            </Typography>
            <Button autoFocus color="inherit" onClick={handleSubmit}>
              {vehicle ? 'עדכן' : 'הוסף'}
            </Button>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle>{vehicle ? 'עריכת כלי' : 'הוספת כלי חדש'}</DialogTitle>
      )}
      <DialogContent sx={{ pt: isMobile ? 3 : 1 }}>
        <Grid container spacing={2} sx={{ mt: isMobile ? 0 : 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="מספר רישוי"
              value={formData.licensePlate}
              onChange={handleChange('licensePlate')}
              error={!!errors.licensePlate}
              helperText={errors.licensePlate}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="מספר פנימי"
              value={formData.internalNumber}
              onChange={handleChange('internalNumber')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>סוג</InputLabel>
              <Select
                value={formData.type}
                onChange={handleChange('type')}
                label="סוג"
              >
                {vehicleTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
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
                {vehicleStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="יצרן"
              value={formData.manufacturer}
              onChange={handleChange('manufacturer')}
              error={!!errors.manufacturer}
              helperText={errors.manufacturer}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="דגם"
              value={formData.model}
              onChange={handleChange('model')}
              error={!!errors.model}
              helperText={errors.model}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="שנת ייצור"
              type="number"
              value={formData.year}
              onChange={handleChange('year')}
              error={!!errors.year}
              helperText={errors.year}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="קילומטרז נוכחי"
              type="number"
              value={formData.currentKilometers}
              onChange={handleChange('currentKilometers')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      {!isMobile && (
        <DialogActions>
          <Button onClick={onClose}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained">
            {vehicle ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
