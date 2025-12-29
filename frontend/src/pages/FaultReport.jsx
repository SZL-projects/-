import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { faultsAPI } from '../services/api';

const severityLevels = [
  { value: 'low', label: 'נמוכה - ניתן להמשיך לנסוע' },
  { value: 'medium', label: 'בינונית - דורש תשומת לב' },
  { value: 'high', label: 'גבוהה - יש להפסיק נסיעה' },
  { value: 'critical', label: 'קריטית - סכנת חיים' },
];

const steps = ['פרטי התקלה', 'תיאור מפורט', 'סיכום'];

export default function FaultReport() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    location: '',
    vehicleLicensePlate: '',
    phoneContact: '',
  });

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const handleNext = () => {
    // וולידציה לפי שלב
    if (activeStep === 0) {
      if (!formData.title || !formData.severity) {
        setError('נא למלא את כל השדות החובה');
        return;
      }
    } else if (activeStep === 1) {
      if (!formData.description || formData.description.length < 10) {
        setError('נא לספק תיאור מפורט (לפחות 10 תווים)');
        return;
      }
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      await faultsAPI.create(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error submitting fault report:', err);
      setError('שגיאה בשליחת הדיווח. נסה שוב.');
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              מה הבעיה?
            </Typography>
            <TextField
              fullWidth
              label="כותרת התקלה"
              required
              value={formData.title}
              onChange={handleChange('title')}
              margin="normal"
              helperText="לדוגמה: בלמים לא עובדים, תקלה בפנס, וכו'"
            />
            <TextField
              fullWidth
              select
              label="רמת חומרה"
              required
              value={formData.severity}
              onChange={handleChange('severity')}
              margin="normal"
            >
              {severityLevels.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="מיקום נוכחי (אופציונלי)"
              value={formData.location}
              onChange={handleChange('location')}
              margin="normal"
              helperText="איפה אתה נמצא כרגע?"
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              פרטים נוספים
            </Typography>
            <TextField
              fullWidth
              label="תיאור מפורט"
              required
              multiline
              rows={6}
              value={formData.description}
              onChange={handleChange('description')}
              margin="normal"
              helperText="תאר את התקלה במילים שלך - מה קרה, מתי התחיל, מה ניסית"
            />
            <TextField
              fullWidth
              label="מספר רכב (אופציונלי)"
              value={formData.vehicleLicensePlate}
              onChange={handleChange('vehicleLicensePlate')}
              margin="normal"
            />
            <TextField
              fullWidth
              label="טלפון ליצירת קשר (אופציונלי)"
              value={formData.phoneContact}
              onChange={handleChange('phoneContact')}
              margin="normal"
              helperText="אם שונה מהטלפון הרשום במערכת"
            />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              סיכום הדיווח
            </Typography>
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>כותרת:</strong> {formData.title}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>חומרה:</strong>{' '}
                {severityLevels.find((s) => s.value === formData.severity)?.label}
              </Typography>
              {formData.location && (
                <Typography variant="subtitle1" gutterBottom>
                  <strong>מיקום:</strong> {formData.location}
                </Typography>
              )}
              <Typography variant="subtitle1" gutterBottom>
                <strong>תיאור:</strong> {formData.description}
              </Typography>
              {formData.vehicleLicensePlate && (
                <Typography variant="subtitle1" gutterBottom>
                  <strong>מספר רכב:</strong> {formData.vehicleLicensePlate}
                </Typography>
              )}
            </Paper>
            <Alert severity="info">
              לחץ על "שלח דיווח" כדי לשלוח את הדיווח למערכת. צוות האחזקה יטפל בתקלה בהקדם.
            </Alert>
          </Box>
        );
      default:
        return null;
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="success.main" gutterBottom>
            ✓ הדיווח נשלח בהצלחה!
          </Typography>
          <Typography variant="body1">
            תודה על הדיווח. צוות האחזקה יטפל בתקלה בהקדם האפשרי.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            מועבר חזרה למסך הראשי...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }} dir="rtl">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          דיווח תקלה
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          מלא את הפרטים הבאים כדי לדווח על תקלה ברכב או בציוד
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            חזור
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              שלח דיווח
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              הבא
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
