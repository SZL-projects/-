import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Warning,
  CheckCircle,
  TwoWheeler,
  Build,
  Cancel,
  DirectionsCar,
  ArrowBack,
  ArrowForward,
  Send,
  PhotoCamera,
  Close,
} from '@mui/icons-material';
import { faultsAPI, vehiclesAPI, ridersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FAULT_AREAS = [
  { value: 'scooter', label: 'בקטנוע' },
  { value: 'personal_equipment', label: 'ציוד רוכב אישי (כגון מעיל, קסדה)' },
  { value: 'assistance_equipment', label: 'ציוד סיוע לאחר (כגון ג\'ק, ערכת פתיחה)' },
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

const steps = ['פרטי כלי', 'סוג התקלה', 'תיאור ותמונות', 'סיכום'];

export default function FaultReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);

  const [formData, setFormData] = useState({
    vehicleId: '',
    vehicleLicensePlate: '',
    riderId: '',
    currentKm: '',
    urgencyLevel: '',         // 'cannot_ride' | 'needs_treatment'
    faultArea: '',            // 'scooter' | 'personal_equipment' | 'assistance_equipment'
    subCategory: '',
    customSubCategory: '',
    description: '',
    location: '',
    reportedDate: new Date().toISOString(),
  });

  const textFieldSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
  }), []);

  useEffect(() => {
    loadVehicleData();
  }, [user]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);

      let vehicleId = null;
      let riderData = null;
      let riderId = user?.riderId;

      if (user?.riderId) {
        try {
          const riderResponse = await ridersAPI.getById(user.riderId);
          riderData = riderResponse.data.rider;

          if (riderData.assignmentStatus === 'assigned' && riderData.assignedVehicleId) {
            vehicleId = riderData.assignedVehicleId;
          }
        } catch (err) {
          console.error('Error loading rider by ID:', err);
        }
      }

      if (!riderData && user?.username) {
        try {
          const ridersResponse = await ridersAPI.getAll();
          const allRiders = ridersResponse.data.riders || ridersResponse.data;

          const matchedRider = allRiders.find(r =>
            (r.username && r.username.toLowerCase() === user.username.toLowerCase()) ||
            (`${r.firstName} ${r.lastName}`.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase())
          );

          if (matchedRider) {
            riderData = matchedRider;
            riderId = matchedRider._id || matchedRider.id;

            if (matchedRider.assignmentStatus === 'assigned' && matchedRider.assignedVehicleId) {
              vehicleId = matchedRider.assignedVehicleId;
            } else if (matchedRider.isAssigned && matchedRider.assignedVehicleId) {
              vehicleId = matchedRider.assignedVehicleId;
            }
          }
        } catch (err) {
          console.error('Error searching for rider:', err);
        }
      }

      if (!vehicleId && user?.vehicleAccess && user.vehicleAccess.length > 0) {
        vehicleId = user.vehicleAccess[0];
      }

      if (!vehicleId) {
        setError('לא נמצא כלי משויך. אנא פנה למנהל.');
        setLoading(false);
        return;
      }

      const vehicleResponse = await vehiclesAPI.getById(vehicleId);
      const vehicleData = vehicleResponse.data.vehicle;
      setVehicle(vehicleData);

      setFormData(prev => ({
        ...prev,
        vehicleId: vehicleData._id || vehicleData.id,
        vehicleLicensePlate: vehicleData.licensePlate,
        riderId: riderId,
        currentKm: vehicleData.currentKilometers || vehicleData.currentMileage || '',
      }));

      setLoading(false);
    } catch (err) {
      console.error('Error loading vehicle:', err);
      setError('שגיאה בטעינת פרטי הכלי');
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'faultArea') {
        updated.subCategory = '';
        updated.customSubCategory = '';
      }
      if (field === 'subCategory') {
        updated.customSubCategory = '';
      }
      return updated;
    });
    setError('');
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, { data: e.target.result, name: file.name, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.currentKm || isNaN(formData.currentKm)) {
          setError('נא להזין קילומטראז\' נוכחי תקין');
          return false;
        }
        break;
      case 1:
        if (!formData.urgencyLevel) {
          setError('נא לציין את רמת הדחיפות');
          return false;
        }
        if (!formData.faultArea) {
          setError('נא לבחור במה הבעיה');
          return false;
        }
        if (!formData.subCategory) {
          setError('נא לבחור את סוג הבעיה');
          return false;
        }
        if (formData.subCategory === 'אחר' && !formData.customSubCategory.trim()) {
          setError('נא לפרט את הבעיה');
          return false;
        }
        break;
      case 2:
        if (!formData.description || formData.description.length < 10) {
          setError('נא לספק תיאור מפורט (לפחות 10 תווים)');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setSubmitting(true);

      const title = formData.subCategory === 'אחר'
        ? formData.customSubCategory
        : formData.subCategory;

      const faultData = {
        vehicleId: formData.vehicleId,
        vehicleLicensePlate: formData.vehicleLicensePlate,
        vehicleNumber: formData.vehicleLicensePlate,
        riderId: formData.riderId,
        urgencyLevel: formData.urgencyLevel,
        canRide: formData.urgencyLevel === 'cannot_ride' ? false : true,
        category: formData.faultArea,
        faultArea: formData.faultArea,
        subCategory: formData.subCategory,
        customSubCategory: formData.customSubCategory,
        title,
        description: formData.description,
        severity: formData.urgencyLevel === 'cannot_ride' ? 'critical' : 'moderate',
        currentKm: parseInt(formData.currentKm),
        location: formData.location || '',
        reportedDate: formData.reportedDate,
        status: 'open',
        reportedBy: user._id || user.id,
        photos: images,
      };

      await faultsAPI.create(faultData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/my-faults');
      }, 2500);
    } catch (err) {
      console.error('Error submitting fault report:', err);
      setError(err.response?.data?.message || 'שגיאה בשליחת הדיווח. נסה שוב.');
      setSubmitting(false);
    }
  };

  const getFaultAreaLabel = (area) => {
    return FAULT_AREAS.find(a => a.value === area)?.label || area;
  };

  const getSubCategoryLabel = () => {
    if (formData.subCategory === 'אחר') return formData.customSubCategory || 'אחר';
    return formData.subCategory;
  };

  const getUrgencyInfo = () => {
    if (formData.urgencyLevel === 'cannot_ride') {
      return { label: 'לא ניתן לרכב', color: '#dc2626', bgcolor: 'rgba(239,68,68,0.1)' };
    }
    return { label: 'ניתן לרכב - מצריך טיפול', color: '#d97706', bgcolor: 'rgba(245,158,11,0.1)' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <CheckCircle sx={{ fontSize: 44, color: '#059669' }} />
          </Box>
          <Typography variant="h4" sx={{ color: '#059669', fontWeight: 700 }} gutterBottom>
            דיווח התקלה נשלח בהצלחה!
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', mb: 2 }}>
            תודה על הדיווח על התקלה בכלי {formData.vehicleLicensePlate}
          </Typography>
          <Alert
            severity={formData.urgencyLevel === 'cannot_ride' ? 'error' : 'info'}
            sx={{
              mt: 2,
              borderRadius: '12px',
              bgcolor: formData.urgencyLevel === 'cannot_ride' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
              border: `1px solid ${formData.urgencyLevel === 'cannot_ride' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
            }}
          >
            {formData.urgencyLevel === 'cannot_ride' ? (
              <Typography variant="body2" sx={{ color: '#dc2626' }}>
                <strong>שים לב:</strong> דיווחת שלא ניתן לרכב על הכלי. אנא המתן להוראות מהמנהל.
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: '#6366f1' }}>
                צוות האחזקה יטפל בתקלה בהקדם האפשרי.
              </Typography>
            )}
          </Alert>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 3 }}>
            מועבר לדף התקלות שלי...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error && !vehicle) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: '12px',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate('/my-vehicle')}
          sx={{
            borderRadius: '10px',
            borderColor: '#6366f1',
            color: '#6366f1',
            textTransform: 'none',
            '&:hover': { borderColor: '#4f46e5', bgcolor: 'rgba(99, 102, 241, 0.04)' },
          }}
        >
          חזרה
        </Button>
      </Box>
    );
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Card
              sx={{
                mb: 3,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '16px',
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TwoWheeler sx={{ fontSize: 36, color: '#fff' }} />
                  </Box>
                  <Box sx={{ color: '#fff' }}>
                    <Typography variant="h6" fontWeight={600}>
                      {vehicle?.manufacturer} {vehicle?.model}
                    </Typography>
                    <Typography variant="body1">
                      {formData.vehicleLicensePlate}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {vehicle?.type === 'scooter' ? 'קטנוע' : 'אופנוע'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="קילומטראז' נוכחי"
                  required
                  type="number"
                  value={formData.currentKm}
                  onChange={handleChange('currentKm')}
                  helperText={
                    vehicle?.currentKilometers
                      ? `קילומטראז' אחרון במערכת: ${vehicle.currentKilometers.toLocaleString()} ק"מ`
                      : 'הזן את הקילומטראז\' הנוכחי'
                  }
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="מיקום נוכחי (אופציונלי)"
                  value={formData.location}
                  onChange={handleChange('location')}
                  placeholder="איפה אתה נמצא כרגע?"
                  helperText="למשל: רח' הרצל 45, תל אביב"
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            {/* רמת דחיפות */}
            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{
                fontWeight: 700, color: '#dc2626', mb: 1.5, fontSize: '1rem',
                '&.Mui-focused': { color: '#dc2626' },
              }}>
                רמת דחיפות *
              </FormLabel>
              <RadioGroup value={formData.urgencyLevel} onChange={handleChange('urgencyLevel')}>
                <FormControlLabel
                  value="cannot_ride"
                  control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />}
                  label={
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      p: 1.5, borderRadius: '10px',
                      bgcolor: formData.urgencyLevel === 'cannot_ride' ? 'rgba(239,68,68,0.08)' : 'transparent',
                    }}>
                      <Cancel sx={{ color: '#dc2626', fontSize: 22 }} />
                      <Typography fontWeight={600} color="#dc2626">
                        לא ניתן לרכב עם הקטנוע במצב הזה
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="needs_treatment"
                  control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />}
                  label={
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      p: 1.5, borderRadius: '10px',
                      bgcolor: formData.urgencyLevel === 'needs_treatment' ? 'rgba(245,158,11,0.08)' : 'transparent',
                    }}>
                      <Warning sx={{ color: '#d97706', fontSize: 22 }} />
                      <Typography fontWeight={600} color="#d97706">
                        ניתן לרכב עם הקטנוע אבל מצריך טיפול
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            <Divider sx={{ borderColor: '#e2e8f0', mb: 3 }} />

            {/* במה הבעיה? */}
            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{
                fontWeight: 700, color: '#1e293b', mb: 1.5, fontSize: '1rem',
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
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        p: 1, borderRadius: '8px',
                        bgcolor: formData.faultArea === area.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                      }}>
                        <Typography>{area.label}</Typography>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {/* סוג הבעיה - דינמי */}
            {formData.faultArea && (
              <>
                <Divider sx={{ borderColor: '#e2e8f0', mb: 3 }} />
                <TextField
                  fullWidth select label="סוג הבעיה" required
                  value={formData.subCategory}
                  onChange={handleChange('subCategory')}
                  helperText="בחר את הסוג המתאים"
                  sx={textFieldSx}
                >
                  {SUB_CATEGORIES[formData.faultArea].map(opt => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </TextField>

                {formData.subCategory === 'אחר' && (
                  <TextField
                    fullWidth label="פרט את הבעיה" required
                    value={formData.customSubCategory}
                    onChange={handleChange('customSubCategory')}
                    placeholder="תאר בקצרה את הבעיה..."
                    sx={{ ...textFieldSx, mt: 2 }}
                  />
                )}
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Alert
              severity="info"
              sx={{
                mb: 3, borderRadius: '12px',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                '& .MuiAlert-icon': { color: '#6366f1' },
                '& .MuiAlert-message': { color: '#6366f1' },
              }}
            >
              ספק תיאור מפורט ככל האפשר - זה יעזור לצוות התחזוקה להבין את הבעיה
            </Alert>

            <TextField
              fullWidth label="תיאור מפורט של התקלה" required multiline rows={6}
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="תאר בפירוט:&#10;• מה בדיוק קרה?&#10;• מתי זה התחיל?&#10;• האם זה קרה פתאום או בהדרגה?&#10;• האם יש צלילים מוזרים או ריחות?"
              helperText={`${formData.description.length} תווים (מינימום 10)`}
              sx={textFieldSx}
            />

            {/* העלאת תמונות */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" fontWeight={600} color="#475569" sx={{ mb: 1.5 }}>
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
                {images.map((img, index) => (
                  <Box key={index} sx={{ position: 'relative', width: 90, height: 90 }}>
                    <Box
                      component="img"
                      src={img.data}
                      alt={img.name}
                      sx={{
                        width: 90, height: 90, objectFit: 'cover',
                        borderRadius: '12px', border: '2px solid #e2e8f0',
                      }}
                    />
                    <Box
                      onClick={() => handleRemoveImage(index)}
                      sx={{
                        position: 'absolute', top: -8, right: -8,
                        bgcolor: '#ef4444', borderRadius: '50%',
                        width: 24, height: 24, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: '#dc2626' },
                      }}
                    >
                      <Close sx={{ fontSize: 14, color: '#fff' }} />
                    </Box>
                  </Box>
                ))}
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: 90, height: 90, borderRadius: '12px',
                    border: '2px dashed #c7d2fe', display: 'flex',
                    flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', gap: 0.5,
                    color: '#6366f1',
                    '&:hover': { bgcolor: 'rgba(99,102,241,0.05)', borderColor: '#6366f1' },
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 26 }} />
                  <Typography variant="caption" fontWeight={600}>הוסף</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: '12px',
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                '& .MuiAlert-icon': { color: '#059669' },
                '& .MuiAlert-message': { color: '#059669' },
              }}
            >
              בדוק את הפרטים לפני השליחה
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>פרטי כלי</Typography>
                    <Typography sx={{ color: '#475569' }}>מספר רישוי: <strong style={{ color: '#1e293b' }}>{formData.vehicleLicensePlate}</strong></Typography>
                    <Typography sx={{ color: '#475569' }}>קילומטראז': <strong style={{ color: '#1e293b' }}>{parseInt(formData.currentKm).toLocaleString()} ק"מ</strong></Typography>
                    {formData.location && (
                      <Typography sx={{ color: '#475569' }}>מיקום: <strong style={{ color: '#1e293b' }}>{formData.location}</strong></Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    bgcolor: formData.canRide === 'no' ? 'rgba(239, 68, 68, 0.05)' :
                             formData.canRide === 'unsure' ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>פרטי תקלה</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {formData.urgencyLevel && (
                        <Chip
                          icon={formData.urgencyLevel === 'cannot_ride'
                            ? <Cancel sx={{ fontSize: 16 }} />
                            : <Warning sx={{ fontSize: 16 }} />}
                          label={getUrgencyInfo().label}
                          sx={{
                            bgcolor: getUrgencyInfo().bgcolor,
                            color: getUrgencyInfo().color,
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      )}
                      {formData.faultArea && (
                        <Chip
                          label={getFaultAreaLabel(formData.faultArea)}
                          sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 500 }}
                        />
                      )}
                      {formData.subCategory && (
                        <Chip
                          label={getSubCategoryLabel()}
                          sx={{ bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#475569', fontWeight: 500 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {formData.description}
                    </Typography>
                    {images.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                        {images.map((img, i) => (
                          <Box key={i} component="img" src={img.data} alt={img.name}
                            sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {formData.urgencyLevel === 'cannot_ride' && (
                <Grid item xs={12}>
                  <Alert
                    severity="error"
                    sx={{
                      borderRadius: '12px',
                      bgcolor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <Typography variant="body2" fontWeight="500" sx={{ color: '#dc2626' }}>
                      שים לב: דיווחת שלא ניתן לרכב על הכלי. אנא המתן להוראות מהמנהל ואל תשתמש בכלי עד לטיפול בתקלה.
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}
        >
          <Warning sx={{ fontSize: 28, color: '#ffffff' }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
            דיווח תקלה
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            דווח על תקלה בכלי שלך ואנו נטפל בה בהקדם
          </Typography>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 4,
            '& .MuiStepLabel-root .Mui-completed': { color: '#6366f1' },
            '& .MuiStepLabel-root .Mui-active': { color: '#6366f1' },
            '& .MuiStepConnector-line': { borderColor: '#e2e8f0' },
            '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': { borderColor: '#6366f1' },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: '12px',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ minHeight: 300 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowForward />}
            sx={{
              borderRadius: '10px',
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              color: '#64748b',
              '&:hover': { bgcolor: 'rgba(100, 116, 139, 0.08)' },
              '&:disabled': { color: '#cbd5e1' },
            }}
          >
            חזור
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => navigate('/my-vehicle')}
              sx={{
                borderRadius: '10px',
                px: 3,
                fontWeight: 600,
                textTransform: 'none',
                color: '#64748b',
                '&:hover': { bgcolor: 'rgba(100, 116, 139, 0.08)' },
              }}
            >
              ביטול
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Send />}
                sx={{
                  borderRadius: '10px',
                  px: 3,
                  fontWeight: 600,
                  textTransform: 'none',
                  background: formData.urgencyLevel === 'cannot_ride'
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: formData.urgencyLevel === 'cannot_ride'
                    ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                    : '0 4px 12px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    background: formData.urgencyLevel === 'cannot_ride'
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  },
                  '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
                }}
              >
                {submitting ? 'שולח...' : 'שלח דיווח'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowBack />}
                sx={{
                  borderRadius: '10px',
                  px: 3,
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  },
                }}
              >
                המשך
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
