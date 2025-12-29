import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { monthlyChecksAPI } from '../services/api';

const checkItems = [
  { id: 'brakes', label: 'בלמים תקינים' },
  { id: 'lights', label: 'פנסים ופנסי איתות' },
  { id: 'tires', label: 'צמיגים ולחץ אוויר' },
  { id: 'mirrors', label: 'מראות' },
  { id: 'horn', label: 'צופר' },
  { id: 'helmet', label: 'קסדה תקינה' },
  { id: 'reflectiveVest', label: 'אפוד זוהר' },
  { id: 'firstAidKit', label: 'ערכת עזרה ראשונה' },
  { id: 'fireExtinguisher', label: 'מטף' },
  { id: 'documents', label: 'מסמכים (רישיון, ביטוח, רישוי)' },
];

export default function MonthlyCheckForm() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    vehicleLicensePlate: '',
    currentKm: '',
    nextCheckKm: '',
    checks: {},
    issues: '',
    notes: '',
  });

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const handleCheckChange = (checkId) => (event) => {
    setFormData({
      ...formData,
      checks: {
        ...formData.checks,
        [checkId]: event.target.checked,
      },
    });
  };

  const validate = () => {
    if (!formData.vehicleLicensePlate) {
      setError('נא להזין מספר רכב');
      return false;
    }
    if (!formData.currentKm || isNaN(formData.currentKm)) {
      setError('נא להזין קילומטראז נוכחי תקין');
      return false;
    }

    // בדיקה שכל הפריטים סומנו
    const uncheckedItems = checkItems.filter((item) => !formData.checks[item.id]);
    if (uncheckedItems.length > 0) {
      setError(`לא סומנו כל הפריטים. חסרים: ${uncheckedItems.map((i) => i.label).join(', ')}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const checkData = {
        vehicleLicensePlate: formData.vehicleLicensePlate,
        currentKm: parseInt(formData.currentKm),
        nextCheckKm: formData.nextCheckKm ? parseInt(formData.nextCheckKm) : null,
        checkResults: formData.checks,
        issues: formData.issues || '',
        notes: formData.notes || '',
        checkDate: new Date().toISOString(),
      };

      await monthlyChecksAPI.create(checkData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error submitting monthly check:', err);
      setError('שגיאה בשליחת הבקרה. נסה שוב.');
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="success.main" gutterBottom>
            ✓ בקרה חודשית נשלחה בהצלחה!
          </Typography>
          <Typography variant="body1">
            תודה על מילוי הבקרה החודשית. הנתונים נשמרו במערכת.
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
          בקרה חודשית
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          מלא את הבקרה החודשית של הרכב והציוד
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            פרטי הרכב
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="מספר רכב"
                required
                value={formData.vehicleLicensePlate}
                onChange={handleChange('vehicleLicensePlate')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="קילומטראז' נוכחי"
                required
                type="number"
                value={formData.currentKm}
                onChange={handleChange('currentKm')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="בקרה הבאה ב-ק\"מ"
                type="number"
                value={formData.nextCheckKm}
                onChange={handleChange('nextCheckKm')}
                helperText="אופציונלי"
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            פריטי בדיקה
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            סמן את כל הפריטים התקינים:
          </Typography>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {checkItems.map((item) => (
              <Grid item xs={12} sm={6} key={item.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.checks[item.id] || false}
                      onChange={handleCheckChange(item.id)}
                    />
                  }
                  label={item.label}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            תיעוד נוסף
          </Typography>
          <TextField
            fullWidth
            label="בעיות שנמצאו"
            multiline
            rows={3}
            value={formData.issues}
            onChange={handleChange('issues')}
            margin="normal"
            helperText="פרט כל בעיה או ליקוי שנמצא"
          />
          <TextField
            fullWidth
            label="הערות"
            multiline
            rows={2}
            value={formData.notes}
            onChange={handleChange('notes')}
            margin="normal"
            helperText="הערות נוספות או מידע רלוונטי"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button variant="outlined" onClick={() => navigate('/dashboard')}>
            ביטול
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            שלח בקרה
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
