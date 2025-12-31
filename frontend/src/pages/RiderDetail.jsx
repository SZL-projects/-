import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Person,
  Phone,
  Email,
  Badge,
  DirectionsCar,
  PersonAdd,
} from '@mui/icons-material';
import { ridersAPI, authAPI } from '../services/api';

export default function RiderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadRider();
  }, [id]);

  const loadRider = async () => {
    try {
      setLoading(true);
      const response = await ridersAPI.getById(id);
      setRider(response.data.rider);
      setEmail(response.data.rider.email || '');
      setError('');
    } catch (err) {
      console.error('Error loading rider:', err);
      setError('שגיאה בטעינת פרטי הרוכב');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateUser = async () => {
    if (!username || !email) {
      showSnackbar('נא למלא שם משתמש ומייל', 'warning');
      return;
    }

    try {
      setCreatingUser(true);

      // יצירת משתמש עם סיסמה זמנית
      const temporaryPassword = Math.random().toString(36).slice(-8);

      await authAPI.createUser({
        username,
        email,
        password: temporaryPassword,
        firstName: rider.firstName,
        lastName: rider.lastName,
        role: 'rider', // תפקיד מיוחד לרוכבים
        riderId: id,
        isActive: true,
      });

      // שליחת פרטי התחברות למייל
      showSnackbar('משתמש נוצר בהצלחה! פרטי ההתחברות נשלחו למייל', 'success');
      setCreateUserDialogOpen(false);
      setUsername('');
      loadRider();
    } catch (err) {
      console.error('Error creating user:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה ביצירת המשתמש', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/riders')} sx={{ mt: 2 }}>
          חזרה לרשימת רוכבים
        </Button>
      </Box>
    );
  }

  if (!rider) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          בקרוב
        </Typography>
        <Typography color="textSecondary" gutterBottom>
          עמוד זה בבנייה
        </Typography>
        <Button onClick={() => navigate('/riders')} sx={{ mt: 2 }}>
          חזרה לרשימת רוכבים
        </Button>
      </Box>
    );
  }

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success' },
      inactive: { label: 'לא פעיל', color: 'default' },
      suspended: { label: 'מושעה', color: 'warning' },
    };
    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/riders')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            כרטיס רוכב
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setCreateUserDialogOpen(true)}
          >
            יצירת משתמש
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/riders?edit=${id}`)}
          >
            עריכה
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* פרטים אישיים */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> פרטים אישיים
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    שם פרטי
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.firstName}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    שם משפחה
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.lastName}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    תעודת זהות
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.idNumber || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    סטטוס
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(rider.status)}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* פרטי קשר */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone /> פרטי קשר
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    טלפון
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.phone || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    אימייל
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.email || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    כתובת
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.address || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* רישיון ואישורים */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge /> רישיון ואישורים
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    מספר רישיון
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.licenseNumber || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    תוקף רישיון
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {rider.licenseExpiry ? new Date(rider.licenseExpiry).toLocaleDateString('he-IL') : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* שיוך לכלי */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DirectionsCar /> שיוך לכלי
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    סטטוס שיוך
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={rider.isAssigned ? 'משויך' : 'לא משויך'}
                      color={rider.isAssigned ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>

                {rider.assignedVehicle && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      כלי משויך
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {rider.assignedVehicle}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle>יצירת משתמש לרוכב</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="שם משתמש"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="אימייל"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
            <Alert severity="info">
              סיסמה זמנית תיווצר ותישלח למייל הרוכב
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserDialogOpen(false)}>ביטול</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={creatingUser || !username || !email}
          >
            {creatingUser ? 'יוצר...' : 'צור משתמש'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
