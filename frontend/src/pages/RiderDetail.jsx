import { useState, useEffect, useMemo } from 'react';
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
  TwoWheeler,
  Visibility,
  Home,
  CalendarMonth,
  CreditCard,
} from '@mui/icons-material';
import { ridersAPI, authAPI, vehiclesAPI } from '../services/api';
import RiderDialog from '../components/RiderDialog';

export default function RiderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // מפת סטטוסים מודרנית
  const statusMap = useMemo(() => ({
    active: { label: 'פעיל', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    inactive: { label: 'לא פעיל', bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' },
    suspended: { label: 'מושעה', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
  }), []);

  useEffect(() => {
    loadRider();
  }, [id]);

  useEffect(() => {
    if (rider?.assignedVehicleId) {
      loadVehicle(rider.assignedVehicleId);
    }
  }, [rider]);

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

  const loadVehicle = async (vehicleId) => {
    try {
      const response = await vehiclesAPI.getById(vehicleId);
      setVehicle(response.data.vehicle);
    } catch (err) {
      console.error('Error loading vehicle:', err);
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
      const temporaryPassword = Math.random().toString(36).slice(-8);
      const vehicleAccessArray = rider.assignedVehicleId ? [rider.assignedVehicleId] : [];

      await authAPI.createUser({
        username,
        email,
        password: temporaryPassword,
        firstName: rider.firstName,
        lastName: rider.lastName,
        roles: ['rider'],
        riderId: id,
        vehicleAccess: vehicleAccessArray,
        isActive: true,
      });

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

  const handleSaveRider = async (riderData) => {
    try {
      await ridersAPI.update(id, riderData);
      showSnackbar('הרוכב עודכן בהצלחה', 'success');
      setEditDialogOpen(false);
      loadRider();
    } catch (err) {
      console.error('Error updating rider:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בעדכון הרוכב', 'error');
    }
  };

  const getStatusChip = (status) => {
    const statusInfo = statusMap[status] || { label: status, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
    return (
      <Chip
        label={statusInfo.label}
        size="small"
        sx={{
          bgcolor: statusInfo.bgcolor,
          color: statusInfo.color,
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
        <Alert
          severity="error"
          sx={{
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            mb: 3,
          }}
        >
          {error}
        </Alert>
        <Button
          onClick={() => navigate('/riders')}
          startIcon={<ArrowBack />}
          sx={{
            borderRadius: '12px',
            fontWeight: 600,
            color: '#6366f1',
            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
          }}
        >
          חזרה לרשימת רוכבים
        </Button>
      </Box>
    );
  }

  if (!rider) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, animation: 'fadeIn 0.3s ease-out' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
          בקרוב
        </Typography>
        <Typography sx={{ color: '#64748b', mb: 3 }}>
          עמוד זה בבנייה
        </Typography>
        <Button
          onClick={() => navigate('/riders')}
          startIcon={<ArrowBack />}
          sx={{
            borderRadius: '12px',
            fontWeight: 600,
            color: '#6366f1',
            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
          }}
        >
          חזרה לרשימת רוכבים
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/riders')}
            sx={{
              color: '#64748b',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}>
            <Person sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {rider.firstName} {rider.lastName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusChip(rider.riderStatus)}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setCreateUserDialogOpen(true)}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              fontWeight: 600,
              borderColor: '#e2e8f0',
              color: '#6366f1',
              '&:hover': {
                borderColor: '#6366f1',
                bgcolor: 'rgba(99, 102, 241, 0.05)',
              },
            }}
          >
            יצירת משתמש
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setEditDialogOpen(true)}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            עריכה
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* פרטים אישיים */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            height: '100%',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Person sx={{ color: '#6366f1', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  פרטים אישיים
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>שם פרטי</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {rider.firstName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>שם משפחה</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {rider.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תעודת זהות</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {rider.idNumber || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>סטטוס</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(rider.riderStatus)}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* פרטי קשר */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            height: '100%',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Phone sx={{ color: '#059669', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  פרטי קשר
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Phone sx={{ color: '#94a3b8', fontSize: 18 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>טלפון</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {rider.phone || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Email sx={{ color: '#94a3b8', fontSize: 18 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>אימייל</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {rider.email || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Home sx={{ color: '#94a3b8', fontSize: 18 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>כתובת</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {rider.address?.street || rider.address?.city
                          ? `${rider.address.street || ''} ${rider.address.city || ''}`.trim()
                          : '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* רישיון ואישורים */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            height: '100%',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CreditCard sx={{ color: '#d97706', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  רישיון ואישורים
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר רישיון</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {rider.licenseNumber || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תוקף רישיון</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {rider.licenseExpiry ? new Date(rider.licenseExpiry).toLocaleDateString('he-IL') : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* שיוך לכלי */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            height: '100%',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <TwoWheeler sx={{ color: '#8b5cf6', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  שיוך לכלי
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>סטטוס שיוך</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={rider.assignmentStatus === 'assigned' ? 'משויך' : 'לא משויך'}
                      size="small"
                      sx={{
                        bgcolor: rider.assignmentStatus === 'assigned' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: rider.assignmentStatus === 'assigned' ? '#8b5cf6' : '#64748b',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                </Grid>

                {vehicle && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר רישוי (ל"ז)</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {vehicle.licensePlate || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר פנימי</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {vehicle.internalNumber || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>יצרן ודגם</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {vehicle.manufacturer} {vehicle.model}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>סוג</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {vehicle.type === 'scooter' ? 'סקוטר' : 'אופנוע'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/vehicles/${vehicle._id}`)}
                        fullWidth
                        sx={{
                          mt: 1,
                          borderRadius: '12px',
                          fontWeight: 600,
                          borderColor: '#e2e8f0',
                          color: '#6366f1',
                          '&:hover': {
                            borderColor: '#6366f1',
                            bgcolor: 'rgba(99, 102, 241, 0.05)',
                          },
                        }}
                      >
                        צפה בפרטי הכלי המלאים
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Rider Dialog */}
      <RiderDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveRider}
        rider={rider}
      />

      {/* Create User Dialog */}
      <Dialog
        open={createUserDialogOpen}
        onClose={() => setCreateUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: '20px',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PersonAdd sx={{ fontSize: 24, color: '#ffffff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              יצירת משתמש לרוכב
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="שם משתמש"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />
            <TextField
              label="אימייל"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />
            <Alert
              severity="info"
              sx={{
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              סיסמה זמנית תיווצר ותישלח למייל הרוכב
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
          <Button
            onClick={() => setCreateUserDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.2,
              fontWeight: 600,
              borderColor: '#e2e8f0',
              color: '#64748b',
              '&:hover': {
                borderColor: '#cbd5e1',
                bgcolor: '#f8fafc',
              },
            }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={creatingUser || !username || !email}
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
              '&:disabled': {
                background: '#e2e8f0',
                boxShadow: 'none',
              },
            }}
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
          sx={{
            borderRadius: '12px',
            fontWeight: 500,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
