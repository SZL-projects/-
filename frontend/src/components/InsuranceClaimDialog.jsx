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
  MenuItem,
  Box,
  Typography,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Gavel,
  Close,
} from '@mui/icons-material';
import { insuranceClaimsAPI } from '../services/api';

export default function InsuranceClaimDialog({ open, onClose, claim, vehicles, riders, onSave }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    vehicleId: '',
    vehiclePlate: '',
    riderId: '',
    riderName: '',
    eventType: 'accident',
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
    location: { address: '' },
    insuranceCompany: '',
    insuranceType: 'comprehensive',
    policyNumber: '',
    claimAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    appraiser: { name: '', phone: '', email: '', appointmentDate: '' },
    status: 'draft',
    notes: '',
    externalClaimNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // פונקציה לפרסור תאריך מפורמטים שונים
  const parseDate = (timestamp) => {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    try {
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
      return date.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  // אתחול נתוני הטופס כשפותחים את הדיאלוג או משנים את התביעה
  useEffect(() => {
    if (!open) return;

    if (claim) {
      // עריכה
      setFormData({
        vehicleId: claim.vehicleId || '',
        vehiclePlate: claim.vehiclePlate || '',
        riderId: claim.riderId || '',
        riderName: claim.riderName || '',
        eventType: claim.eventType || 'accident',
        eventDate: parseDate(claim.eventDate),
        description: claim.description || '',
        location: {
          address: claim.location?.address || '',
        },
        insuranceCompany: claim.insuranceCompany || '',
        insuranceType: claim.insuranceType || 'comprehensive',
        policyNumber: claim.policyNumber || '',
        claimAmount: claim.claimAmount || 0,
        approvedAmount: claim.approvedAmount || 0,
        paidAmount: claim.paidAmount || 0,
        appraiser: {
          name: claim.appraiser?.name || '',
          phone: claim.appraiser?.phone || '',
          email: claim.appraiser?.email || '',
          appointmentDate: parseDate(claim.appraiser?.appointmentDate),
        },
        status: claim.status || 'draft',
        notes: claim.notes || '',
        externalClaimNumber: claim.externalClaimNumber || '',
      });
    } else {
      // חדש - איפוס
      const prefilledVehicle = vehicles.length === 1 ? vehicles[0] : null;
      const prefilledRider = riders.length === 1 ? riders[0] : null;

      setFormData({
        vehicleId: prefilledVehicle?.id || '',
        vehiclePlate: prefilledVehicle?.licensePlate || '',
        riderId: prefilledRider?.id || '',
        riderName: prefilledRider ? `${prefilledRider.firstName} ${prefilledRider.lastName}` : '',
        eventType: 'accident',
        eventDate: new Date().toISOString().split('T')[0],
        description: '',
        location: { address: '' },
        insuranceCompany: '',
        insuranceType: 'comprehensive',
        policyNumber: '',
        claimAmount: 0,
        approvedAmount: 0,
        paidAmount: 0,
        appraiser: { name: '', phone: '', email: '', appointmentDate: '' },
        status: 'draft',
        notes: '',
        externalClaimNumber: '',
      });
    }
    setError('');
  }, [claim, open, vehicles, riders]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData(prev => ({
      ...prev,
      vehicleId,
      vehiclePlate: vehicle?.licensePlate || '',
    }));

    // אם יש רוכב משויך
    if (vehicle?.assignedRiderId) {
      const rider = riders.find(r => r.id === vehicle.assignedRiderId);
      if (rider) {
        setFormData(prev => ({
          ...prev,
          riderId: rider.id,
          riderName: `${rider.firstName} ${rider.lastName}`,
        }));
      }
    }
  };

  const handleLocationChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, address: value },
    }));
  };

  const handleAppraiserChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      appraiser: { ...prev.appraiser, [name]: value },
    }));
  };

  const handleAmountChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async () => {
    // ולידציה
    if (!formData.vehicleId) {
      setError('יש לבחור כלי');
      return;
    }
    if (!formData.eventType) {
      setError('יש לבחור סוג אירוע');
      return;
    }
    if (!formData.eventDate) {
      setError('יש להזין תאריך אירוע');
      return;
    }
    if (!formData.description) {
      setError('יש להזין תיאור');
      return;
    }
    if (!formData.insuranceCompany) {
      setError('יש להזין חברת ביטוח');
      return;
    }
    if (!formData.insuranceType) {
      setError('יש לבחור סוג ביטוח');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const dataToSave = { ...formData };

      if (claim) {
        // עדכון
        await insuranceClaimsAPI.update(claim.id, dataToSave);
      } else {
        // יצירה
        await insuranceClaimsAPI.create(dataToSave);
      }

      onSave();
    } catch (err) {
      console.error('Error saving insurance claim:', err);
      setError(err.response?.data?.message || 'שגיאה בשמירה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : '20px' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Gavel sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {claim ? 'עריכת תביעת ביטוח' : 'תביעת ביטוח חדשה'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={isMobile ? 2 : 2.5}>
          {/* פרטי כלי ורוכב */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5 }}>
              פרטי כלי ורוכב
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>כלי *</InputLabel>
              <Select
                value={formData.vehicleId}
                onChange={handleVehicleChange}
                label="כלי *"
                sx={{ borderRadius: '12px' }}
              >
                {vehicles.map(vehicle => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.licensePlate} - {vehicle.manufacturer} {vehicle.model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="רוכב משויך"
              value={formData.riderName}
              InputProps={{ readOnly: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
            />
          </Grid>

          {/* פרטי אירוע */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5, mt: 2 }}>
              פרטי אירוע
            </Typography>
          </Grid>

          <Grid item xs={6} sm={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>סוג אירוע *</InputLabel>
              <Select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                label="סוג אירוע *"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="accident">תאונה</MenuItem>
                <MenuItem value="theft">גניבה</MenuItem>
                <MenuItem value="vandalism">ונדליזם</MenuItem>
                <MenuItem value="natural_disaster">אסון טבע</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="תאריך אירוע *"
              name="eventDate"
              type="date"
              value={formData.eventDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="תיאור האירוע *"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="מיקום האירוע"
              value={formData.location.address}
              onChange={handleLocationChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          {/* פרטי ביטוח */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5, mt: 2 }}>
              פרטי ביטוח
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="חברת ביטוח *"
              name="insuranceCompany"
              value={formData.insuranceCompany}
              onChange={handleChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>סוג ביטוח *</InputLabel>
              <Select
                name="insuranceType"
                value={formData.insuranceType}
                onChange={handleChange}
                label="סוג ביטוח *"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="mandatory">חובה</MenuItem>
                <MenuItem value="comprehensive">מקיף</MenuItem>
                <MenuItem value="thirdParty">צד שלישי</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="מספר פוליסה"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="מספר תביעה חיצוני"
              name="externalClaimNumber"
              value={formData.externalClaimNumber}
              onChange={handleChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          {/* סכומים */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5, mt: 2 }}>
              סכומים
            </Typography>
          </Grid>

          <Grid item xs={12} sm={claim ? 4 : 12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="סכום תביעה"
              name="claimAmount"
              type="number"
              value={formData.claimAmount}
              onChange={handleAmountChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">&#8362;</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          {claim && (
            <>
              <Grid item xs={6} sm={4}>
                <TextField
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  label="סכום מאושר"
                  name="approvedAmount"
                  type="number"
                  value={formData.approvedAmount}
                  onChange={handleAmountChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">&#8362;</InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>

              <Grid item xs={6} sm={4}>
                <TextField
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                  label="סכום ששולם"
                  name="paidAmount"
                  type="number"
                  value={formData.paidAmount}
                  onChange={handleAmountChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">&#8362;</InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
            </>
          )}

          {/* שמאי */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5, mt: 2 }}>
              שמאי
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="שם שמאי"
              name="name"
              value={formData.appraiser.name}
              onChange={handleAppraiserChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="טלפון שמאי"
              name="phone"
              value={formData.appraiser.phone}
              onChange={handleAppraiserChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="אימייל שמאי"
              name="email"
              type="email"
              value={formData.appraiser.email}
              onChange={handleAppraiserChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="תאריך פגישה עם שמאי"
              name="appointmentDate"
              type="date"
              value={formData.appraiser.appointmentDate}
              onChange={handleAppraiserChange}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          {/* סטטוס - רק בעריכה */}
          {claim && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5, mt: 2 }}>
                  סטטוס
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                  <InputLabel>סטטוס</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="סטטוס"
                    sx={{ borderRadius: '12px' }}
                  >
                    <MenuItem value="draft">טיוטה</MenuItem>
                    <MenuItem value="submitted">הוגשה</MenuItem>
                    <MenuItem value="under_review">בבדיקה</MenuItem>
                    <MenuItem value="approved">אושרה</MenuItem>
                    <MenuItem value="rejected">נדחתה</MenuItem>
                    <MenuItem value="closed">סגורה</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* הערות */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <TextField
              fullWidth
              label="הערות"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={2}
              sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#64748b',
            fontWeight: 600,
            borderRadius: '10px',
            px: 3,
          }}
        >
          ביטול
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            bgcolor: '#6366f1',
            borderRadius: '10px',
            fontWeight: 600,
            px: 4,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              bgcolor: '#4f46e5',
            },
          }}
        >
          {loading ? 'שומר...' : claim ? 'עדכן' : 'צור תביעה'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
