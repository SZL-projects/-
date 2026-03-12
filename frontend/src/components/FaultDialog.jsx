import { useState, useEffect, useRef } from 'react';
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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Autocomplete,
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  Box,
  Chip,
  Tooltip,
  Collapse,
  Select,
  InputLabel,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Cancel,
  Warning,
  TwoWheeler,
  Build,
  PhotoCamera,
  Delete,
  Assignment,
} from '@mui/icons-material';
import { vehiclesAPI, authAPI, faultsAPI } from '../services/api';

// המרת אובייקט תמונה ל-URL תקין דרך ה-proxy
function getPhotoSrc(photo) {
  if (!photo) return '';
  if (photo.fileId) return `/api/faults/photo-proxy?fileId=${photo.fileId}`;
  const rawUrl = photo.url || photo.data || (typeof photo === 'string' ? photo : '');
  if (!rawUrl) return '';
  if (rawUrl.includes('/api/faults/photo-proxy')) return rawUrl;
  const qIdMatch = rawUrl.match(/[?&]id=([^&]+)/);
  if (qIdMatch) return `/api/faults/photo-proxy?fileId=${qIdMatch[1]}`;
  const fileIdMatch = rawUrl.match(/\/file\/d\/([^/?]+)/);
  if (fileIdMatch) return `/api/faults/photo-proxy?fileId=${fileIdMatch[1]}`;
  return rawUrl;
}

// ---- נתוני הקטגוריות ----
const FAULT_AREAS = [
  { value: 'scooter', label: 'בקטנוע', icon: <TwoWheeler sx={{ fontSize: 20 }} /> },
  { value: 'personal_equipment', label: 'ציוד רוכב אישי (כגון מעיל, קסדה)', icon: <Build sx={{ fontSize: 20 }} /> },
  { value: 'assistance_equipment', label: 'ציוד סיוע לאחר (כגון ג\'ק, ערכת פתיחה)', icon: <Build sx={{ fontSize: 20 }} /> },
];

const SUB_CATEGORIES = {
  scooter: [
    'ברקסים',
    'צמיג לא תקין',
    'טיפול תקופתי (1000 / 12000 / 24000 / 36000)',
    'מדבקות מיתוג',
    'פליקרים',
    'פנצ\'ר',
    'רעש מוזר מלמטה',
    'ידית ברקס',
    'תופסן לאופנוע',
    'אחר',
  ],
  personal_equipment: [
    'קסדה',
    'מעיל גשם/סערה',
    'כפפות',
    'שרשרת',
    'מנעול',
    'מעיל',
    'דיבורית',
    'מנעול דיסק',
    'מתקן טלפון',
    'אחר',
  ],
  assistance_equipment: [
    'בוסטר נוקו GB150',
    'ערכת פתיחה',
    'ג\'ק מספריים',
    'ג\'ק בקבוק 4 טון',
    'בוקסות מגנזיום',
    'בוקסות שחוקים',
    'פטיש',
    'מפתח T',
    'קומפרסור',
    'ספריי שמן',
    'ספריי קרבורטור',
    'סכין יפני',
    'פיוזים',
    'מודד מתח',
    'מפתח ונטילים',
    'כפפות עבודה',
    'ערכת תולעים',
    'ברגי סיליקון',
    'חולץ מפתחות',
    'חותך טבעות',
    'אחר',
  ],
};

const statusOptions = [
  { value: 'open', label: 'פתוחה' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'resolved', label: 'נפתרה' },
];

