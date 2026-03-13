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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Collapse,
} from '@mui/material';
import {
  TwoWheeler,
  DirectionsCar,
  CalendarMonth,
  Build,
  Warning,
  CheckCircle,
  Info,
  Speed,
  FolderOpen,
  OpenInNew,
  Description,
  Visibility,
  Download,
  Assignment,
  HourglassEmpty,
  TaskAlt,
  Badge as BadgeIcon,
  Factory,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { vehiclesAPI, ridersAPI, faultsAPI, monthlyChecksAPI, maintenanceAPI, tasksAPI } from '../services/api';
import MaintenanceDialog from '../components/MaintenanceDialog';

export default function MyVehicle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [rider, setRider] = useState(null);
  const [recentFaults, setRecentFaults] = useState([]);
  const [recentMaintenances, setRecentMaintenances] = useState([]);
  const [monthlyChecks, setMonthlyChecks] = useState([]);
  const [insuranceFiles, setInsuranceFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [myTasks, setMyTasks] = useState([]);
  const [taskNotes, setTaskNotes] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});

  // מפת סטטוסים מודרנית
  const statusMap = useMemo(() => ({
    active: { label: 'פעיל', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    maintenance: { label: 'בתחזוקה', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <Build sx={{ fontSize: 16 }} /> },
    out_of_service: { label: 'לא תקין', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <Warning sx={{ fontSize: 16 }} /> },
    reserved: { label: 'שמור', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', icon: <Info sx={{ fontSize: 16 }} /> },
  }), []);

  const faultStatusMap = useMemo(() => ({
    open: { label: 'פתוחה', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    in_progress: { label: 'בטיפול', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    resolved: { label: 'טופלה', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    closed: { label: 'סגורה', bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' },
  }), []);

  useEffect(() => {
    loadMyVehicle();
  }, [user]);

  const loadInsuranceFiles = async (folderId, vehicleId) => {
    try {
      setFilesLoading(true);
      const response = await vehiclesAPI.listFiles(folderId, vehicleId, true);
      setInsuranceFiles(response.data.files || []);
    } catch (err) {
      console.error('ERROR loading files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const loadMyVehicle = async () => {
    try {
      setLoading(true);
      let vehicleId = null;
      let riderData = null;

      if (user?.riderId) {
        try {
          const riderResponse = await ridersAPI.getById(user.riderId);
          riderData = riderResponse.data.rider;
          setRider(riderData);
          if (riderData.assignmentStatus === 'assigned' && riderData.assignedVehicleId) {
            vehicleId = riderData.assignedVehicleId;
          }
        } catch (err) {
          console.error('Error loading rider:', err);
        }
      }

      if (!riderData && user?.username) {
        try {
          const ridersResponse = await ridersAPI.getAll();
          const allRiders = ridersResponse.data.riders || ridersResponse.data;
          const matchedRider = allRiders.find(r => {
            if (r.username && user.username &&
                r.username.toLowerCase() === user.username.toLowerCase()) return true;
            const riderFullName = r.firstName && r.lastName
              ? `${r.firstName} ${r.lastName}`.toLowerCase() : null;
            const userFullName = user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`.toLowerCase() : null;
            return riderFullName && userFullName && riderFullName === userFullName;
          });
          if (matchedRider) {
            riderData = matchedRider;
            setRider(riderData);
            if (riderData.assignmentStatus === 'assigned' && riderData.assignedVehicleId) {
              vehicleId = riderData.assignedVehicleId;
            } else if (riderData.isAssigned && riderData.assignedVehicleId) {
              vehicleId = riderData.assignedVehicleId;
            }
          }
        } catch (err) {
          console.error('Error searching for rider:', err);
        }
      }

      if (!vehicleId) {
        setError('אינך משויך לכלי כרגע. אנא פנה למנהל המערכת לשיוך לכלי.');
        setLoading(false);
        return;
      }

      const vehicleResponse = await vehiclesAPI.getById(vehicleId);
      const vehicleData = vehicleResponse.data.vehicle;
      setVehicle(vehicleData);

      if (vehicleData.insuranceFolderId) {
        loadInsuranceFiles(vehicleData.insuranceFolderId, vehicleId);
      }

      try {
        const faultsResponse = await faultsAPI.getAll();
        const vehicleFaults = faultsResponse.data.faults
          .filter(fault => fault.vehicleId === vehicleId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentFaults(vehicleFaults);
      } catch (err) {
        console.error('Error loading faults:', err);
      }

      // טעינת טיפולים אחרונים
      try {
        const maintenanceResponse = await maintenanceAPI.getByVehicle(vehicleId, 5);
        setRecentMaintenances(maintenanceResponse.data.maintenances || []);
      } catch (err) {
        console.error('Error loading maintenances:', err);
      }

      try {
        const riderId = riderData?.id || riderData?._id;
        const checksResponse = await monthlyChecksAPI.getAll({ vehicleId, riderId });
        const checks = checksResponse.data.monthlyChecks || [];
        const parseCheckDate = (checkDate) => {
          if (!checkDate) return new Date(0);
          if (checkDate.toDate) return checkDate.toDate();
          if (checkDate.seconds) return new Date(checkDate.seconds * 1000);
          if (checkDate._seconds) return new Date(checkDate._seconds * 1000);
          return new Date(checkDate);
        };
        checks.sort((a, b) => parseCheckDate(b.checkDate) - parseCheckDate(a.checkDate));
        // הצג לרוכב רק את בקרת החודש הנוכחי
        const now = new Date();
        const currentMonthChecks = checks.filter(c => {
          const d = parseCheckDate(c.checkDate);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        setMonthlyChecks(currentMonthChecks);
      } catch (err) {
        console.error('Error loading monthly checks:', err);
      }

      try {
        const tasksResponse = await tasksAPI.getAll({ riderId: user?.id });
        setMyTasks(tasksResponse.data.tasks || []);
      } catch (err) {
        console.error('Error loading tasks:', err);
      }

      setError('');
    } catch (err) {
      console.error('Error loading vehicle:', err);
      setError('שגיאה בטעינת פרטי הכלי');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusInfo = statusMap[status] || { label: status, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b', icon: null };
    return (
      <Chip
        label={statusInfo.label}
        size="medium"
        icon={statusInfo.icon}
        sx={{
          bgcolor: statusInfo.bgcolor,
          color: statusInfo.color,
          fontWeight: 600,
          '& .MuiChip-icon': { color: statusInfo.color },
        }}
      />
    );
  };

  const getFaultStatusChip = (status) => {
    const statusInfo = faultStatusMap[status] || { label: status, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
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
            mb: 3,
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {error}
        </Alert>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          אנא פנה למנהל המערכת לשיוך חשבון המשתמש לרוכב או להוספת הרשאות גישה לכלים
        </Typography>
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, animation: 'fadeIn 0.3s ease-out' }}>
        <TwoWheeler sx={{ fontSize: 80, color: '#cbd5e1', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
          לא נמצא כלי משויך
        </Typography>
        <Typography sx={{ color: '#64748b' }}>
          כרגע אינך משויך לכלי רכב
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
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
            <TwoWheeler sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              הכלי שלי
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {rider?.firstName} {rider?.lastName}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* פרטי הכלי */}
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
                  <DirectionsCar sx={{ color: '#6366f1', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  פרטי הכלי
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר כלי</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {vehicle.vehicleNumber || vehicle.internalNumber || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>סטטוס</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(vehicle.status)}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר רישוי</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.licensePlate || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>סוג כלי</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.type === 'scooter' ? 'קטנוע' : vehicle.type === 'motorcycle' ? 'אופנוע' : vehicle.type || 'אופנוע'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>יצרן ודגם</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.manufacturer || '-'} {vehicle.model || ''}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>שנת ייצור</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.year || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* תחזוקה ובדיקות */}
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
                  <Build sx={{ color: '#d97706', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  תחזוקה ובדיקות
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תחזוקה אחרונה</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.lastMaintenanceDate
                      ? new Date(vehicle.lastMaintenanceDate).toLocaleDateString('he-IL')
                      : 'לא בוצעה'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תחזוקה הבאה</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.nextMaintenanceDate
                      ? new Date(vehicle.nextMaintenanceDate).toLocaleDateString('he-IL')
                      : 'לא נקבעה'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed sx={{ color: '#94a3b8', fontSize: 18 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>קילומטר אחרון</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {(vehicle.currentKilometers || vehicle.currentMileage) ? `${(vehicle.currentKilometers || vehicle.currentMileage).toLocaleString()} ק"מ` : '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תוקף ביטוח</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.insurance?.mandatory?.expiryDate
                      ? new Date(vehicle.insurance.mandatory.expiryDate).toLocaleDateString('he-IL')
                      : 'לא הוזן'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>תוקף רשיון רכב</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.vehicleLicense?.expiryDate
                      ? new Date(vehicle.vehicleLicense.expiryDate).toLocaleDateString('he-IL')
                      : 'לא הוזן'}
                  </Typography>
                </Grid>
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
                  {monthlyChecks.map((check) => {
                    const rawDate = check.checkDate;
                    const checkDate = rawDate?._seconds
                      ? new Date(rawDate._seconds * 1000)
                      : rawDate?.seconds
                      ? new Date(rawDate.seconds * 1000)
                      : rawDate
                      ? new Date(rawDate)
                      : null;
                    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
                    const isValidDate = checkDate && !isNaN(checkDate.getTime());
                    const monthName = isValidDate ? monthNames[checkDate.getMonth()] : '';
                    const year = isValidDate ? checkDate.getFullYear() : '';

                    const statusConfig = {
                      pending: { label: 'ממתין', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <HourglassEmpty fontSize="small" /> },
                      in_progress: { label: 'בתהליך', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', icon: <HourglassEmpty fontSize="small" /> },
                      completed: { label: 'הושלם', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle fontSize="small" /> },
                      overdue: { label: 'באיחור', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <Warning fontSize="small" /> },
                      issues: { label: 'יש בעיות', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <Warning fontSize="small" /> },
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
                            כלי: {check.vehicleLicensePlate || check.vehiclePlate || vehicle?.licensePlate || '-'}
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
            </CardContent>
          </Card>
        </Grid>

        {/* משימות */}
        {myTasks.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TaskAlt sx={{ color: '#059669', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    המשימות שלי
                  </Typography>
                  <Chip label={myTasks.length} size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 700 }} />
                </Box>
                <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
                <List sx={{ p: 0 }}>
                  {myTasks.map((task, index) => {
                    const priorityMap = { high: { label: 'דחוף', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' }, medium: { label: 'בינוני', color: '#d97706', bg: 'rgba(245,158,11,0.1)' }, low: { label: 'נמוך', color: '#059669', bg: 'rgba(16,185,129,0.1)' } };
                    const statusMap2 = { pending: 'ממתין', in_progress: 'בביצוע', completed: 'הושלם', cancelled: 'בוטל' };
                    const p = priorityMap[task.priority] || priorityMap.medium;
                    const isDone = task.status === 'completed' || task.status === 'cancelled';
                    return (
                      <ListItem key={task.id || index} sx={{ border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : '#e2e8f0'}`, borderRadius: '12px', mb: 1.5, flexDirection: 'column', alignItems: 'flex-start', bgcolor: isDone ? 'rgba(16,185,129,0.03)' : 'transparent' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: isDone ? '#94a3b8' : '#1e293b', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip label={p.label} size="small" sx={{ bgcolor: p.bg, color: p.color, fontWeight: 600, fontSize: '0.72rem' }} />
                            <Chip label={statusMap2[task.status] || task.status} size="small" sx={{ bgcolor: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: isDone ? '#059669' : '#6366f1', fontWeight: 600, fontSize: '0.72rem' }} />
                            {!isDone && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                                onClick={async () => {
                                  try {
                                    await tasksAPI.update(task.id, { status: 'completed' });
                                    setMyTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t));
                                  } catch (err) {
                                    console.error('Error updating task:', err);
                                  }
                                }}
                                sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap' }}
                              >
                                סמן כבוצע
                              </Button>
                            )}
                          </Box>
                        </Box>
                        {task.description && (
                          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>{task.description}</Typography>
                        )}
                        {task.dueDate && (
                          <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5 }}>
                            תאריך יעד: {new Date(task.dueDate?.seconds ? task.dueDate.seconds * 1000 : task.dueDate).toLocaleDateString('he-IL')}
                          </Typography>
                        )}
                        {/* הערות רוכב */}
                        {task.riderNotes && !expandedNotes[task.id] && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(99,102,241,0.05)', borderRadius: '8px', width: '100%' }}>
                            <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600 }}>הערה: </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>{task.riderNotes}</Typography>
                          </Box>
                        )}
                        <Collapse in={!!expandedNotes[task.id]} sx={{ width: '100%' }}>
                          <Box sx={{ mt: 1.5, width: '100%' }}>
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              size="small"
                              label="הוסף הערה"
                              value={taskNotes[task.id] ?? (task.riderNotes || '')}
                              onChange={e => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                              sx={{ mb: 1 }}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button size="small" variant="contained" sx={{ borderRadius: '8px', bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                                onClick={async () => {
                                  try {
                                    const note = taskNotes[task.id] ?? task.riderNotes ?? '';
                                    await tasksAPI.update(task.id, { riderNotes: note });
                                    setMyTasks(prev => prev.map(t => t.id === task.id ? { ...t, riderNotes: note } : t));
                                    setExpandedNotes(prev => ({ ...prev, [task.id]: false }));
                                  } catch (err) {
                                    console.error('Error saving note:', err);
                                  }
                                }}>שמור</Button>
                              <Button size="small" variant="outlined" sx={{ borderRadius: '8px' }}
                                onClick={() => setExpandedNotes(prev => ({ ...prev, [task.id]: false }))}>ביטול</Button>
                            </Box>
                          </Box>
                        </Collapse>
                        {!expandedNotes[task.id] && (
                          <Button size="small" variant="text" sx={{ mt: 0.5, color: '#6366f1', fontSize: '0.75rem', p: 0, minWidth: 0 }}
                            onClick={() => setExpandedNotes(prev => ({ ...prev, [task.id]: true }))}>
                            {task.riderNotes ? 'ערוך הערה' : '+ הוסף הערה'}
                          </Button>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* תקלות אחרונות */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Warning sx={{ color: '#dc2626', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    תקלות אחרונות
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/my-faults')}
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    borderColor: '#e2e8f0',
                    color: '#6366f1',
                    '&:hover': {
                      borderColor: '#6366f1',
                      bgcolor: 'rgba(99, 102, 241, 0.05)',
                    },
                  }}
                >
                  צפה בכל התקלות
                </Button>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              {recentFaults.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
                  <Typography sx={{ color: '#64748b' }}>
                    אין תקלות רשומות
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {recentFaults.map((fault, index) => (
                    <ListItem
                      key={fault.id || index}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        mb: 1.5,
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                      }}
                    >
                      <ListItemIcon>
                        <Box sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          bgcolor: fault.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Warning sx={{ color: fault.severity === 'critical' ? '#dc2626' : '#d97706', fontSize: 20 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {fault.description || 'ללא תיאור'}
                            </Typography>
                            {getFaultStatusChip(fault.status)}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                            {fault.reportedDate
                              ? new Date(fault.reportedDate).toLocaleDateString('he-IL')
                              : new Date(fault.createdAt).toLocaleDateString('he-IL')}
                            {fault.severity && ` • חומרה: ${fault.severity === 'critical' ? 'קריטית' : fault.severity === 'high' ? 'גבוהה' : fault.severity === 'medium' ? 'בינונית' : 'נמוכה'}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* טיפולים אחרונים */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Build sx={{ color: '#6366f1', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    טיפולים
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Build />}
                  onClick={() => setMaintenanceDialogOpen(true)}
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    bgcolor: '#6366f1',
                    '&:hover': {
                      bgcolor: '#4f46e5',
                    },
                  }}
                >
                  דווח על טיפול
                </Button>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              {recentMaintenances.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Build sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                  <Typography sx={{ color: '#64748b' }}>
                    אין טיפולים רשומים
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {recentMaintenances.map((maintenance, index) => (
                    <ListItem
                      key={maintenance.id || index}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        mb: 1.5,
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                      }}
                    >
                      <ListItemIcon>
                        <Box sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          bgcolor: maintenance.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Build sx={{ color: maintenance.status === 'completed' ? '#10b981' : '#6366f1', fontSize: 20 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {maintenance.description || 'ללא תיאור'}
                            </Typography>
                            <Chip
                              label={
                                maintenance.status === 'completed' ? 'הושלם' :
                                maintenance.status === 'in_progress' ? 'בטיפול' :
                                maintenance.status === 'pending_approval' ? 'ממתין לאישור' :
                                'מתוכנן'
                              }
                              size="small"
                              sx={{
                                bgcolor:
                                  maintenance.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' :
                                  maintenance.status === 'in_progress' ? 'rgba(245, 158, 11, 0.1)' :
                                  maintenance.status === 'pending_approval' ? 'rgba(168, 85, 247, 0.1)' :
                                  'rgba(59, 130, 246, 0.1)',
                                color:
                                  maintenance.status === 'completed' ? '#10b981' :
                                  maintenance.status === 'in_progress' ? '#f59e0b' :
                                  maintenance.status === 'pending_approval' ? '#a855f7' :
                                  '#3b82f6',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                            {(() => {
                              const raw = maintenance.maintenanceDate || maintenance.createdAt;
                              if (!raw) return '';
                              const d = new Date(raw?._seconds ? raw._seconds * 1000 : raw?.seconds ? raw.seconds * 1000 : raw);
                              return isNaN(d) ? '' : d.toLocaleDateString('he-IL');
                            })()}
                            {maintenance.garageName && ` • ${maintenance.garageName}`}
                            {maintenance.costs?.totalCost > 0 && ` • ₪${maintenance.costs.totalCost.toLocaleString()}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* קבצי ביטוח */}
        <Grid item xs={12} md={6}>
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
                  bgcolor: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Description sx={{ color: '#8b5cf6', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  קבצי ביטוח
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

              {filesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={30} sx={{ color: '#6366f1' }} />
                </Box>
              ) : insuranceFiles.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {insuranceFiles.map((file) => (
                    <ListItem
                      key={file.id}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        mb: 1.5,
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                      }}
                    >
                      <ListItemIcon>
                        <Box sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Description sx={{ color: '#6366f1', fontSize: 20 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{file.name}</Typography>}
                        secondary={<Typography variant="caption" sx={{ color: '#94a3b8' }}>{`${new Date(file.createdTime).toLocaleDateString('he-IL')} • ${(file.size / 1024).toFixed(1)} KB`}</Typography>}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => window.open(file.webViewLink, '_blank')}
                          sx={{
                            borderRadius: '10px',
                            fontWeight: 600,
                            borderColor: '#e2e8f0',
                            color: '#6366f1',
                            '&:hover': {
                              borderColor: '#6366f1',
                              bgcolor: 'rgba(99, 102, 241, 0.05)',
                            },
                          }}
                        >
                          צפייה
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Download />}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `https://drive.google.com/uc?export=download&id=${file.id}`;
                            link.download = file.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          sx={{
                            borderRadius: '10px',
                            fontWeight: 600,
                            borderColor: '#e2e8f0',
                            color: '#059669',
                            '&:hover': {
                              borderColor: '#059669',
                              bgcolor: 'rgba(16, 185, 129, 0.05)',
                            },
                          }}
                        >
                          הורדה
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Description sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography sx={{ color: '#64748b' }}>
                    אין קבצי ביטוח זמינים
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* הערות */}
        {vehicle.notes && (
          <Grid item xs={12} md={6}>
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
                    <Info sx={{ color: '#2563eb', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    הערות
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
                <Typography variant="body1" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                  {vehicle.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Maintenance Dialog */}
      <MaintenanceDialog
        open={maintenanceDialogOpen}
        onClose={() => setMaintenanceDialogOpen(false)}
        maintenance={null}
        vehicles={vehicle ? [vehicle] : []}
        riders={rider ? [rider] : []}
        onSave={async () => {
          setMaintenanceDialogOpen(false);
          // טען מחדש את הטיפולים
          if (vehicle?.id) {
            try {
              const maintenanceResponse = await maintenanceAPI.getByVehicle(vehicle.id, 5);
              setRecentMaintenances(maintenanceResponse.data.maintenances || []);
            } catch (err) {
              console.error('Error reloading maintenances:', err);
            }
          }
        }}
        isRiderView={true}
      />
    </Box>
  );
}
