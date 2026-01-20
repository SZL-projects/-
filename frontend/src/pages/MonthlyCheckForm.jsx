import { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { monthlyChecksAPI, vehiclesAPI, ridersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const steps = ['פרטי כלי', 'בדיקות חובה', 'בדיקות נוספות', 'סיכום'];

export default function MonthlyCheckForm() {
  const navigate = useNavigate();
  const { id: checkId } = useParams(); // ID של הבקרה מה-URL
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [existingCheck, setExistingCheck] = useState(null); // בקרה קיימת
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // פרטי כלי
    vehicleId: '',
    vehicleLicensePlate: '',
    riderId: '', // נוסיף את riderId כאן
    currentKm: '',

    // בדיקות חובה (לכל כלי)
    oilCheck: '', // תקין/נמוך/לא תקין
    waterCheck: '', // רלוונטי רק לקטנועים
    tirePressureFront: '',
    tirePressureRear: '',

    // בדיקות נוספות - קטנועים
    boxScrewsTightening: '', // בוצע/לא בוצע (קטנועים)
    boxRailLubrication: '', // בוצע/לא בוצע (קטנועים)

    // בדיקות נוספות - אופנועים
    chainLubrication: '', // בוצע/לא בוצע (אופנועים)

    // בדיקות נוספות - כלליות
    brakesCondition: 'good', // good/fair/poor
    lightsCondition: 'good',
    mirrorsCondition: 'good',
    helmetCondition: 'good',

    // הערות ובעיות
    issues: '',
    notes: '',
  });

  useEffect(() => {
    loadVehicleData();
  }, [user, checkId]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);

      // אם יש ID של בקרה - טען את הבקרה הקיימת
      if (checkId) {
        try {
          const checkResponse = await monthlyChecksAPI.getById(checkId);
          const checkData = checkResponse.data.monthlyCheck || checkResponse.data;
          setExistingCheck(checkData);

          // טען את הכלי מהבקרה
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
          // אם נכשל לטעון את הבקרה - המשך לטעינה רגילה
        }
      }

      let vehicleId = null;
      let riderData = null;
      let riderId = user?.riderId;

      // נסיון 1: אם למשתמש יש riderId - טען לפי ID
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

      // נסיון 2: אם אין riderId, חפש לפי username או שם
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

      // נסיון 3: אם לא נמצא כלי משויך, בדוק אם יש הרשאות גישה לכלים
      if (!vehicleId && user?.vehicleAccess && user.vehicleAccess.length > 0) {
        vehicleId = user.vehicleAccess[0];
      }

      if (!vehicleId) {
        setError('לא נמצא כלי משויך. אנא פנה למנהל.');
        setLoading(false);
        return;
      }

      // טעינת פרטי הכלי
      const vehicleResponse = await vehiclesAPI.getById(vehicleId);
      const vehicleData = vehicleResponse.data.vehicle;
      setVehicle(vehicleData);

      // שמירת riderId ב-state נפרד לשימוש בהמשך
      setFormData(prev => ({
        ...prev,
        vehicleId: vehicleData._id || vehicleData.id,
        vehicleLicensePlate: vehicleData.licensePlate,
        riderId: riderId, // שמירת ה-riderId שמצאנו
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
      case 0: // פרטי כלי
        if (!formData.currentKm || isNaN(formData.currentKm)) {
          setError('נא להזין קילומטראז\' נוכחי תקין');
          return false;
        }
        if (vehicle && vehicle.currentKilometers && parseInt(formData.currentKm) < vehicle.currentKilometers) {
          setError('קילומטראז\' נוכחי לא יכול להיות נמוך מהקילומטראז\' הקודם');
          return false;
        }
        break;

      case 1: // בדיקות חובה
        if (!formData.oilCheck) {
          setError('נא לבדוק את רמת השמן');
          return false;
        }
        // בדיקת מים רלוונטית רק לקטנועים
        if (vehicle?.type === 'scooter' && !formData.waterCheck) {
          setError('נא לבדוק את רמת המים');
          return false;
        }
        // בדיקות ספציפיות לקטנועים
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
        // בדיקות ספציפיות לאופנועים
        if (vehicle?.type === 'motorcycle' && !formData.chainLubrication) {
          setError('נא לסמן האם בוצע שימון שרשרת');
          return false;
        }
        if (!formData.tirePressureFront || !formData.tirePressureRear) {
          setError('נא למלא את לחץ הצמיגים (קדמי ואחורי)');
          return false;
        }
        break;

      case 2: // בדיקות נוספות
        // כל הבדיקות הנוספות הן אופציונליות או עם ערך ברירת מחדל
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
          // בדיקות ספציפיות לסוג כלי
          boxScrewsTightening: formData.boxScrewsTightening,
          boxRailLubrication: formData.boxRailLubrication,
          chainLubrication: formData.chainLubrication,
          // בדיקות כלליות
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

      // אם יש בקרה קיימת - עדכן אותה, אחרת צור חדשה
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

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'good': return 'success';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getConditionLabel = (condition) => {
    switch (condition) {
      case 'good': return 'תקין';
      case 'fair': return 'בינוני';
      case 'poor': return 'לא תקין';
      default: return condition;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" color="success.main" gutterBottom>
            בקרה חודשית נשלחה בהצלחה!
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            תודה על מילוי הבקרה החודשית של כלי {formData.vehicleLicensePlate}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            הנתונים נשמרו במערכת ומועבר חזרה לדף הכלי שלי...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error && !vehicle) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/my-vehicle')}>
          חזרה
        </Button>
      </Box>
    );
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // פרטי כלי
        return (
          <Box>
            <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TwoWheeler sx={{ fontSize: 48 }} />
                  <Box>
                    <Typography variant="h6">
                      {vehicle?.manufacturer} {vehicle?.model}
                    </Typography>
                    <Typography variant="body1">
                      {formData.vehicleLicensePlate}
                    </Typography>
                    <Typography variant="body2">
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
                    startAdornment: <Speed sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  helperText={
                    vehicle?.currentKilometers
                      ? `קילומטראז' אחרון: ${vehicle.currentKilometers.toLocaleString()} ק"מ`
                      : 'הזן את הקילומטראז\' הנוכחי מהמונה'
                  }
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // בדיקות חובה
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              בדיקות חובה - יש למלא את כל השדות
            </Alert>

            <Grid container spacing={3}>
              {/* בדיקת שמן */}
              <Grid item xs={12}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Opacity /> רמת שמן
                  </FormLabel>
                  <RadioGroup
                    row
                    value={formData.oilCheck}
                    onChange={handleChange('oilCheck')}
                  >
                    <FormControlLabel value="ok" control={<Radio />} label="תקין" />
                    <FormControlLabel value="low" control={<Radio />} label="נמוך" />
                    <FormControlLabel value="not_ok" control={<Radio />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* בדיקת מים - רק לקטנועים */}
              {vehicle?.type === 'scooter' && (
                <Grid item xs={12}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocalGasStation /> מים (עפ"י הוראות הכלי)
                    </FormLabel>
                    <RadioGroup
                      row
                      value={formData.waterCheck}
                      onChange={handleChange('waterCheck')}
                    >
                      <FormControlLabel value="ok" control={<Radio />} label="תקין" />
                      <FormControlLabel value="low" control={<Radio />} label="נמוך" />
                      <FormControlLabel value="not_ok" control={<Radio />} label="לא תקין" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* בדיקות ספציפיות לקטנועים */}
              {vehicle?.type === 'scooter' && (
                <>
                  <Grid item xs={12}>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Build /> חיזוק ברגי ארגז
                      </FormLabel>
                      <RadioGroup
                        row
                        value={formData.boxScrewsTightening}
                        onChange={handleChange('boxScrewsTightening')}
                      >
                        <FormControlLabel value="done" control={<Radio />} label="בוצע" />
                        <FormControlLabel value="not_done" control={<Radio />} label="לא בוצע" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Build /> שימון מסילות ארגז
                      </FormLabel>
                      <RadioGroup
                        row
                        value={formData.boxRailLubrication}
                        onChange={handleChange('boxRailLubrication')}
                      >
                        <FormControlLabel value="done" control={<Radio />} label="בוצע" />
                        <FormControlLabel value="not_done" control={<Radio />} label="לא בוצע" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                </>
              )}

              {/* בדיקות ספציפיות לאופנועים */}
              {vehicle?.type === 'motorcycle' && (
                <Grid item xs={12}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Build /> שימון שרשרת
                    </FormLabel>
                    <RadioGroup
                      row
                      value={formData.chainLubrication}
                      onChange={handleChange('chainLubrication')}
                    >
                      <FormControlLabel value="done" control={<Radio />} label="בוצע" />
                      <FormControlLabel value="not_done" control={<Radio />} label="לא בוצע" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* לחץ צמיגים */}
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
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // בדיקות נוספות
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              בדיקות נוספות - סמן את מצב כל רכיב
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend">בלמים</FormLabel>
                  <RadioGroup
                    value={formData.brakesCondition}
                    onChange={handleChange('brakesCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio />} label="תקין" />
                    <FormControlLabel value="fair" control={<Radio />} label="בינוני" />
                    <FormControlLabel value="poor" control={<Radio />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend">פנסים</FormLabel>
                  <RadioGroup
                    value={formData.lightsCondition}
                    onChange={handleChange('lightsCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio />} label="תקין" />
                    <FormControlLabel value="fair" control={<Radio />} label="בינוני" />
                    <FormControlLabel value="poor" control={<Radio />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend">מראות</FormLabel>
                  <RadioGroup
                    value={formData.mirrorsCondition}
                    onChange={handleChange('mirrorsCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio />} label="תקין" />
                    <FormControlLabel value="fair" control={<Radio />} label="בינוני" />
                    <FormControlLabel value="poor" control={<Radio />} label="לא תקין" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend">קסדה</FormLabel>
                  <RadioGroup
                    value={formData.helmetCondition}
                    onChange={handleChange('helmetCondition')}
                  >
                    <FormControlLabel value="good" control={<Radio />} label="תקינה" />
                    <FormControlLabel value="fair" control={<Radio />} label="בינונית" />
                    <FormControlLabel value="poor" control={<Radio />} label="לא תקינה" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
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
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3: // סיכום
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              בדוק את הפרטים לפני השליחה
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>פרטי כלי</Typography>
                    <Typography>מספר רישוי: <strong>{formData.vehicleLicensePlate}</strong></Typography>
                    <Typography>קילומטראז': <strong>{parseInt(formData.currentKm).toLocaleString()} ק"מ</strong></Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>בדיקות חובה</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      <Chip
                        label={`שמן: ${formData.oilCheck === 'ok' ? 'תקין' : formData.oilCheck === 'low' ? 'נמוך' : 'לא תקין'}`}
                        color={formData.oilCheck === 'ok' ? 'success' : formData.oilCheck === 'low' ? 'warning' : 'error'}
                      />
                      {vehicle?.type === 'scooter' && formData.waterCheck && (
                        <Chip
                          label={`מים: ${formData.waterCheck === 'ok' ? 'תקין' : formData.waterCheck === 'low' ? 'נמוך' : 'לא תקין'}`}
                          color={formData.waterCheck === 'ok' ? 'success' : formData.waterCheck === 'low' ? 'warning' : 'error'}
                        />
                      )}
                      {vehicle?.type === 'scooter' && formData.boxScrewsTightening && (
                        <Chip
                          label={`ברגי ארגז: ${formData.boxScrewsTightening === 'done' ? 'בוצע' : 'לא בוצע'}`}
                          color={formData.boxScrewsTightening === 'done' ? 'success' : 'warning'}
                        />
                      )}
                      {vehicle?.type === 'scooter' && formData.boxRailLubrication && (
                        <Chip
                          label={`מסילות ארגז: ${formData.boxRailLubrication === 'done' ? 'בוצע' : 'לא בוצע'}`}
                          color={formData.boxRailLubrication === 'done' ? 'success' : 'warning'}
                        />
                      )}
                      {vehicle?.type === 'motorcycle' && formData.chainLubrication && (
                        <Chip
                          label={`שרשרת: ${formData.chainLubrication === 'done' ? 'בוצע' : 'לא בוצע'}`}
                          color={formData.chainLubrication === 'done' ? 'success' : 'warning'}
                        />
                      )}
                      <Chip label={`צמיג קדמי: ${formData.tirePressureFront} PSI`} />
                      <Chip label={`צמיג אחורי: ${formData.tirePressureRear} PSI`} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>בדיקות נוספות</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      <Chip label={`בלמים: ${getConditionLabel(formData.brakesCondition)}`} color={getConditionColor(formData.brakesCondition)} />
                      <Chip label={`פנסים: ${getConditionLabel(formData.lightsCondition)}`} color={getConditionColor(formData.lightsCondition)} />
                      <Chip label={`מראות: ${getConditionLabel(formData.mirrorsCondition)}`} color={getConditionColor(formData.mirrorsCondition)} />
                      <Chip label={`קסדה: ${getConditionLabel(formData.helmetCondition)}`} color={getConditionColor(formData.helmetCondition)} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {(formData.issues || formData.notes) && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>הערות</Typography>
                      {formData.issues && (
                        <>
                          <Typography variant="subtitle2" color="error">בעיות:</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>{formData.issues}</Typography>
                        </>
                      )}
                      {formData.notes && (
                        <>
                          <Typography variant="subtitle2">הערות:</Typography>
                          <Typography variant="body2">{formData.notes}</Typography>
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
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Build /> בקרה חודשית
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        מלא את הבקרה החודשית של הכלי שלך
      </Typography>

      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
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
            variant="outlined"
          >
            חזור
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/my-vehicle')}
            >
              ביטול
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {submitting ? 'שולח...' : 'שלח בקרה'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
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
