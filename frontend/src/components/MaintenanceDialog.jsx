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
} from '@mui/material';
import {
  Build,
  Close,
  Add,
  Delete,
} from '@mui/icons-material';
import { maintenanceAPI } from '../services/api';

export default function MaintenanceDialog({ open, onClose, maintenance, vehicles, riders, onSave }) {
  const [formData, setFormData] = useState({
    vehicleId: '',
    vehiclePlate: '',
    riderId: '',
    riderName: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    kilometersAtMaintenance: '',
    maintenanceType: 'routine',
    description: '',
    garage: {
      name: '',
      phone: '',
      address: '',
    },
    relatedFaultId: '',
    costs: {
      laborCost: 0,
      partsCost: 0,
      otherCosts: 0,
    },
    paidBy: 'unit',
    replacedParts: [],
    status: 'scheduled',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (maintenance) {
      // עריכה
      setFormData({
        vehicleId: maintenance.vehicleId || '',
        vehiclePlate: maintenance.vehiclePlate || '',
        riderId: maintenance.riderId || '',
        riderName: maintenance.riderName || '',
        maintenanceDate: maintenance.maintenanceDate
          ? new Date(maintenance.maintenanceDate.toDate ? maintenance.maintenanceDate.toDate() : maintenance.maintenanceDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        kilometersAtMaintenance: maintenance.kilometersAtMaintenance || '',
        maintenanceType: maintenance.maintenanceType || 'routine',
        description: maintenance.description || '',
        garage: {
          name: maintenance.garage?.name || '',
          phone: maintenance.garage?.phone || '',
          address: maintenance.garage?.address || '',
        },
        relatedFaultId: maintenance.relatedFaultId || '',
        costs: {
          laborCost: maintenance.costs?.laborCost || 0,
          partsCost: maintenance.costs?.partsCost || 0,
          otherCosts: maintenance.costs?.otherCosts || 0,
        },
        paidBy: maintenance.paidBy || 'unit',
        replacedParts: maintenance.replacedParts || [],
        status: maintenance.status || 'scheduled',
        notes: maintenance.notes || '',
      });
    } else {
      // חדש - איפוס
      setFormData({
        vehicleId: '',
        vehiclePlate: '',
        riderId: '',
        riderName: '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        kilometersAtMaintenance: '',
        maintenanceType: 'routine',
        description: '',
        garage: {
          name: '',
          phone: '',
          address: '',
        },
        relatedFaultId: '',
        costs: {
          laborCost: 0,
          partsCost: 0,
          otherCosts: 0,
        },
        paidBy: 'unit',
        replacedParts: [],
        status: 'scheduled',
        notes: '',
      });
    }
    setError('');
  }, [maintenance, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGarageChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      garage: { ...prev.garage, [name]: value }
    }));
  };

  const handleCostChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      costs: { ...prev.costs, [name]: parseFloat(value) || 0 }
    }));
  };

  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData(prev => ({
      ...prev,
      vehicleId,
      vehiclePlate: vehicle?.licensePlate || '',
      kilometersAtMaintenance: vehicle?.currentKilometers || '',
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

  const handleAddPart = () => {
    setFormData(prev => ({
      ...prev,
      replacedParts: [...prev.replacedParts, { partName: '', partNumber: '', quantity: 1, cost: 0 }]
    }));
  };

  const handleRemovePart = (index) => {
    setFormData(prev => ({
      ...prev,
      replacedParts: prev.replacedParts.filter((_, i) => i !== index)
    }));
  };

  const handlePartChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      replacedParts: prev.replacedParts.map((part, i) =>
        i === index ? { ...part, [field]: field === 'quantity' || field === 'cost' ? parseFloat(value) || 0 : value } : part
      )
    }));
  };

  const totalCost = (formData.costs.laborCost || 0) + (formData.costs.partsCost || 0) + (formData.costs.otherCosts || 0);

  const handleSubmit = async () => {
    // ולידציה
    if (!formData.vehicleId) {
      setError('יש לבחור כלי');
      return;
    }
    if (!formData.description) {
      setError('יש להזין תיאור');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const dataToSave = {
        ...formData,
        costs: {
          ...formData.costs,
          totalCost,
        },
      };

      if (maintenance) {
        // עדכון
        await maintenanceAPI.update(maintenance.id, dataToSave);
      } else {
        // יצירה
        await maintenanceAPI.create(dataToSave);
      }

      onSave();
    } catch (err) {
      console.error('Error saving maintenance:', err);
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
      PaperProps={{
        sx: { borderRadius: '20px' }
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
              <Build sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {maintenance ? 'עריכת טיפול' : 'טיפול חדש'}
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

        <Grid container spacing={2.5}>
          {/* פרטי כלי */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: 1.5 }}>
              פרטי כלי
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
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
              label="ק״מ בטיפול"
              name="kilometersAtMaintenance"
              type="number"
              value={formData.kilometersAtMaintenance}
              onChange={handleChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="תאריך טיפול"
              name="maintenanceDate"
              type="date"
              value={formData.maintenanceDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>סוג טיפול</InputLabel>
              <Select
                name="maintenanceType"
                value={formData.maintenanceType}
                onChange={handleChange}
                label="סוג טיפול"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="routine">טיפול תקופתי</MenuItem>
                <MenuItem value="repair">תיקון</MenuItem>
                <MenuItem value="emergency">חירום</MenuItem>
                <MenuItem value="recall">ריקול</MenuItem>
                <MenuItem value="accident_repair">תיקון תאונה</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="תיאור הטיפול *"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          {/* מוסך */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: 1.5, mt: 2 }}>
              פרטי מוסך
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="שם מוסך"
              name="name"
              value={formData.garage.name}
              onChange={handleGarageChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="טלפון מוסך"
              name="phone"
              value={formData.garage.phone}
              onChange={handleGarageChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="כתובת מוסך"
              name="address"
              value={formData.garage.address}
              onChange={handleGarageChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          {/* עלויות */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: 1.5, mt: 2 }}>
              עלויות
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="עלות עבודה"
              name="laborCost"
              type="number"
              value={formData.costs.laborCost}
              onChange={handleCostChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₪</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="עלות חלקים"
              name="partsCost"
              type="number"
              value={formData.costs.partsCost}
              onChange={handleCostChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₪</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="עלויות אחרות"
              name="otherCosts"
              type="number"
              value={formData.costs.otherCosts}
              onChange={handleCostChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₪</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{
              p: 2,
              borderRadius: '12px',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Typography sx={{ fontWeight: 600, color: '#6366f1' }}>סה"כ עלות:</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#6366f1' }}>
                ₪{totalCost.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>מי שילם?</InputLabel>
              <Select
                name="paidBy"
                value={formData.paidBy}
                onChange={handleChange}
                label="מי שילם?"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="unit">היחידה</MenuItem>
                <MenuItem value="rider">הרוכב</MenuItem>
                <MenuItem value="insurance">ביטוח</MenuItem>
                <MenuItem value="warranty">אחריות</MenuItem>
                <MenuItem value="shared">משותף</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>סטטוס</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="סטטוס"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="scheduled">מתוכנן</MenuItem>
                <MenuItem value="in_progress">בביצוע</MenuItem>
                <MenuItem value="completed">הושלם</MenuItem>
                <MenuItem value="cancelled">בוטל</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* חלקים שהוחלפו */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600 }}>
                חלקים שהוחלפו
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={handleAddPart}
                sx={{ borderRadius: '8px' }}
              >
                הוסף חלק
              </Button>
            </Box>
          </Grid>

          {formData.replacedParts.map((part, index) => (
            <Grid item xs={12} key={index}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="שם חלק"
                  value={part.partName}
                  onChange={(e) => handlePartChange(index, 'partName', e.target.value)}
                  sx={{ flex: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <TextField
                  size="small"
                  label="מק״ט"
                  value={part.partNumber}
                  onChange={(e) => handlePartChange(index, 'partNumber', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <TextField
                  size="small"
                  label="כמות"
                  type="number"
                  value={part.quantity}
                  onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                  sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <TextField
                  size="small"
                  label="מחיר"
                  type="number"
                  value={part.cost}
                  onChange={(e) => handlePartChange(index, 'cost', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₪</InputAdornment>,
                  }}
                  sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemovePart(index)}
                  sx={{ color: '#ef4444' }}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Grid>
          ))}

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
          {loading ? 'שומר...' : maintenance ? 'עדכן' : 'צור טיפול'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
