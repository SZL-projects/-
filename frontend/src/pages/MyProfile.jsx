import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  Badge,
  DirectionsCar,
  Edit,
  CalendarMonth,
  LocationOn,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ridersAPI, vehiclesAPI } from '../services/api';

export default function MyProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rider, setRider] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editForm, setEditForm] = useState({
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
    },
  });

  useEffect(() => {
    loadMyProfile();
  }, [user]);

  const loadMyProfile = async () => {
    try {
      setLoading(true);

      // בדיקה אם למשתמש יש riderId
      if (!user?.riderId) {
        setError('משתמש זה אינו משויך לרוכב');
        setLoading(false);
        return;
      }

      // טעינת פרטי הרוכב
      const riderResponse = await ridersAPI.getById(user.riderId);
      const riderData = riderResponse.data.rider;
      setRider(riderData);

      // טעינת פרטי הכלי אם משויך
      if (riderData.isAssigned && riderData.assignedVehicleId) {
        try {
          const vehicleResponse = await vehiclesAPI.getById(riderData.assignedVehicleId);
          setVehicle(vehicleResponse.data.vehicle);
        } catch (err) {
          console.error('Error loading vehicle:', err);
        }
      }

      // אתחול טופס העריכה
      setEditForm({
        phone: riderData.phone || '',
        email: riderData.email || '',
        address: {
          street: riderData.address?.street || '',
          city: riderData.address?.city || '',
          postalCode: riderData.address?.postalCode || '',
        },
      });

      setError('');
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('שגיאה בטעינת הפרופיל');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEditProfile = async () => {
    try {
      setEditingProfile(true);

      await ridersAPI.update(rider.id, {
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      });

      showSnackbar('הפרופיל עודכן בהצלחה', 'success');
      setEditDialogOpen(false);
      loadMyProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בעדכון הפרופיל', 'error');
    } finally {
      setEditingProfile(false);
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success' },
      inactive: { label: 'לא פעיל', color: 'default' },
      suspended: { label: 'מושעה', color: 'warning' },
    };
    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        {!user?.riderId && (
          <Typography variant="body2" color="textSecondary">
            אנא פנה למנהל המערכת לשיוך חשבון המשתמש לרוכב
          </Typography>
        )}
      </Box>
    );
  }

  if (!rider) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Person sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          לא נמצא פרופיל
        </Typography>
        <Typography color="textSecondary">
          לא נמצא פרופיל רוכב למשתמש זה
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          הפרופיל שלי
        </Typography>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
        >
          עריכת פרטים
        </Button>
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

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    תאריך הצטרפות
                  </Typography>
                  <Typography variant="body1" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonth fontSize="small" />
                    {rider.joinDate
                      ? new Date(rider.joinDate).toLocaleDateString('he-IL')
                      : rider.createdAt
                      ? new Date(rider.createdAt).toLocaleDateString('he-IL')
                      : '-'}
                  </Typography>
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
                  <Typography variant="body1" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Phone fontSize="small" />
                    {rider.phone || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    אימייל
                  </Typography>
                  <Typography variant="body1" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Email fontSize="small" />
                    {rider.email || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    כתובת
                  </Typography>
                  <Typography variant="body1" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn fontSize="small" />
                    {rider.address?.street || rider.address?.city
                      ? `${rider.address.street || ''} ${rider.address.city || ''}`.trim()
                      : '-'}
                  </Typography>
                </Grid>

                {rider.address?.postalCode && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      מיקוד
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {rider.address.postalCode}
                    </Typography>
                  </Grid>
                )}
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
                    {rider.licenseExpiry
                      ? new Date(rider.licenseExpiry).toLocaleDateString('he-IL')
                      : '-'}
                  </Typography>
                </Grid>

                {rider.licenseExpiry && (
                  <Grid item xs={12}>
                    {new Date(rider.licenseExpiry) < new Date() ? (
                      <Alert severity="error">רישיון הנהיגה פג תוקף!</Alert>
                    ) : new Date(rider.licenseExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? (
                      <Alert severity="warning">רישיון הנהיגה עומד לפוג בקרוב</Alert>
                    ) : (
                      <Alert severity="success">רישיון הנהיגה בתוקף</Alert>
                    )}
                  </Grid>
                )}
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

                {rider.isAssigned && vehicle && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        מספר כלי
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {vehicle.vehicleNumber || vehicle.internalNumber || '-'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        סוג כלי
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {vehicle.type || 'אופנוע'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate('/my-vehicle')}
                      >
                        צפה בפרטי הכלי
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* פרטי משתמש */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> פרטי משתמש במערכת
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="textSecondary">
                    שם משתמש
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {user?.username || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="textSecondary">
                    תפקידים במערכת
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {(() => {
                      const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
                      const roleLabels = {
                        'super_admin': 'מנהל על',
                        'manager': 'מנהל',
                        'secretary': 'מזכירה',
                        'logistics': 'לוגיסטיקה',
                        'rider': 'רוכב',
                        'regional_manager': 'מנהל אזורי'
                      };
                      return userRoles.map((r, index) => (
                        <Chip key={index} label={roleLabels[r] || r} size="small" />
                      ));
                    })()}
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="textSecondary">
                    סטטוס חשבון
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={user?.isActive ? 'פעיל' : 'לא פעיל'}
                      color={user?.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>עריכת פרטים</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="טלפון"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              fullWidth
            />

            <TextField
              label="אימייל"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              fullWidth
            />

            <TextField
              label="רחוב"
              value={editForm.address.street}
              onChange={(e) => setEditForm({
                ...editForm,
                address: { ...editForm.address, street: e.target.value }
              })}
              fullWidth
            />

            <TextField
              label="עיר"
              value={editForm.address.city}
              onChange={(e) => setEditForm({
                ...editForm,
                address: { ...editForm.address, city: e.target.value }
              })}
              fullWidth
            />

            <TextField
              label="מיקוד"
              value={editForm.address.postalCode}
              onChange={(e) => setEditForm({
                ...editForm,
                address: { ...editForm.address, postalCode: e.target.value }
              })}
              fullWidth
            />

            <Alert severity="info">
              שינויים אחרים יכולים להיעשות רק על ידי מנהל המערכת
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>ביטול</Button>
          <Button
            onClick={handleEditProfile}
            variant="contained"
            disabled={editingProfile}
          >
            {editingProfile ? 'שומר...' : 'שמור שינויים'}
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
