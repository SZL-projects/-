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
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { Person, Shield, TwoWheeler, LockOpen, Lock } from '@mui/icons-material';
import { ridersAPI, authAPI } from '../services/api';
import VehicleAccessDialog from './VehicleAccessDialog';
import RiderAccessDialog from './RiderAccessDialog';

const ROLES = [
  { value: 'super_admin', label: 'מנהל על' },
  { value: 'manager', label: 'מנהל' },
  { value: 'secretary', label: 'מזכיר' },
  { value: 'logistics', label: 'לוגיסטיקה' },
  { value: 'rider', label: 'רוכב' },
  { value: 'regional_manager', label: 'מנהל אזורי' },
];

const hasExtraRole = (roles) => roles.some(r => r !== 'rider');

export default function UserDialog({ open, onClose, onSave, user }) {
  const [tab, setTab] = useState(0);
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
    riderAccess: [],
    riderId: null,
  });

  const [errors, setErrors] = useState({});
  const [riders, setRiders] = useState([]);
  const [vehicleAccessDialogOpen, setVehicleAccessDialogOpen] = useState(false);
  const [riderAccessDialogOpen, setRiderAccessDialogOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(0);
      ridersAPI.getAll()
        .then(r => setRiders(r.data.riders || r.data || []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (user) {
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
        riderAccess: user.riderAccess || [],
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
        riderAccess: [],
        riderId: null,
      });
    }
    setErrors({});
  }, [user, open]);

  const handleUnlock = async () => {
    if (!user?.id) return;
    setUnlockLoading(true);
    try {
      await authAPI.unlockUser(user.id);
      onClose();
    } catch (err) {
      console.error('Error unlocking user:', err);
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = field === 'isActive' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleRolesChange = (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, roles: typeof value === 'string' ? value.split(',') : value }));
    if (errors.roles) setErrors(prev => ({ ...prev, roles: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'שדה חובה';
    if (!formData.firstName.trim()) newErrors.firstName = 'שדה חובה';
    if (!formData.lastName.trim()) newErrors.lastName = 'שדה חובה';
    if (!formData.email.trim()) newErrors.email = 'שדה חובה';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'כתובת אימייל לא תקינה';
    if (!user && !formData.password) newErrors.password = 'שדה חובה למשתמש חדש';
    if (formData.password && formData.password.length < 6) newErrors.password = 'סיסמה חייבת להכיל לפחות 6 תווים';
    if (!formData.roles || formData.roles.length === 0) newErrors.roles = 'חובה לבחור לפחות תפקיד אחד';

    setErrors(newErrors);
    const personalErrors = ['username', 'firstName', 'lastName', 'email', 'password'];
    if (personalErrors.some(f => newErrors[f])) setTab(0);
    else if (newErrors.roles) setTab(1);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const dataToSave = { ...formData };
      if (user && !dataToSave.password) delete dataToSave.password;
      onSave(dataToSave);
    }
  };

  const AccessRow = ({ icon, color, title, count, unit, onEdit }) => (
    <Box sx={{
      border: '1px solid #e2e8f0', borderRadius: '10px', p: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ color, fontSize: 22 }}>{icon}</Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{title}</Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            {count > 0 ? `${count} ${unit} נבחרו` : `לא נבחרו ${unit}`}
          </Typography>
        </Box>
        {count > 0 && (
          <Chip label={count} size="small"
            sx={{ bgcolor: `${color}1a`, color, fontWeight: 700, fontSize: '0.75rem' }} />
        )}
      </Box>
      <Button variant="outlined" size="small" onClick={onEdit}
        sx={{ borderRadius: '8px', borderColor: color, color, fontWeight: 600,
          '&:hover': { bgcolor: `${color}0d` } }}>
        ערוך הרשאות
      </Button>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ pb: 0 }}>
        {user ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
        {user && (
          <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 0.5 }}>
            {user.firstName} {user.lastName}
          </Typography>
        )}
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start"
            label="פרטים אישיים" sx={{ minHeight: 48, fontSize: '0.85rem' }} />
          <Tab icon={<Shield sx={{ fontSize: 18 }} />} iconPosition="start"
            label="תפקידים והרשאות" sx={{ minHeight: 48, fontSize: '0.85rem' }} />
        </Tabs>
      </Box>

      <DialogContent>
        {/* ===== טאב 1: פרטים אישיים ===== */}
        {tab === 0 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="שם משתמש" value={formData.username}
                onChange={handleChange('username')} error={!!errors.username}
                helperText={errors.username} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="שם פרטי" value={formData.firstName}
                onChange={handleChange('firstName')} error={!!errors.firstName}
                helperText={errors.firstName} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="שם משפחה" value={formData.lastName}
                onChange={handleChange('lastName')} error={!!errors.lastName}
                helperText={errors.lastName} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="אימייל" type="email" value={formData.email}
                onChange={handleChange('email')} error={!!errors.email}
                helperText={errors.email} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="טלפון" value={formData.phone}
                onChange={handleChange('phone')} helperText="אופציונלי" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label={user ? 'סיסמה חדשה (השאר ריק לשמירה)' : 'סיסמה'}
                type="password" value={formData.password} onChange={handleChange('password')}
                error={!!errors.password}
                helperText={errors.password || (user ? 'השאר ריק אם אין צורך לשנות' : '')}
                required={!user} />
            </Grid>
          </Grid>
        )}

        {/* ===== טאב 2: תפקידים והרשאות ===== */}
        {tab === 1 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* תפקידים */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.roles}>
                <InputLabel>תפקידים</InputLabel>
                <Select multiple value={formData.roles} onChange={handleRolesChange} label="תפקידים"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const role = ROLES.find(r => r.value === value);
                        return <Chip key={value} label={role?.label || value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {ROLES.map((role) => (
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

            {/* שיוך לרוכב */}
            {formData.roles.includes('rider') && (
              <Grid item xs={12}>
                <Autocomplete
                  options={riders}
                  getOptionLabel={(option) =>
                    `${option.firstName || ''} ${option.lastName || ''} ${option.idNumber ? `(ת.ז: ${option.idNumber})` : ''}`
                  }
                  value={riders.find(r => (r._id || r.id) === formData.riderId) || null}
                  onChange={(_, newValue) => {
                    setFormData(prev => ({ ...prev, riderId: newValue ? (newValue._id || newValue.id) : null }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="שיוך לרוכב (אופציונלי)"
                      helperText="חבר משתמש זה לפרופיל רוכב קיים במערכת" />
                  )}
                  noOptionsText="לא נמצאו רוכבים"
                  isOptionEqualToValue={(option, value) =>
                    (option._id || option.id) === (value._id || value.id)
                  }
                />
              </Grid>
            )}

            {/* הרשאות גישה - רק אם יש תפקיד נוסף מעבר לרוכב */}
            {hasExtraRole(formData.roles) && (
              <>
                <Grid item xs={12}>
                  <AccessRow
                    icon={<TwoWheeler />}
                    color="#6366f1"
                    title="הרשאות צפייה בכלים"
                    count={formData.vehicleAccess.length}
                    unit="כלים"
                    onEdit={() => setVehicleAccessDialogOpen(true)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <AccessRow
                    icon={<Person />}
                    color="#10b981"
                    title="הרשאות צפייה ברוכבים"
                    count={formData.riderAccess.length}
                    unit="רוכבים"
                    onEdit={() => setRiderAccessDialogOpen(true)}
                  />
                </Grid>
              </>
            )}

            {/* סטטוס נעילה - מוצג רק בעריכת משתמש נעול */}
            {user?.isLocked && (
              <Grid item xs={12}>
                <Alert
                  severity="error"
                  icon={<Lock fontSize="small" />}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<LockOpen fontSize="small" />}
                      onClick={handleUnlock}
                      disabled={unlockLoading}
                      sx={{ fontWeight: 600 }}
                    >
                      בטל נעילה
                    </Button>
                  }
                >
                  חשבון זה נעול
                  {user.lockReason && ` — ${user.lockReason}`}
                </Alert>
              </Grid>
            )}

            {/* סטטוס */}
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={formData.isActive} onChange={handleChange('isActive')} color="primary" />}
                label="משתמש פעיל"
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained">
          {user ? 'עדכן' : 'הוסף'}
        </Button>
      </DialogActions>

      <VehicleAccessDialog
        open={vehicleAccessDialogOpen}
        onClose={() => setVehicleAccessDialogOpen(false)}
        onSave={(ids) => { setFormData(prev => ({ ...prev, vehicleAccess: ids })); setVehicleAccessDialogOpen(false); }}
        userName={formData.firstName ? `${formData.firstName} ${formData.lastName}` : ''}
        selectedIds={formData.vehicleAccess}
      />

      <RiderAccessDialog
        open={riderAccessDialogOpen}
        onClose={() => setRiderAccessDialogOpen(false)}
        onSave={(ids) => { setFormData(prev => ({ ...prev, riderAccess: ids })); setRiderAccessDialogOpen(false); }}
        userName={formData.firstName ? `${formData.firstName} ${formData.lastName}` : ''}
        selectedIds={formData.riderAccess}
      />
    </Dialog>
  );
}
