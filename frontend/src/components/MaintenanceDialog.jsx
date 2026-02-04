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
  Autocomplete,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Build,
  Close,
  Add,
  Delete,
  CloudUpload,
  InsertDriveFile,
  Receipt,
  Description,
  ExpandMore,
  ExpandLess,
  Store,
} from '@mui/icons-material';
import { maintenanceAPI, garagesAPI } from '../services/api';

export default function MaintenanceDialog({ open, onClose, maintenance, vehicles, riders, onSave, isRiderView = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      id: '',
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
    documents: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [garages, setGarages] = useState([]);
  const [loadingGarages, setLoadingGarages] = useState(false);
  const [showNewGarageForm, setShowNewGarageForm] = useState(false);
  const [newGarage, setNewGarage] = useState({ name: '', phone: '', address: '', city: '' });
  const [selectedGarage, setSelectedGarage] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showFilesSection, setShowFilesSection] = useState(true);

  // טעינת רשימת מוסכים
  useEffect(() => {
    const fetchGarages = async () => {
      try {
        setLoadingGarages(true);
        const response = await garagesAPI.getAll();
        setGarages(response.data.garages || []);
      } catch (err) {
        console.error('Error fetching garages:', err);
      } finally {
        setLoadingGarages(false);
      }
    };

    if (open) {
      fetchGarages();
    }
  }, [open]);

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

  // אתחול נתוני הטופס כשפותחים את הדיאלוג או משנים את הטיפול
  useEffect(() => {
    if (!open) return;

    if (maintenance) {
      // עריכה - תמיכה גם בפורמט ישן (garageId/garageName) וגם חדש (garage object)
      const garageObj = maintenance.garage || {};
      const garageId = garageObj.id || maintenance.garageId || '';
      const garageName = garageObj.name || maintenance.garageName || '';

      setFormData({
        vehicleId: maintenance.vehicleId || '',
        vehiclePlate: maintenance.vehiclePlate || '',
        riderId: maintenance.riderId || '',
        riderName: maintenance.riderName || '',
        maintenanceDate: parseDate(maintenance.maintenanceDate),
        kilometersAtMaintenance: maintenance.kilometersAtMaintenance || '',
        maintenanceType: maintenance.maintenanceType || 'routine',
        description: maintenance.description || '',
        garage: {
          id: garageId,
          name: garageName,
          phone: garageObj.phone || '',
          address: garageObj.address || '',
        },
        relatedFaultId: maintenance.relatedFaultId || '',
        costs: {
          laborCost: maintenance.costs?.laborCost || 0,
          partsCost: maintenance.costs?.partsCost || 0,
          otherCosts: maintenance.costs?.otherCost || 0,
        },
        paidBy: maintenance.paidBy || 'unit',
        replacedParts: maintenance.replacedParts || [],
        status: maintenance.status || 'scheduled',
        notes: maintenance.notes || '',
        documents: maintenance.documents || [],
      });

      // הגדרת המוסך הנבחר
      if (garageId) {
        setSelectedGarage({ id: garageId, name: garageName, phone: garageObj.phone || '', address: garageObj.address || '' });
      } else {
        setSelectedGarage(null);
      }
    } else {
      // חדש - איפוס
      // אם יש רק כלי אחד (למשל בתצוגת רוכב), הגדר אותו אוטומטית
      const prefilledVehicle = vehicles.length === 1 ? vehicles[0] : null;
      const prefilledRider = riders.length === 1 ? riders[0] : null;

      setFormData({
        vehicleId: prefilledVehicle?.id || '',
        vehiclePlate: prefilledVehicle?.licensePlate || '',
        riderId: prefilledRider?.id || '',
        riderName: prefilledRider ? `${prefilledRider.firstName} ${prefilledRider.lastName}` : '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        kilometersAtMaintenance: prefilledVehicle?.currentKilometers || '',
        maintenanceType: 'routine',
        description: '',
        garage: {
          id: '',
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
        paidBy: isRiderView ? 'rider' : 'unit',
        replacedParts: [],
        status: isRiderView ? 'pending_approval' : 'scheduled',
        notes: '',
        documents: [],
      });
      setSelectedGarage(null);
    }
    setError('');
    setSelectedFiles([]);
    setShowNewGarageForm(false);
    setNewGarage({ name: '', phone: '', address: '', city: '' });
  }, [maintenance, open, vehicles, riders, isRiderView]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGarageSelect = (event, value) => {
    setSelectedGarage(value);
    if (value) {
      setFormData(prev => ({
        ...prev,
        garage: {
          id: value.id,
          name: value.name,
          phone: value.phone || '',
          address: value.address || '',
        }
      }));
      setShowNewGarageForm(false);
    } else {
      setFormData(prev => ({
        ...prev,
        garage: { id: '', name: '', phone: '', address: '' }
      }));
    }
  };

  const handleNewGarageChange = (e) => {
    const { name, value } = e.target;
    setNewGarage(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNewGarage = async () => {
    if (isRiderView) return; // רוכב לא יכול להוסיף מוסך
    if (!newGarage.name) {
      setError('שם המוסך הוא שדה חובה');
      return;
    }

    try {
      setLoading(true);
      const response = await garagesAPI.create(newGarage);
      const createdGarage = response.data.garage;

      // הוסף לרשימה
      setGarages(prev => [...prev, createdGarage]);

      // בחר את המוסך החדש
      setSelectedGarage(createdGarage);
      setFormData(prev => ({
        ...prev,
        garage: {
          id: createdGarage.id,
          name: createdGarage.name,
          phone: createdGarage.phone || '',
          address: createdGarage.address || '',
        }
      }));

      setShowNewGarageForm(false);
      setNewGarage({ name: '', phone: '', address: '', city: '' });
    } catch (err) {
      console.error('Error creating garage:', err);
      setError(err.response?.data?.message || 'שגיאה ביצירת מוסך');
    } finally {
      setLoading(false);
    }
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

  // טיפול בקבצים
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return <Description sx={{ color: '#ef4444' }} />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <InsertDriveFile sx={{ color: '#3b82f6' }} />;
    return <Receipt sx={{ color: '#10b981' }} />;
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

      // העלאת קבצים אם יש
      let uploadedDocs = [...formData.documents];
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          const formDataFile = new FormData();
          formDataFile.append('file', file);
          formDataFile.append('maintenanceId', maintenance?.id || 'new');
          formDataFile.append('vehicleId', formData.vehicleId);

          try {
            const uploadResponse = await maintenanceAPI.uploadFile(formDataFile);
            if (uploadResponse.data.file) {
              uploadedDocs.push({
                name: file.name,
                url: uploadResponse.data.file.webViewLink || uploadResponse.data.file.url,
                fileId: uploadResponse.data.file.id,
                uploadedAt: new Date().toISOString(),
              });
            }
          } catch (uploadErr) {
            console.error('Error uploading file:', uploadErr);
          }
        }
        setUploadingFiles(false);
      }

      const dataToSave = {
        ...formData,
        costs: {
          ...formData.costs,
          totalCost,
        },
        documents: uploadedDocs,
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

        <Grid container spacing={isMobile ? 2 : 2.5}>
          {/* פרטי כלי */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: isMobile ? 1 : 1.5 }}>
              פרטי כלי
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
                disabled={isRiderView}
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
              label="ק״מ בטיפול"
              name="kilometersAtMaintenance"
              type="number"
              value={formData.kilometersAtMaintenance}
              onChange={handleChange}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="תאריך טיפול"
              name="maintenanceDate"
              type="date"
              value={formData.maintenanceDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Grid>

          <Grid item xs={6} sm={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Store fontSize="small" />
                בחירת מוסך
              </Typography>
              {!isRiderView && (
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setShowNewGarageForm(!showNewGarageForm)}
                  sx={{ borderRadius: '8px' }}
                >
                  {showNewGarageForm ? 'בטל' : 'מוסך חדש'}
                </Button>
              )}
            </Box>
          </Grid>

          {!showNewGarageForm ? (
            <Grid item xs={12}>
              <Autocomplete
                options={garages}
                getOptionLabel={(option) => option?.name || ''}
                value={selectedGarage}
                onChange={handleGarageSelect}
                loading={loadingGarages}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{option.name}</Typography>
                      {option.city && (
                        <Typography variant="caption" color="text.secondary">
                          {option.city} {option.phone && `• ${option.phone}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="בחר מוסך"
                    placeholder="הקלד לחיפוש..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingGarages ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="שם המוסך *"
                  name="name"
                  value={newGarage.name}
                  onChange={handleNewGarageChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="טלפון"
                  name="phone"
                  value={newGarage.phone}
                  onChange={handleNewGarageChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="עיר"
                  name="city"
                  value={newGarage.city}
                  onChange={handleNewGarageChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="כתובת"
                  name="address"
                  value={newGarage.address}
                  onChange={handleNewGarageChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleAddNewGarage}
                  disabled={loading || !newGarage.name}
                  sx={{
                    bgcolor: '#10b981',
                    borderRadius: '10px',
                    '&:hover': { bgcolor: '#059669' },
                  }}
                >
                  {loading ? 'שומר...' : 'שמור מוסך חדש'}
                </Button>
              </Grid>
            </>
          )}

          {selectedGarage && (
            <Grid item xs={12}>
              <Chip
                label={`${selectedGarage.name}${selectedGarage.city ? ` - ${selectedGarage.city}` : ''}`}
                onDelete={() => handleGarageSelect(null, null)}
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  fontWeight: 600,
                  '& .MuiChip-deleteIcon': { color: '#6366f1' },
                }}
              />
            </Grid>
          )}

          {/* עלויות */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: 1.5, mt: 2 }}>
              עלויות
            </Typography>
          </Grid>

          <Grid item xs={4} sm={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="עבודה"
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

          <Grid item xs={4} sm={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="חלקים"
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

          <Grid item xs={4} sm={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="אחר"
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
              p: isMobile ? 1.5 : 2,
              borderRadius: '12px',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Typography sx={{ fontWeight: 600, color: '#6366f1', fontSize: isMobile ? '0.875rem' : '1rem' }}>סה"כ עלות:</Typography>
              <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700, color: '#6366f1' }}>
                ₪{totalCost.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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

          <Grid item xs={6} sm={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>סטטוס</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="סטטוס"
                sx={{ borderRadius: '12px' }}
                disabled={isRiderView}
              >
                {isRiderView && <MenuItem value="pending_approval">ממתין לאישור</MenuItem>}
                <MenuItem value="scheduled">מתוכנן</MenuItem>
                <MenuItem value="in_progress">בביצוע</MenuItem>
                <MenuItem value="completed">הושלם</MenuItem>
                <MenuItem value="cancelled">בוטל</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {isRiderView && !maintenance && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                הטיפול יישלח לאישור המנהל לפני שיופיע במערכת
              </Alert>
            </Grid>
          )}

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
              <Box sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
                p: isMobile ? 1.5 : 0,
                bgcolor: isMobile ? '#f8fafc' : 'transparent',
                borderRadius: isMobile ? '10px' : 0,
                border: isMobile ? '1px solid #e2e8f0' : 'none',
              }}>
                <TextField
                  size="small"
                  label="שם חלק"
                  value={part.partName}
                  onChange={(e) => handlePartChange(index, 'partName', e.target.value)}
                  sx={{ flex: isMobile ? '1 1 100%' : 2, minWidth: isMobile ? 'unset' : 120, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                {!isMobile && (
                  <TextField
                    size="small"
                    label="מק״ט"
                    value={part.partNumber}
                    onChange={(e) => handlePartChange(index, 'partNumber', e.target.value)}
                    sx={{ flex: 1, minWidth: 80, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
                )}
                <TextField
                  size="small"
                  label="כמות"
                  type="number"
                  value={part.quantity}
                  onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                  sx={{ width: isMobile ? 70 : 80, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                  sx={{ width: isMobile ? 100 : 120, flex: isMobile ? 1 : 'unset', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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

          {/* קבצים - קבלות והצעות מחיר */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, mt: 2, cursor: 'pointer' }}
              onClick={() => setShowFilesSection(!showFilesSection)}
            >
              <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt fontSize="small" />
                קבלות והצעות מחיר
              </Typography>
              <IconButton size="small">
                {showFilesSection ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          </Grid>

          <Collapse in={showFilesSection} sx={{ width: '100%' }}>
            <Grid container spacing={2} sx={{ px: 2 }}>
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: '12px',
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#6366f1',
                      bgcolor: 'rgba(99, 102, 241, 0.02)',
                    },
                  }}
                  component="label"
                >
                  <input
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <CloudUpload sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    לחץ להעלאת קבצים או גרור לכאן
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PDF, תמונות, מסמכי Word
                  </Typography>
                </Box>
              </Grid>

              {/* קבצים חדשים שנבחרו */}
              {selectedFiles.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block' }}>
                    קבצים להעלאה ({selectedFiles.length})
                  </Typography>
                  <List dense sx={{ bgcolor: '#f8fafc', borderRadius: '12px' }}>
                    {selectedFiles.map((file, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getFileIcon(file.name)}
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / 1024).toFixed(1)} KB`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" size="small" onClick={() => handleRemoveFile(index)}>
                            <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}

              {/* קבצים קיימים */}
              {formData.documents.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block' }}>
                    קבצים קיימים ({formData.documents.length})
                  </Typography>
                  <List dense sx={{ bgcolor: '#f0fdf4', borderRadius: '12px' }}>
                    {formData.documents.map((doc, index) => (
                      <ListItem
                        key={index}
                        component="a"
                        href={doc.url}
                        target="_blank"
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getFileIcon(doc.name)}
                        </ListItemIcon>
                        <ListItemText
                          primary={doc.name}
                          secondary={doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('he-IL') : ''}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" size="small" onClick={(e) => { e.preventDefault(); handleRemoveExistingDocument(index); }}>
                            <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
            </Grid>
          </Collapse>

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
          disabled={loading || uploadingFiles}
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
          {uploadingFiles ? 'מעלה קבצים...' : loading ? 'שומר...' : maintenance ? 'עדכן' : 'צור טיפול'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
