import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Warning,
  CheckCircle,
  TwoWheeler,
  Build,
  Cancel,
  DirectionsCar,
} from '@mui/icons-material';
import { faultsAPI, vehiclesAPI, ridersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const severityLevels = [
  { value: 'low', label: 'נמוכה', description: 'בעיה קטנה, אין דחיפות', color: 'info' },
  { value: 'medium', label: 'בינונית', description: 'דורש טיפול בימים הקרובים', color: 'warning' },
  { value: 'high', label: 'גבוהה', description: 'דורש טיפול דחוף', color: 'error' },
  { value: 'critical', label: 'קריטית', description: 'מסכן חיים או מונע נסיעה', color: 'error' },
];

const faultCategories = [
  { value: 'engine', label: 'מנוע' },
  { value: 'brakes', label: 'בלמים' },
  { value: 'electrical', label: 'חשמל ותאורה' },
  { value: 'tires', label: 'צמיגים' },
  { value: 'bodywork', label: 'מרכב ופחחות' },
  { value: 'other', label: 'אחר' },
];

const steps = ['פרטי כלי', 'סוג התקלה', 'תיאור מפורט', 'סיכום'];

export default function FaultReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // פרטי כלי
    vehicleId: '',
    vehicleLicensePlate: '',
    riderId: '',
    currentKm: '',

    // פרטי תקלה
    category: '',
    title: '',
    description: '',
    severity: 'medium',
    canRide: '', // yes/no/unsure - שדה קריטי!

    // מיקום ופרטים נוספים
    location: '',
    reportedDate: new Date().toISOString(),
  });

  useEffect(() => {
    loadVehicleData();
  }, [user]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);

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

      // מילוי אוטומטי של פרטי הכלי
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
      case 0: // פרטי כלי
        if (!formData.currentKm || isNaN(formData.currentKm)) {
          setError('נא להזין קילומטראז\' נוכחי תקין');
          return false;
        }
        break;

      case 1: // סוג התקלה
        if (!formData.category) {
          setError('נא לבחור קטגוריית תקלה');
          return false;
        }
        if (!formData.title || formData.title.length < 5) {
          setError('נא להזין כותרת תקלה (לפחות 5 תווים)');
          return false;
        }
        if (!formData.canRide) {
          setError('נא לציין האם ניתן לרכב על הכלי');
          return false;
        }
        break;

      case 2: // תיאור מפורט
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

      const faultData = {
        vehicleId: formData.vehicleId,
        vehicleLicensePlate: formData.vehicleLicensePlate,
        vehicleNumber: formData.vehicleLicensePlate, // for compatibility
        riderId: formData.riderId,

        category: formData.category,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        canRide: formData.canRide === 'yes',

        currentKm: parseInt(formData.currentKm),
        location: formData.location || '',
        reportedDate: formData.reportedDate,

        status: 'open',
        reportedBy: user._id || user.id,
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

  const getSeverityInfo = (severity) => {
    return severityLevels.find(s => s.value === severity);
  };

  const getCategoryLabel = (category) => {
    return faultCategories.find(c => c.value === category)?.label || category;
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
            דיווח התקלה נשלח בהצלחה!
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            תודה על הדיווח על התקלה בכלי {formData.vehicleLicensePlate}
          </Typography>
          <Alert severity={formData.canRide === 'no' ? 'error' : 'info'} sx={{ mt: 2 }}>
            {formData.canRide === 'no' ? (
              <Typography variant="body2">
                <strong>שים לב:</strong> דיווחת שלא ניתן לרכב על הכלי. אנא המתן להוראות מהמנהל.
              </Typography>
            ) : (
              <Typography variant="body2">
                צוות האחזקה יטפל בתקלה בהקדם האפשרי.
              </Typography>
            )}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            מועבר לדף התקלות שלי...
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
                  helperText={
                    vehicle?.currentKilometers
                      ? `קילומטראז' אחרון במערכת: ${vehicle.currentKilometers.toLocaleString()} ק"מ`
                      : 'הזן את הקילומטראז\' הנוכחי'
                  }
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
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // סוג התקלה
        return (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="500">
                חשוב מאוד לציין האם ניתן לרכב על הכלי
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold', color: 'error.main' }}>
                    האם ניתן לרכב על הכלי? *
                  </FormLabel>
                  <RadioGroup
                    value={formData.canRide}
                    onChange={handleChange('canRide')}
                  >
                    <FormControlLabel
                      value="yes"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle color="success" />
                          <Typography>כן - ניתן לרכב בבטחה</Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="no"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Cancel color="error" />
                          <Typography>לא - מסוכן לרכב או הכלי לא נוסע</Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="unsure"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Warning color="warning" />
                          <Typography>לא בטוח - צריך הערכה</Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="קטגוריית תקלה"
                  required
                  value={formData.category}
                  onChange={handleChange('category')}
                  helperText="בחר את הקטגוריה המתאימה ביותר"
                >
                  {faultCategories.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="כותרת התקלה"
                  required
                  value={formData.title}
                  onChange={handleChange('title')}
                  placeholder="תאר בקצרה את התקלה"
                  helperText="לדוגמה: בלם אחורי לא עובד, פנס קדמי שבור"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="רמת חומרה"
                  required
                  value={formData.severity}
                  onChange={handleChange('severity')}
                >
                  {severityLevels.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body1" fontWeight="500">
                          {option.label}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // תיאור מפורט
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              ספק תיאור מפורט ככל האפשר - זה יעזור לצוות התחזוקה להבין את הבעיה
            </Alert>

            <TextField
              fullWidth
              label="תיאור מפורט של התקלה"
              required
              multiline
              rows={8}
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="תאר בפירוט:&#10;• מה בדיוק קרה?&#10;• מתי זה התחיל?&#10;• האם זה קרה פתאום או בהדרגה?&#10;• מה ניסית לעשות?&#10;• האם יש צלילים מוזרים או ריחות?"
              helperText={`${formData.description.length} תווים (מינימום 10)`}
            />
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
                    {formData.location && (
                      <Typography>מיקום: <strong>{formData.location}</strong></Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined" sx={{
                  bgcolor: formData.canRide === 'no' ? 'error.light' :
                           formData.canRide === 'unsure' ? 'warning.light' : 'background.paper'
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>פרטי תקלה</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip
                        icon={formData.canRide === 'no' ? <Cancel /> : formData.canRide === 'unsure' ? <Warning /> : <CheckCircle />}
                        label={
                          formData.canRide === 'yes' ? 'ניתן לרכב' :
                          formData.canRide === 'no' ? 'לא ניתן לרכב' :
                          'לא בטוח'
                        }
                        color={
                          formData.canRide === 'yes' ? 'success' :
                          formData.canRide === 'no' ? 'error' :
                          'warning'
                        }
                      />
                      <Chip
                        label={getCategoryLabel(formData.category)}
                        color="primary"
                      />
                      <Chip
                        label={getSeverityInfo(formData.severity)?.label || formData.severity}
                        color={getSeverityInfo(formData.severity)?.color || 'default'}
                      />
                    </Box>
                    <Typography variant="subtitle1" fontWeight="500" gutterBottom>
                      {formData.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {formData.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {formData.canRide === 'no' && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography variant="body2" fontWeight="500">
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
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning /> דיווח תקלה
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        דווח על תקלה בכלי שלך ואנו נטפל בה בהקדם
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
                color={formData.canRide === 'no' ? 'error' : 'primary'}
              >
                {submitting ? 'שולח...' : 'שלח דיווח'}
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