export default function FaultDialog({ open, onClose, onSave, fault }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    riderId: '',
    reportedById: '',
    urgencyLevel: '',        // 'cannot_ride' | 'needs_treatment'
    faultArea: '',           // 'scooter' | 'personal_equipment' | 'assistance_equipment'
    subCategory: '',
    customSubCategory: '',
    description: '',
    status: 'open',
    reportedDate: new Date().toISOString().split('T')[0],
    resolvedDate: '',
    notes: '',
  });

  const [images, setImages] = useState([]);  // { url, fileId, webViewLink, name } or legacy { data: base64 }
  const [uploadingImages, setUploadingImages] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxLink, setLightboxLink] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});

  // משימה מקושרת
  const [createLinkedTask, setCreateLinkedTask] = useState(false);
  const [linkedTaskData, setLinkedTaskData] = useState({
    title: '',
    assigneeId: '',
    priority: 'high',
    dueDate: '',
    includePhotos: false,
  });

  // טיפול מקושר
  const [createLinkedMaintenance, setCreateLinkedMaintenance] = useState(false);
  const [linkedMaintenanceData, setLinkedMaintenanceData] = useState({
    maintenanceType: 'repair',
    description: '',
    status: 'scheduled',
  });

  useEffect(() => {
    if (open) {
      loadVehicles();
      loadUsers();
    }
  }, [open]);

  useEffect(() => {
    if (fault) {
      // Restore urgencyLevel from canRide
      let urgencyLevel = '';
      if (fault.canRide === false) urgencyLevel = 'cannot_ride';
      else if (fault.canRide === true) urgencyLevel = 'needs_treatment';

      setFormData({
        vehicleId: fault.vehicleId || '',
        riderId: fault.riderId || '',
        reportedById: fault.reportedById || fault.reportedBy || '',
        urgencyLevel,
        faultArea: fault.category || fault.faultArea || '',
        subCategory: fault.subCategory || fault.title || '',
        customSubCategory: fault.customSubCategory || '',
        description: fault.description || '',
        status: fault.status || 'open',
        reportedDate: fault.reportedDate ? fault.reportedDate.split('T')[0] : new Date().toISOString().split('T')[0],
        resolvedDate: fault.resolvedDate ? fault.resolvedDate.split('T')[0] : '',
        notes: fault.notes || '',
      });
      setImages(fault.photos || []);
    } else {
      setFormData({
        vehicleId: '',
        riderId: '',
        reportedById: '',
        urgencyLevel: '',
        faultArea: '',
        subCategory: '',
        customSubCategory: '',
        description: '',
        status: 'open',
        reportedDate: new Date().toISOString().split('T')[0],
        resolvedDate: '',
        notes: '',
      });
      setImages([]);
    }
    setErrors({});
    setCreateLinkedTask(false);
    setLinkedTaskData({ title: '', assigneeId: '', priority: 'high', dueDate: '', includePhotos: false });
    setCreateLinkedMaintenance(false);
    setLinkedMaintenanceData({ maintenanceType: 'repair', description: '', status: 'scheduled' });
  }, [fault, open]);

  const loadVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      setVehicles(response.data.vehicles || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data.users || response.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Reset sub-category when fault area changes
      if (field === 'faultArea') {
        updated.subCategory = '';
        updated.customSubCategory = '';
      }
      if (field === 'subCategory') {
        updated.customSubCategory = '';
      }
      return updated;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAutocompleteChange = (field) => (event, value) => {
    setFormData(prev => ({ ...prev, [field]: value?.id || value?._id || '' }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const compressImage = (file) =>
    new Promise((resolve) => {
      const maxDim = 1920;
      const quality = 0.75;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
            else { width = Math.round((width * maxDim) / height); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
            'image/jpeg',
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  // Image upload → Google Drive
  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = '';
    if (!files.length) return;
    setUploadingImages(true);
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('photo', compressed);
        const response = await faultsAPI.uploadPhoto(formData);
        setImages(prev => [...prev, response.data.file]);
      } catch (err) {
        console.error('Error uploading photo to Drive:', err);
      }
    }
    setUploadingImages(false);
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.vehicleId) newErrors.vehicleId = 'שדה חובה';
    if (!formData.urgencyLevel) newErrors.urgencyLevel = 'שדה חובה';
    if (!formData.faultArea) newErrors.faultArea = 'שדה חובה';
    if (!formData.subCategory) newErrors.subCategory = 'שדה חובה';
    if (formData.subCategory === 'אחר' && !formData.customSubCategory.trim()) {
      newErrors.customSubCategory = 'נא לפרט את הבעיה';
    }
    if (!formData.description.trim()) newErrors.description = 'שדה חובה';
    if (!formData.reportedDate) newErrors.reportedDate = 'שדה חובה';
    if (formData.status === 'resolved' && !formData.resolvedDate) {
      newErrors.resolvedDate = 'חובה להזין תאריך פתרון';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const title = formData.subCategory === 'אחר'
      ? formData.customSubCategory
      : formData.subCategory;

    const dataToSave = {
      vehicleId: formData.vehicleId,
      riderId: formData.riderId,
      reportedById: formData.reportedById,
      urgencyLevel: formData.urgencyLevel,
      canRide: formData.urgencyLevel === 'cannot_ride' ? false : true,
      category: formData.faultArea,
      faultArea: formData.faultArea,
      subCategory: formData.subCategory,
      customSubCategory: formData.customSubCategory,
      title,
      description: formData.description,
      severity: formData.urgencyLevel === 'cannot_ride' ? 'critical' : 'moderate',
      status: formData.status,
      reportedDate: formData.reportedDate,
      resolvedDate: formData.resolvedDate,
      notes: formData.notes,
      photos: images,
      ...(createLinkedTask && linkedTaskData.title.trim() ? {
        linkedTask: {
          title: linkedTaskData.title.trim(),
          assigneeId: linkedTaskData.assigneeId || null,
          priority: linkedTaskData.priority,
          dueDate: linkedTaskData.dueDate || null,
          includePhotos: linkedTaskData.includePhotos,
        }
      } : {}),
      ...(createLinkedMaintenance ? {
        linkedMaintenance: {
          maintenanceType: linkedMaintenanceData.maintenanceType,
          description: linkedMaintenanceData.description.trim() || formData.description.trim(),
          status: linkedMaintenanceData.status,
        }
      } : {}),
    };

    onSave(dataToSave);
  };

  const getUserLabel = (user) => {
    if (!user) return '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.username || user.email || '';
  };

  const getVehicleLabel = (vehicle) => {
    if (!vehicle) return '';
    const parts = [];
    if (vehicle.internalNumber) parts.push(vehicle.internalNumber);
    if (vehicle.licensePlate) parts.push(vehicle.licensePlate);
    if (vehicle.assignedRiderName) parts.push(vehicle.assignedRiderName);
    return parts.join(' | ') || vehicle.licensePlate || '';
  };

  const handleVehicleChange = (event, vehicle) => {
    const vehicleId = vehicle?.id || vehicle?._id || '';
    const riderId = vehicle?.assignedRiderId || '';
    setFormData(prev => ({ ...prev, vehicleId, riderId }));
    if (errors.vehicleId) setErrors(prev => ({ ...prev, vehicleId: '' }));
  };

  const subCategoryOptions = formData.faultArea ? SUB_CATEGORIES[formData.faultArea] : [];

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
        <AppBar sx={{ position: 'relative', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={onClose}>
              <Close />
            </IconButton>
            <Typography sx={{ flex: 1 }} variant="h6">
              {fault ? 'עריכת תקלה' : 'דיווח תקלה חדשה'}
            </Typography>
            <Button autoFocus color="inherit" onClick={handleSubmit} sx={{ fontWeight: 700 }}>
              {fault ? 'עדכן' : 'שמור'}
            </Button>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 0 }}>
          {fault ? 'עריכת תקלה' : 'דיווח תקלה חדשה'}
        </DialogTitle>
      )}

      <DialogContent sx={{ pt: isMobile ? 3 : 2 }}>
        <Grid container spacing={2.5} sx={{ mt: 0 }}>

          {/* ── שורה 1: כלי (מספר פנימי | מספר רישוי | שם רוכב) ── */}
          <Grid item xs={12}>
            <Autocomplete
              options={vehicles}
              getOptionLabel={getVehicleLabel}
              value={vehicles.find(v => (v.id || v._id) === formData.vehicleId) || null}
              onChange={handleVehicleChange}
              renderInput={(params) => (
                <TextField {...params} label="כלי" required
                  error={!!errors.vehicleId} helperText={errors.vehicleId || 'מספר פנימי | מספר רישוי | שם רוכב'} />
              )}
            />
          </Grid>

          {/* ── שורה 2: מי מדווח + תאריך ── */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={users}
              getOptionLabel={getUserLabel}
              value={users.find(u => (u.id || u._id) === formData.reportedById) || null}
              onChange={handleAutocompleteChange('reportedById')}
              renderInput={(params) => (
                <TextField {...params} label="מי מדווח" helperText="המשתמש שמגיש את הדיווח" />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="תאריך דיווח" type="date" required
              value={formData.reportedDate}
              onChange={handleChange('reportedDate')}
              error={!!errors.reportedDate} helperText={errors.reportedDate}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>

          {/* ── רמת דחיפות ── */}
          <Grid item xs={12}>
            <FormControl component="fieldset" error={!!errors.urgencyLevel}>
              <FormLabel component="legend" sx={{
                fontWeight: 700, color: '#dc2626', mb: 1.5, fontSize: '0.95rem',
                '&.Mui-focused': { color: '#dc2626' },
              }}>
                רמת דחיפות *
              </FormLabel>
              <RadioGroup value={formData.urgencyLevel} onChange={handleChange('urgencyLevel')}>
                <FormControlLabel
                  value="cannot_ride"
                  control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cancel sx={{ color: '#dc2626', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600} color="#dc2626">
                        לא ניתן לרכב עם הקטנוע במצב הזה
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="needs_treatment"
                  control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning sx={{ color: '#d97706', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600} color="#d97706">
                        ניתן לרכב עם הקטנוע אבל מצריך טיפול
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
              {errors.urgencyLevel && (
                <Typography variant="caption" sx={{ color: '#ef4444', mt: 0.5 }}>
                  {errors.urgencyLevel}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>

          {/* ── במה הבעיה? ── */}
          <Grid item xs={12}>
            <FormControl component="fieldset" error={!!errors.faultArea}>
              <FormLabel component="legend" sx={{
                fontWeight: 700, color: '#1e293b', mb: 1.5, fontSize: '0.95rem',
                '&.Mui-focused': { color: '#6366f1' },
              }}>
                במה הבעיה? *
              </FormLabel>
              <RadioGroup value={formData.faultArea} onChange={handleChange('faultArea')}>
                {FAULT_AREAS.map(area => (
                  <FormControlLabel
                    key={area.value}
                    value={area.value}
                    control={<Radio sx={{ '&.Mui-checked': { color: '#6366f1' } }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{area.label}</Typography>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
              {errors.faultArea && (
                <Typography variant="caption" sx={{ color: '#ef4444', mt: 0.5 }}>
                  {errors.faultArea}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* ── סוג הבעיה (דינמי לפי faultArea) ── */}
          {formData.faultArea && (
            <Grid item xs={12}>
              <TextField
                select fullWidth label="סוג הבעיה" required
                value={formData.subCategory}
                onChange={handleChange('subCategory')}
                error={!!errors.subCategory} helperText={errors.subCategory}
              >
                {subCategoryOptions.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {/* ── פירוט אחר ── */}
          {formData.subCategory === 'אחר' && (
            <Grid item xs={12}>
              <TextField
                fullWidth label="פרט את הבעיה" required
                value={formData.customSubCategory}
                onChange={handleChange('customSubCategory')}
                error={!!errors.customSubCategory}
                helperText={errors.customSubCategory || 'פרט במה מדובר'}
                placeholder="תאר בקצרה את הבעיה..."
              />
            </Grid>
          )}

          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>

          {/* ── פירוט התקלה ── */}
          <Grid item xs={12}>
            <TextField
              fullWidth label="פירוט התקלה" required multiline rows={3}
              value={formData.description}
              onChange={handleChange('description')}
              error={!!errors.description} helperText={errors.description}
              placeholder="תאר בפירוט את הבעיה - מה קרה, מתי, אם יש צלילים או ריחות חריגים..."
            />
          </Grid>

          {/* ── תמונות ── */}
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight={600} color="#475569" sx={{ mb: 1 }}>
              תמונות (אופציונלי)
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
              {uploadingImages && (
                <Box sx={{ width: 80, height: 80, borderRadius: '10px', border: '2px dashed #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <Typography variant="caption" align="center">מעלה...</Typography>
                </Box>
              )}
              {images.map((img, index) => {
                const src = getPhotoSrc(img);
                return (
                <Box key={index} sx={{ position: 'relative', width: 80, height: 80 }}>
                  <Tooltip title="לחץ להגדלה">
                    <Box
                      component="img"
                      src={src}
                      alt={img.name || `תמונה ${index + 1}`}
                      onClick={() => { setLightboxSrc(src); setLightboxLink(img.webViewLink || src); }}
                      sx={{
                        width: 80, height: 80, objectFit: 'cover',
                        borderRadius: '10px', border: '2px solid #e2e8f0',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.85, border: '2px solid #6366f1' },
                        transition: 'all 0.15s',
                      }}
                    />
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(index)}
                    sx={{
                      position: 'absolute', top: -8, right: -8,
                      bgcolor: '#ef4444', color: '#fff', width: 22, height: 22,
                      '&:hover': { bgcolor: '#dc2626' },
                    }}
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                );
              })}
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  borderRadius: '10px', borderColor: '#e2e8f0', color: '#64748b',
                  height: 80, minWidth: 80, flexDirection: 'column', gap: 0.5,
                  '&:hover': { borderColor: '#6366f1', color: '#6366f1', bgcolor: 'rgba(99,102,241,0.04)' },
                }}
              >
                <PhotoCamera sx={{ fontSize: 24 }} />
                <Typography variant="caption">הוסף תמונה</Typography>
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>

          {/* ── שורת ניהול: סטטוס + תאריך פתרון ── */}
          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth label="סטטוס"
              value={formData.status}
              onChange={handleChange('status')}
            >
              {statusOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="תאריך פתרון" type="date"
              value={formData.resolvedDate}
              onChange={handleChange('resolvedDate')}
              error={!!errors.resolvedDate} helperText={errors.resolvedDate}
              InputLabelProps={{ shrink: true }}
              disabled={formData.status !== 'resolved'}
            />
          </Grid>

          {/* ── הערות ── */}
          <Grid item xs={12}>
            <TextField
              fullWidth label="הערות" multiline rows={2}
              value={formData.notes}
              onChange={handleChange('notes')}
            />
          </Grid>

          {/* ── משימה מקושרת ── */}
          <Grid item xs={12}>
            <Divider sx={{ borderColor: '#e2e8f0' }} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Assignment sx={{ color: '#6366f1', fontSize: 20 }} />
              <Typography variant="body1" fontWeight={700} color="#1e293b">
                משימה מקושרת
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={createLinkedTask}
                  onChange={(e) => {
                    setCreateLinkedTask(e.target.checked);
                    if (e.target.checked && !linkedTaskData.title) {
                      const autoTitle = formData.subCategory === 'אחר'
                        ? formData.customSubCategory
                        : formData.subCategory;
                      setLinkedTaskData(prev => ({ ...prev, title: autoTitle || '' }));
                    }
                  }}
                  sx={{ '&.Mui-checked': { color: '#6366f1' } }}
                />
              }
              label={
                <Typography variant="body2" color="#475569">
                  צור משימה חדשה מקושרת לתקלה זו
                </Typography>
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Collapse in={createLinkedTask}>
              <Box sx={{ bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="כותרת המשימה"
                      required
                      value={linkedTaskData.title}
                      onChange={(e) => setLinkedTaskData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="תאר את המשימה הנדרשת..."
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>שייך למשתמש</InputLabel>
                      <Select
                        value={linkedTaskData.assigneeId}
                        onChange={(e) => setLinkedTaskData(prev => ({ ...prev, assigneeId: e.target.value }))}
                        label="שייך למשתמש"
                      >
                        <MenuItem value="">ללא שיוך</MenuItem>
                        {users.map(u => (
                          <MenuItem key={u._id || u.id} value={u._id || u.id}>
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>עדיפות</InputLabel>
                      <Select
                        value={linkedTaskData.priority}
                        onChange={(e) => setLinkedTaskData(prev => ({ ...prev, priority: e.target.value }))}
                        label="עדיפות"
                      >
                        <MenuItem value="low">נמוך</MenuItem>
                        <MenuItem value="medium">בינוני</MenuItem>
                        <MenuItem value="high">גבוה</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="תאריך יעד"
                      type="date"
                      size="small"
                      value={linkedTaskData.dueDate}
                      onChange={(e) => setLinkedTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  {images.length > 0 && (
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={linkedTaskData.includePhotos}
                            onChange={(e) => setLinkedTaskData(prev => ({ ...prev, includePhotos: e.target.checked }))}
                            size="small"
                            sx={{ '&.Mui-checked': { color: '#6366f1' } }}
                          />
                        }
                        label={
                          <Typography variant="body2" color="#475569">
                            צרף תמונות מהתקלה למשימה ({images.length})
                          </Typography>
                        }
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Collapse>
          </Grid>

          {/* ── טיפול מקושר ── */}
          <Grid item xs={12}>
            <Divider sx={{ borderColor: '#e2e8f0' }} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Build sx={{ color: '#f97316', fontSize: 20 }} />
              <Typography variant="body1" fontWeight={700} color="#1e293b">
                טיפול מקושר
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={createLinkedMaintenance}
                  onChange={(e) => {
                    setCreateLinkedMaintenance(e.target.checked);
                    if (e.target.checked && !linkedMaintenanceData.description) {
                      setLinkedMaintenanceData(prev => ({ ...prev, description: formData.description || '' }));
                    }
                  }}
                  sx={{ '&.Mui-checked': { color: '#f97316' } }}
                />
              }
              label={
                <Typography variant="body2" color="#475569">
                  צור טיפול מתוזמן מקושר לתקלה זו
                </Typography>
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Collapse in={createLinkedMaintenance}>
              <Box sx={{ bgcolor: '#fff7ed', borderRadius: '12px', border: '1px solid #fed7aa', p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>סוג טיפול</InputLabel>
                      <Select
                        value={linkedMaintenanceData.maintenanceType}
                        onChange={(e) => setLinkedMaintenanceData(prev => ({ ...prev, maintenanceType: e.target.value }))}
                        label="סוג טיפול"
                      >
                        <MenuItem value="repair">תיקון</MenuItem>
                        <MenuItem value="routine">טיפול תקופתי</MenuItem>
                        <MenuItem value="emergency">חירום</MenuItem>
                        <MenuItem value="accident_repair">תיקון תאונה</MenuItem>
                        <MenuItem value="recall">ריקול</MenuItem>
                        <MenuItem value="other">אחר</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>סטטוס</InputLabel>
                      <Select
                        value={linkedMaintenanceData.status}
                        onChange={(e) => setLinkedMaintenanceData(prev => ({ ...prev, status: e.target.value }))}
                        label="סטטוס"
                      >
                        <MenuItem value="scheduled">מתוזמן</MenuItem>
                        <MenuItem value="in_progress">בביצוע</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="תיאור הטיפול"
                      multiline
                      rows={2}
                      size="small"
                      value={linkedMaintenanceData.description}
                      onChange={(e) => setLinkedMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="תיאור הטיפול הנדרש..."
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Grid>
        </Grid>
      </DialogContent>

      {!isMobile && (
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={onClose} sx={{ borderRadius: '10px', fontWeight: 600, color: '#64748b' }}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              borderRadius: '10px', fontWeight: 600,
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              '&:hover': { boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)' },
            }}
          >
            {fault ? 'עדכן תקלה' : 'שמור תקלה'}
          </Button>
        </DialogActions>
      )}

      {/* Lightbox */}
      <Dialog
        open={!!lightboxSrc}
        onClose={() => { setLightboxSrc(null); setLightboxLink(null); }}
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: '#000', borderRadius: '12px', p: 0, m: 1, overflow: 'hidden' } }}
      >
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1, zIndex: 1 }}>
          <IconButton
            onClick={() => window.open(lightboxLink || lightboxSrc, '_blank')}
            sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}
            title="פתח ב-Drive"
          >
            <PhotoCamera sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            onClick={() => setLightboxSrc(null)}
            sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}
          >
            <Close />
          </IconButton>
        </Box>
        {lightboxSrc && (
          <Box
            component="img"
            src={lightboxSrc}
            sx={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
          />
        )}
      </Dialog>
    </Dialog>
  );
}
