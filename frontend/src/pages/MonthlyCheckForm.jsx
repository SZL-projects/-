import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle,
  Warning,
  TwoWheeler,
  Speed,
  Build,
  LocalGasStation,
  Opacity,
  ArrowBack,
  ArrowForward,
  Send,
} from '@mui/icons-material';
import { monthlyChecksAPI, vehiclesAPI, ridersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const steps = ['פרטי כלי', 'בדיקות חובה', 'בדיקות נוספות', 'סיכום'];

export default function MonthlyCheckForm() {
  const navigate = useNavigate();
  const { id: checkId } = useParams();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [existingCheck, setExistingCheck] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: '',
    vehicleLicensePlate: '',
    riderId: '',
    currentKm: '',
    oilCheck: '',
    waterCheck: '',
    tirePressureFront: '',
    tirePressureRear: '',
    boxScrewsTightening: '',
    boxRailLubrication: '',
    chainLubrication: '',
    brakesCondition: 'good',
    lightsCondition: 'good',
    mirrorsCondition: 'good',
    helmetCondition: 'good',
    issues: '',
    notes: '',
  });

  const textFieldSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
  }), []);

  const conditionMap = useMemo(() => ({
    good: { label: 'תקין', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    fair: { label: 'בינוני', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    poor: { label: 'לא תקין', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
  }), []);

  useEffect(() => {
    loadVehicleData();
  }, [user, checkId]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);

      if (checkId) {
        try {
          const checkResponse = await monthlyChecksAPI.getById(checkId);
          const checkData = checkResponse.data.monthlyCheck || checkResponse.data;
          setExistingCheck(checkData);

          if (checkData.vehicleId) {
            const vehicleResponse = await vehiclesAPI.getById(checkData.vehicleId);
            const vehicleData = vehicleResponse.data.vehicle;
            setVehicle(vehicleData);

            setFormData(prev => ({
              ...prev,
              vehicleId: vehicleData._id || vehicleData.id,
              vehicleLicensePlate: vehicleData.licensePlate,
              riderId: checkData.riderId,
              currentKm: vehicleData.currentKilometers || vehicleData.currentMileage || '',
            }));

            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error loading existing check:', err);
        }
      }

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
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.currentKm || isNaN(formData.currentKm)) {
          setError('נא להזין קילומטראז\' נוכחי תקין');
          return false;
        }
        if (vehicle && vehicle.currentKilometers && parseInt(formData.currentKm) < vehicle.currentKilometers) {
          setError('קילומטראז\' נוכחי לא יכול להיות נמוך מהקילומטראז\' הקודם');
          return false;
        }
        break;
      case 1:
        if (!formData.oilCheck) {
          setError('נא לבדוק את רמת השמן');
          return false;
        }
        if (vehicle?.type === 'scooter' && !formData.waterCheck) {
          setError('נא לבדוק את רמת המים');
          return false;
        }
        if (vehicle?.type === 'scooter') {
          if (!formData.boxScrewsTightening) {
            setError('נא לסמן האם בוצע חיזוק ברגי ארגז');
            return false;
          }
          if (!formData.boxRailLubrication) {
            setError('נא לסמן האם בוצע שימון מסילות ארגז');
            return false;
          }
        }
        if (vehicle?.type === 'motorcycle' && !formData.chainLubrication) {
          setError('נא לסמן האם בוצע שימון שרשרת');
          return false;
        }
        if (!formData.tirePressureFront || !formData.tirePressureRear) {
          setError('נא למלא את לחץ הצמיגים (קדמי ואחורי)');
          return false;
        }
        break;
      case 2:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setSubmitting(true);

      const checkData = {
        vehicleId: formData.vehicleId,
        vehicleLicensePlate: formData.vehicleLicensePlate,
        riderId: formData.riderId || existingCheck?.riderId,
        currentKm: parseInt(formData.currentKm),

        checkResults: {
          oilCheck: formData.oilCheck,
          waterCheck: formData.waterCheck,
          tirePressureFront: parseFloat(formData.tirePressureFront),
          tirePressureRear: parseFloat(formData.tirePressureRear),
          boxScrewsTightening: formData.boxScrewsTightening,
          boxRailLubrication: formData.boxRailLubrication,
          chainLubrication: formData.chainLubrication,
          brakesCondition: formData.brakesCondition,
          lightsCondition: formData.lightsCondition,
          mirrorsCondition: formData.mirrorsCondition,
          helmetCondition: formData.helmetCondition,
        },

        issues: formData.issues || '',
        notes: formData.notes || '',
        completedAt: new Date().toISOString(),
        status: 'completed',
      };

      if (existingCheck && checkId) {
        await monthlyChecksAPI.update(checkId, checkData);
      } else {
        checkData.checkDate = new Date().toISOString();
        await monthlyChecksAPI.create(checkData);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/my-profile');
      }, 2500);
    } catch (err) {
      console.error('Error submitting monthly check:', err);
      setError(err.response?.data?.message || 'שגיאה בשליחת הבקרה. נסה שוב.');
      setSubmitting(false);
    }
  };

  const getStatusChip = (value, type = 'check') => {
    if (type === 'check') {
      const statusConfig = {
        ok: { label: 'תקין', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
        low: { label: 'נמוך', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
        not_ok: { label: 'לא תקין', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
        done: { label: 'בוצע', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
        not_done: { label: 'לא בוצע', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
      };
      const config = statusConfig[value] || { label: value, bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
      return <Chip label={config.label} size="small" sx={{ bgcolor: config.bgcolor, color: config.color, fontWeight: 500 }} />;
    } else {
      const config = conditionMap[value] || { label: value, bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
      return <Chip label={config.label} size="small" sx={{ bgcolor: config.bgcolor, color: config.color, fontWeight: 500 }} />;
    }
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
            בקרה חודשית נשלחה בהצלחה!
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', mb: 2 }}>
            תודה על מילוי הבקרה החודשית של כלי {formData.vehicleLicensePlate}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            הנתונים נשמרו במערכת ומועבר חזרה לדף הכלי שלי...
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
                  InputProps={{
                    startAdornment: <Speed sx={{ mr: 1, color: '#6366f1' }} />,
                  }}
                  helperText={
                    vehicle?.currentKilometers
                      ? `קילומטראז' אחרון: ${vehicle.currentKilometers.toLocaleString()} ק"מ`
                      : 'הזן את הקילומטראז\' הנוכחי מהמונה'
                  }
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: '12px',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                '& .MuiAlert-icon': { color: '#6366f1' },
                '& .MuiAlert-message': { color: '#6366f1' },
              }}
            >
              בדיקות חובה - יש למלא את כל השדות
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel
                    component="legend"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      color: '#1e293b',
                      fontWeight: 600,
                      '&.Mui-focused': { color: '#1e293b' },
                    }}
                  >
                    <Opacity sx={{ color: '#6366f1' }} /> רמת שמן
                  </FormLabel>
                  <RadioGroup
                    row
                    value={formData.oilCheck}
                    onChange={handleChange('oilCheck')}
                  >
                    <FormControlLabel value="ok" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="תקין" />
                    <FormControlLabel value="low" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="נמוך" />
                    <FormControlLabel value="not_ok" control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {vehicle?.type === 'scooter' && (
                <Grid item xs={12}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel
                      component="legend"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                        color: '#1e293b',
                        fontWeight: 600,
                        '&.Mui-focused': { color: '#1e293b' },
                      }}
                    >
                      <LocalGasStation sx={{ color: '#6366f1' }} /> מים (עפ"י הוראות הכלי)
                    </FormLabel>
                    <RadioGroup
                      row
                      value={formData.waterCheck}
                      onChange={handleChange('waterCheck')}
                    >
                      <FormControlLabel value="ok" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="תקין" />
                      <FormControlLabel value="low" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="נמוך" />
                      <FormControlLabel value="not_ok" control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />} label="לא תקין" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ borderColor: '#e2e8f0' }} />
              </Grid>

              {vehicle?.type === 'scooter' && (
                <>
                  <Grid item xs={12}>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel
                        component="legend"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                          color: '#1e293b',
                          fontWeight: 600,
                          '&.Mui-focused': { color: '#1e293b' },
                        }}
                      >
                        <Build sx={{ color: '#6366f1' }} /> חיזוק ברגי ארגז
                      </FormLabel>
                      <RadioGroup
                        row
                        value={formData.boxScrewsTightening}
                        onChange={handleChange('boxScrewsTightening')}
                      >
                        <FormControlLabel value="done" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="בוצע" />
                        <FormControlLabel value="not_done" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="לא בוצע" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel
                        component="legend"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                          color: '#1e293b',
                          fontWeight: 600,
                          '&.Mui-focused': { color: '#1e293b' },
                        }}
                      >
                        <Build sx={{ color: '#6366f1' }} /> שימון מסילות ארגז
                      </FormLabel>
                      <RadioGroup
                        row
                        value={formData.boxRailLubrication}
                        onChange={handleChange('boxRailLubrication')}
                      >
                        <FormControlLabel value="done" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="בוצע" />
                        <FormControlLabel value="not_done" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="לא בוצע" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                </>
              )}

              {vehicle?.type === 'motorcycle' && (
                <Grid item xs={12}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel
                      component="legend"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                        color: '#1e293b',
                        fontWeight: 600,
                        '&.Mui-focused': { color: '#1e293b' },
                      }}
                    >
                      <Build sx={{ color: '#6366f1' }} /> שימון שרשרת
                    </FormLabel>
                    <RadioGroup
                      row
                      value={formData.chainLubrication}
                      onChange={handleChange('chainLubrication')}
                    >
                      <FormControlLabel value="done" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="בוצע" />
                      <FormControlLabel value="not_done" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="לא בוצע" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ borderColor: '#e2e8f0' }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="לחץ צמיג קדמי (PSI)"
                  required
                  type="number"
                  inputProps={{ step: '0.5', min: '0' }}
                  value={formData.tirePressureFront}
                  onChange={handleChange('tirePressureFront')}
                  helperText="לחץ מומלץ: 28-32 PSI"
                  sx={textFieldSx}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="לחץ צמיג אחורי (PSI)"
                  required
                  type="number"
                  inputProps={{ step: '0.5', min: '0' }}
                  value={formData.tirePressureRear}
                  onChange={handleChange('tirePressureRear')}
                  helperText="לחץ מומלץ: 32-36 PSI"
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: '12px',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                '& .MuiAlert-icon': { color: '#6366f1' },
                '& .MuiAlert-message': { color: '#6366f1' },
              }}
            >
              בדיקות נוספות - סמן את מצב כל רכיב
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel sx={{ color: '#1e293b', fontWeight: 600, '&.Mui-focused': { color: '#1e293b' } }}>בלמים</FormLabel>
                  <RadioGroup
                    value={formData.brakesCondition}
                    onChange={handleChange('brakesCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="תקין" />
                    <FormControlLabel value="fair" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="בינוני" />
                    <FormControlLabel value="poor" control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel sx={{ color: '#1e293b', fontWeight: 600, '&.Mui-focused': { color: '#1e293b' } }}>פנסים</FormLabel>
                  <RadioGroup
                    value={formData.lightsCondition}
                    onChange={handleChange('lightsCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="תקין" />
                    <FormControlLabel value="fair" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="בינוני" />
                    <FormControlLabel value="poor" control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel sx={{ color: '#1e293b', fontWeight: 600, '&.Mui-focused': { color: '#1e293b' } }}>מראות</FormLabel>
                  <RadioGroup
                    value={formData.mirrorsCondition}
                    onChange={handleChange('mirrorsCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="תקין" />
                    <FormControlLabel value="fair" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="בינוני" />
                    <FormControlLabel value="poor" control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel sx={{ color: '#1e293b', fontWeight: 600, '&.Mui-focused': { color: '#1e293b' } }}>קסדה</FormLabel>
                  <RadioGroup
                    value={formData.helmetCondition}
                    onChange={handleChange('helmetCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio sx={{ '&.Mui-checked': { color: '#059669' } }} />} label="תקינה" />
                    <FormControlLabel value="fair" control={<Radio sx={{ '&.Mui-checked': { color: '#d97706' } }} />} label="בינונית" />
                    <FormControlLabel value="poor" control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />} label="לא תקינה" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="בעיות שנמצאו"
                  multiline
                  rows={3}
                  value={formData.issues}
                  onChange={handleChange('issues')}
                  placeholder="פרט כל בעיה, ליקוי או תקלה שנמצאה במהלך הבדיקה"
                  sx={textFieldSx}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="הערות נוספות"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  placeholder="הערות או מידע נוסף"
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>
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
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>בדיקות חובה</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>שמן:</Typography>
                        {getStatusChip(formData.oilCheck)}
                      </Box>
                      {vehicle?.type === 'scooter' && formData.waterCheck && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>מים:</Typography>
                          {getStatusChip(formData.waterCheck)}
                        </Box>
                      )}
                      {vehicle?.type === 'scooter' && formData.boxScrewsTightening && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>ברגי ארגז:</Typography>
                          {getStatusChip(formData.boxScrewsTightening)}
                        </Box>
                      )}
                      {vehicle?.type === 'scooter' && formData.boxRailLubrication && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>מסילות ארגז:</Typography>
                          {getStatusChip(formData.boxRailLubrication)}
                        </Box>
                      )}
                      {vehicle?.type === 'motorcycle' && formData.chainLubrication && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>שרשרת:</Typography>
                          {getStatusChip(formData.chainLubrication)}
                        </Box>
                      )}
                      <Chip
                        label={`צמיג קדמי: ${formData.tirePressureFront} PSI`}
                        size="small"
                        sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 500 }}
                      />
                      <Chip
                        label={`צמיג אחורי: ${formData.tirePressureRear} PSI`}
                        size="small"
                        sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 500 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>בדיקות נוספות</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>בלמים:</Typography>
                        {getStatusChip(formData.brakesCondition, 'condition')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>פנסים:</Typography>
                        {getStatusChip(formData.lightsCondition, 'condition')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>מראות:</Typography>
                        {getStatusChip(formData.mirrorsCondition, 'condition')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>קסדה:</Typography>
                        {getStatusChip(formData.helmetCondition, 'condition')}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {(formData.issues || formData.notes) && (
                <Grid item xs={12}>
                  <Card
                    sx={{
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>הערות</Typography>
                      {formData.issues && (
                        <>
                          <Typography variant="subtitle2" sx={{ color: '#dc2626', fontWeight: 600 }}>בעיות:</Typography>
                          <Typography variant="body2" sx={{ mb: 1, color: '#64748b' }}>{formData.issues}</Typography>
                        </>
                      )}
                      {formData.notes && (
                        <>
                          <Typography variant="subtitle2" sx={{ color: '#1e293b', fontWeight: 600 }}>הערות:</Typography>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>{formData.notes}</Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
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
          <Build sx={{ fontSize: 28, color: '#ffffff' }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
            בקרה חודשית
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            מלא את הבקרה החודשית של הכלי שלך
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
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  },
                  '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
                }}
              >
                {submitting ? 'שולח...' : 'שלח בקרה'}
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
