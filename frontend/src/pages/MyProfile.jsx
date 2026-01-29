import { useState, useEffect, useMemo } from 'react';
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
  Assignment,
  CheckCircle,
  HourglassEmpty,
  Warning,
  Home,
  CreditCard,
  TwoWheeler,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ridersAPI, vehiclesAPI, monthlyChecksAPI } from '../services/api';
import RiderFiles from '../components/RiderFiles';

export default function MyProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rider, setRider] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [monthlyChecks, setMonthlyChecks] = useState([]);
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

  // מפת סטטוסים מודרנית
  const statusMap = useMemo(() => ({
    active: { label: 'פעיל', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    inactive: { label: 'לא פעיל', bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' },
    suspended: { label: 'מושעה', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
  }), []);

  // מפת תפקידים
  const roleMap = useMemo(() => ({
    super_admin: { label: 'מנהל על', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    manager: { label: 'מנהל', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    secretary: { label: 'מזכירה', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
    logistics: { label: 'לוגיסטיקה', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
    rider: { label: 'רוכב', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    regional_manager: { label: 'מנהל אזורי', bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
  }), []);

  useEffect(() => {
    loadMyProfile();
  }, [user]);

  const loadMyProfile = async () => {
    try {
      setLoading(true);
      let riderData = null;

      if (user?.riderId) {
        try {
          const riderResponse = await ridersAPI.getById(user.riderId);
          riderData = riderResponse.data.rider;
          setRider(riderData);
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
            setRider(matchedRider);
          }
        } catch (err) {
          console.error('Error searching for rider:', err);
        }
      }

      if (!riderData) {
        setError('לא נמצא פרופיל רוכב למשתמש זה. אנא פנה למנהל המערכת.');
        setLoading(false);
        return;
      }

      if (riderData.assignmentStatus === 'assigned' && riderData.assignedVehicleId) {
        try {
          const vehicleResponse = await vehiclesAPI.getById(riderData.assignedVehicleId);
          setVehicle(vehicleResponse.data.vehicle);
        } catch (err) {
          console.error('Error loading vehicle:', err);
        }
      }

      try {
        const checksResponse = await monthlyChecksAPI.getAll({ riderId: riderData.id });
        const checks = checksResponse.data.monthlyChecks || [];
        checks.sort((a, b) => {
          const dateA = a.checkDate?.seconds ? new Date(a.checkDate.seconds * 1000) : new Date(a.checkDate);
          const dateB = b.checkDate?.seconds ? new Date(b.checkDate.seconds * 1000) : new Date(b.checkDate);
          return dateB - dateA;
        });
        setMonthlyChecks(checks);
      } catch (err) {
        console.error('Error loading monthly checks:', err);
      }

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
          severity="warning"
          sx={{
            mb: 3,
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          {error}
        </Alert>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          אם אתה אמור להיות רוכב, אנא פנה למנהל המערכת לשיוך חשבון המשתמש לרוכב
        </Typography>
      </Box>
    );
  }

  if (!rider) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, animation: 'fadeIn 0.3s ease-out' }}>
        <Person sx={{ fontSize: 80, color: '#cbd5e1', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
          לא נמצא פרופיל
        </Typography>
        <Typography sx={{ color: '#64748b' }}>
          לא נמצא פרופיל רוכב למשתמש זה
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              הפרופיל שלי
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {rider.firstName} {rider.lastName}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1.5,
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
          עריכת פרטים
        </Button>
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
                    {getStatusChip(rider.status)}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תאריך הצטרפות</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonth sx={{ fontSize: 16, color: '#94a3b8' }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {rider.joinDate
                        ? new Date(rider.joinDate).toLocaleDateString('he-IL')
                        : rider.createdAt
                        ? new Date(rider.createdAt).toLocaleDateString('he-IL')
                        : '-'}
                    </Typography>
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
                    {rider.licenseExpiry
                      ? new Date(rider.licenseExpiry).toLocaleDateString('he-IL')
                      : '-'}
                  </Typography>
                </Grid>
                {rider.licenseExpiry && (
                  <Grid item xs={12}>
                    {new Date(rider.licenseExpiry) < new Date() ? (
                      <Alert severity="error" sx={{ borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        רישיון הנהיגה פג תוקף!
                      </Alert>
                    ) : new Date(rider.licenseExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? (
                      <Alert severity="warning" sx={{ borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        רישיון הנהיגה עומד לפוג בקרוב
                      </Alert>
                    ) : (
                      <Alert severity="success" sx={{ borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        רישיון הנהיגה בתוקף
                      </Alert>
                    )}
                  </Grid>
                )}
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
                {rider.assignmentStatus === 'assigned' && vehicle && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר כלי</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {vehicle.vehicleNumber || vehicle.internalNumber || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>סוג כלי</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {vehicle.type || 'אופנוע'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate('/my-vehicle')}
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
                        צפה בפרטי הכלי
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* בקרות חודשיות */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Assignment sx={{ color: '#2563eb', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  בקרות חודשיות
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              {monthlyChecks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Assignment sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography sx={{ color: '#64748b' }}>
                    אין בקרות חודשיות
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {monthlyChecks.slice(0, 6).map((check) => {
                    const checkDate = check.checkDate?.seconds
                      ? new Date(check.checkDate.seconds * 1000)
                      : new Date(check.checkDate);
                    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
                    const monthName = monthNames[checkDate.getMonth()];
                    const year = checkDate.getFullYear();

                    const statusConfig = {
                      pending: { label: 'ממתין', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <HourglassEmpty fontSize="small" /> },
                      in_progress: { label: 'בתהליך', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', icon: <HourglassEmpty fontSize="small" /> },
                      completed: { label: 'הושלם', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle fontSize="small" /> },
                      overdue: { label: 'באיחור', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <Warning fontSize="small" /> },
                    };
                    const status = statusConfig[check.status] || statusConfig.pending;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={check.id}>
                        <Paper
                          sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            cursor: check.status === 'pending' ? 'pointer' : 'default',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': check.status === 'pending' ? {
                              borderColor: '#6366f1',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                            } : {},
                          }}
                          onClick={() => {
                            if (check.status === 'pending') {
                              navigate(`/monthly-check/${check.id}`);
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                              {monthName} {year}
                            </Typography>
                            <Chip
                              label={status.label}
                              size="small"
                              icon={status.icon}
                              sx={{
                                bgcolor: status.bgcolor,
                                color: status.color,
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: status.color },
                              }}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            כלי: {check.vehicleLicensePlate || check.vehiclePlate || '-'}
                          </Typography>
                          {check.status === 'pending' && (
                            <Button
                              variant="contained"
                              size="small"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/monthly-check/${check.id}`);
                              }}
                              sx={{
                                mt: 1,
                                borderRadius: '10px',
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                },
                              }}
                            >
                              מלא בקרה
                            </Button>
                          )}
                          {check.status === 'completed' && check.completedAt && (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              הושלם: {new Date(check.completedAt?.seconds ? check.completedAt.seconds * 1000 : check.completedAt).toLocaleDateString('he-IL')}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {monthlyChecks.length > 6 && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="text"
                    onClick={() => navigate('/my-checks')}
                    sx={{
                      color: '#6366f1',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                    }}
                  >
                    הצג את כל הבקרות ({monthlyChecks.length})
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* פרטי משתמש */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(236, 72, 153, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Person sx={{ color: '#db2777', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  פרטי משתמש במערכת
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>שם משתמש</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {user?.username || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תפקידים במערכת</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {(() => {
                      const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
                      return userRoles.map((r, index) => {
                        const roleInfo = roleMap[r] || { label: r, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
                        return (
                          <Chip
                            key={index}
                            label={roleInfo.label}
                            size="small"
                            sx={{
                              bgcolor: roleInfo.bgcolor,
                              color: roleInfo.color,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        );
                      });
                    })()}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>סטטוס חשבון</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={user?.isActive ? 'פעיל' : 'לא פעיל'}
                      size="small"
                      sx={{
                        bgcolor: user?.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: user?.isActive ? '#059669' : '#64748b',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* הקבצים שלי */}
      {rider?.driveFolderData?.mainFolderId && (
        <Box sx={{ mt: 3 }}>
          <RiderFiles
            riderName={`${rider.firstName} ${rider.lastName}`}
            riderFolderData={rider.driveFolderData}
            riderId={rider.id}
            viewAsRider={true}
          />
        </Box>
      )}

      {/* Edit Profile Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
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
              <Edit sx={{ fontSize: 24, color: '#ffffff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              עריכת פרטים
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="טלפון"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <TextField
              label="אימייל"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <TextField
              label="רחוב"
              value={editForm.address.street}
              onChange={(e) => setEditForm({
                ...editForm,
                address: { ...editForm.address, street: e.target.value }
              })}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <TextField
              label="עיר"
              value={editForm.address.city}
              onChange={(e) => setEditForm({
                ...editForm,
                address: { ...editForm.address, city: e.target.value }
              })}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <TextField
              label="מיקוד"
              value={editForm.address.postalCode}
              onChange={(e) => setEditForm({
                ...editForm,
                address: { ...editForm.address, postalCode: e.target.value }
              })}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <Alert
              severity="info"
              sx={{
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              שינויים אחרים יכולים להיעשות רק על ידי מנהל המערכת
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
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
            onClick={handleEditProfile}
            variant="contained"
            disabled={editingProfile}
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
