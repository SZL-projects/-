import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// פונקציית עזר להמרת תאריך בצורה בטוחה
const safeParseDate = (dateValue) => {
  if (!dateValue) return null;

  // אם זה Firestore Timestamp
  if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }

  // אם זה כבר Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  // אם זה string או number
  try {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (e) {
    return null;
  }
};
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Snackbar,
  Stack,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Search,
  Visibility,
  Build,
  CheckCircle,
  Warning,
  ErrorOutline,
  Person,
  TwoWheeler,
  CalendarToday,
  Refresh,
  Send as SendIcon,
  FilterList,
  AddTask,
  Delete,
  Close,
} from '@mui/icons-material';
import { monthlyChecksAPI, ridersAPI, vehiclesAPI } from '../services/api';

export default function MonthlyChecks() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [checks, setChecks] = useState([]);
  const [riders, setRiders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRider, setFilterRider] = useState('all');
  const [error, setError] = useState('');
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [sendingNotification, setSendingNotification] = useState(null);
  const [openChecksDialogOpen, setOpenChecksDialogOpen] = useState(false);
  const [selectedRiders, setSelectedRiders] = useState([]);
  const [openingChecks, setOpeningChecks] = useState(false);
  const [deletingCheck, setDeletingCheck] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [checksRes, ridersRes, vehiclesRes] = await Promise.all([
        monthlyChecksAPI.getAll().catch(() => ({ data: { checks: [] } })),
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
        vehiclesAPI.getAll().catch(() => ({ data: { vehicles: [] } })),
      ]);

      const checksData = checksRes.data.checks || checksRes.data.monthlyChecks || [];
      console.log('📋 [LOAD DATA] Received checks:', checksData);
      console.log('📋 [LOAD DATA] First check ID:', checksData[0]?.id, checksData[0]?._id);

      setChecks(checksData);
      setRiders(ridersRes.data.riders || []);
      setVehicles(vehiclesRes.data.vehicles || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // אופטימיזציה: חישוב סטטיסטיקות עם useMemo במקום useEffect
  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthChecks = checks.filter(check => {
      const checkDate = safeParseDate(check.checkDate);
      return checkDate && checkDate >= firstDayOfMonth;
    });

    // ספירת בקרות עם בעיות - צריך לבדוק גם את checkResults
    const checksWithIssues = checks.filter(c => {
      if (c.status === 'pending') return false;
      const results = c.checkResults || {};
      if (c.hasIssues || c.status === 'issues') return true;
      if (results.oilCheck === 'low' || results.oilCheck === 'not_ok') return true;
      if (results.waterCheck === 'low' || results.waterCheck === 'not_ok') return true;
      if (results.brakesCondition === 'bad' || results.brakesCondition === 'fair') return true;
      if (results.lightsCondition === 'bad' || results.lightsCondition === 'fair') return true;
      if (results.mirrorsCondition === 'bad') return true;
      if (results.helmetCondition === 'bad') return true;
      return false;
    });

    return {
      total: checks.length,
      thisMonth: thisMonthChecks.length,
      pending: checks.filter(c => c.status === 'pending').length,
      completed: checks.filter(c => c.status === 'completed' || c.status === 'passed').length,
      issues: checksWithIssues.length,
    };
  }, [checks]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = safeParseDate(timestamp);
    if (!date) return '-';
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  // פונקציה לבדוק אם יש בעיות בתוצאות הבקרה
  const checkHasIssues = (check) => {
    if (check.hasIssues) return true;
    if (check.status === 'issues') return true;

    const results = check.checkResults || {};
    if (results.oilCheck === 'low' || results.oilCheck === 'not_ok') return true;
    if (results.waterCheck === 'low' || results.waterCheck === 'not_ok') return true;
    if (results.brakesCondition === 'bad' || results.brakesCondition === 'fair') return true;
    if (results.lightsCondition === 'bad' || results.lightsCondition === 'fair') return true;
    if (results.mirrorsCondition === 'bad') return true;
    if (results.helmetCondition === 'bad') return true;

    return false;
  };

  // מפת סטטוסים מודרנית
  const statusMap = useMemo(() => ({
    completed: { label: 'תקין', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    passed: { label: 'תקין', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    pending: { label: 'ממתין', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <Warning sx={{ fontSize: 16 }} /> },
    failed: { label: 'נכשל', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <ErrorOutline sx={{ fontSize: 16 }} /> },
    issues: { label: 'יש בעיות', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <ErrorOutline sx={{ fontSize: 16 }} /> },
  }), []);

  const getStatusChip = (check) => {
    const status = check.status;
    const hasIssues = checkHasIssues(check);

    // אם יש בעיות - תמיד הצג כ"יש בעיות"
    if (hasIssues && (status === 'completed' || status === 'passed' || status === 'issues')) {
      return (
        <Chip
          label="יש בעיות"
          size="small"
          icon={<ErrorOutline sx={{ fontSize: 16 }} />}
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            fontWeight: 600,
            fontSize: '0.75rem',
            '& .MuiChip-icon': { color: '#dc2626' },
          }}
        />
      );
    }

    const statusInfo = statusMap[status] || { label: status, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b', icon: null };
    return (
      <Chip
        label={statusInfo.label}
        size="small"
        icon={statusInfo.icon}
        sx={{
          bgcolor: statusInfo.bgcolor,
          color: statusInfo.color,
          fontWeight: 600,
          fontSize: '0.75rem',
          '& .MuiChip-icon': { color: statusInfo.color },
        }}
      />
    );
  };

  const handleViewDetails = useCallback((check) => {
    setSelectedCheck(check);
    setDetailsDialogOpen(true);
  }, []);

  const handleSendNotification = useCallback(async (checkId) => {
    console.log('🔔 [FRONTEND] handleSendNotification called with ID:', checkId);
    try {
      setSendingNotification(checkId);
      console.log('🔔 [FRONTEND] Calling monthlyChecksAPI.sendNotification with ID:', checkId);
      const response = await monthlyChecksAPI.sendNotification(checkId);
      console.log('🔔 [FRONTEND] Response received:', response.data);
      setSnackbar({ open: true, message: 'הודעה נשלחה בהצלחה לרוכב', severity: 'success' });
      await loadData();
    } catch (error) {
      console.error('❌ [FRONTEND] Error sending notification:', error);
      console.error('❌ [FRONTEND] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'שגיאה בשליחת הודעה',
        severity: 'error'
      });
    } finally {
      setSendingNotification(null);
    }
  }, [loadData]);

  const handleSendToAll = useCallback(async () => {
    const pendingChecks = checks.filter(c => c.status === 'pending');

    if (pendingChecks.length === 0) {
      setSnackbar({ open: true, message: 'אין בקרות ממתינות לשליחה', severity: 'info' });
      return;
    }

    if (!window.confirm(`האם לשלוח הודעה ל-${pendingChecks.length} רוכבים?`)) {
      return;
    }

    setSendingNotification('all');
    let successCount = 0;
    let errorCount = 0;

    for (const check of pendingChecks) {
      try {
        await monthlyChecksAPI.sendNotification(check._id || check.id);
        successCount++;
      } catch (error) {
        console.error('Error sending to:', check.riderName, error);
        errorCount++;
      }
    }

    setSendingNotification(null);

    if (errorCount === 0) {
      setSnackbar({
        open: true,
        message: `הודעות נשלחו בהצלחה ל-${successCount} רוכבים`,
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: `נשלחו ${successCount} הודעות, ${errorCount} נכשלו`,
        severity: 'warning'
      });
    }

    await loadData();
  }, [checks, loadData]);

  // רשימת רוכבים זכאים לבקרה (פעילים עם כלי משויך)
  const eligibleRiders = useMemo(() => {
    const activeRiders = riders.filter(r => r.riderStatus === 'active' || r.status === 'active');
    return activeRiders.map(rider => {
      const assignedVehicle = vehicles.find(v => v.assignedTo === (rider._id || rider.id));
      return {
        ...rider,
        assignedVehicle,
        isEligible: !!assignedVehicle
      };
    }).filter(r => r.isEligible);
  }, [riders, vehicles]);

  const handleOpenChecksDialog = useCallback(() => {
    setSelectedRiders(eligibleRiders.map(r => r._id || r.id));
    setOpenChecksDialogOpen(true);
  }, [eligibleRiders]);

  const handleToggleRider = useCallback((riderId) => {
    setSelectedRiders(prev =>
      prev.includes(riderId)
        ? prev.filter(id => id !== riderId)
        : [...prev, riderId]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    if (selectedRiders.length === eligibleRiders.length) {
      setSelectedRiders([]);
    } else {
      setSelectedRiders(eligibleRiders.map(r => r._id || r.id));
    }
  }, [selectedRiders, eligibleRiders]);

  const handleDeleteCheck = useCallback(async (checkId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הבקרה?')) {
      return;
    }

    setDeletingCheck(checkId);
    try {
      await monthlyChecksAPI.delete(checkId);
      setSnackbar({ open: true, message: 'הבקרה נמחקה בהצלחה', severity: 'success' });
      await loadData();
    } catch (error) {
      console.error('Error deleting check:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'שגיאה במחיקת הבקרה',
        severity: 'error'
      });
    } finally {
      setDeletingCheck(null);
    }
  }, [loadData]);

  const handleOpenChecks = useCallback(async () => {
    if (selectedRiders.length === 0) {
      setSnackbar({ open: true, message: 'נא לבחור לפחות רוכב אחד', severity: 'warning' });
      return;
    }

    setOpeningChecks(true);
    try {
      console.log('📝 [FRONTEND] Sending create request with riderIds:', selectedRiders);
      const response = await monthlyChecksAPI.create({
        riderIds: selectedRiders,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });

      console.log('📝 [FRONTEND] Received response:', response.data);

      const { checks, errors } = response.data;
      const createdCount = checks?.length || 0;
      const errorCount = errors?.length || 0;

      if (createdCount === 0 && errorCount > 0) {
        const errorMessages = errors.map(e => e.error).join(', ');
        setSnackbar({
          open: true,
          message: `לא ניתן ליצור בקרות: ${errorMessages}`,
          severity: 'error'
        });
      } else if (errorCount > 0) {
        setSnackbar({
          open: true,
          message: `נוצרו ${createdCount} בקרות, ${errorCount} נכשלו`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `${createdCount} בקרות חודשיות נפתחו בהצלחה`,
          severity: 'success'
        });
      }

      setOpenChecksDialogOpen(false);
      setSelectedRiders([]);
      await loadData();
    } catch (error) {
      console.error('❌ [FRONTEND] Error opening checks:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'שגיאה בפתיחת בקרות',
        severity: 'error'
      });
    } finally {
      setOpeningChecks(false);
    }
  }, [selectedRiders, loadData]);


  // אופטימיזציה: חישוב בקרות מסוננות עם useMemo
  const filteredChecks = useMemo(() => {
    return checks.filter(check => {
      const matchesSearch = !searchTerm ||
        check.vehicleLicensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.riderName?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = false;
      if (filterStatus === 'all') {
        matchesStatus = true;
      } else if (filterStatus === 'pending') {
        matchesStatus = check.status === 'pending';
      } else if (filterStatus === 'completed') {
        matchesStatus = (check.status === 'completed' || check.status === 'passed') && !checkHasIssues(check);
      } else if (filterStatus === 'issues') {
        matchesStatus = checkHasIssues(check) && check.status !== 'pending';
      }

      const matchesRider = filterRider === 'all' || check.riderId === filterRider;

      return matchesSearch && matchesStatus && matchesRider;
    });
  }, [checks, searchTerm, filterStatus, filterRider]);

  return (
    <Box sx={{ maxWidth: '100%', overflowX: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        mb: 3,
        gap: 2
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
            <Build sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              בקרה חודשית
            </Typography>
            {!isMobile && (
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                ניהול ומעקב אחר בקרות חודשיות
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          width: { xs: '100%', md: 'auto' }
        }}>
          <Button
            variant="contained"
            startIcon={<AddTask />}
            onClick={handleOpenChecksDialog}
            fullWidth={isMobile}
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
            פתח בקרות
          </Button>
          <Button
            variant="contained"
            startIcon={sendingNotification === 'all' ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={handleSendToAll}
            disabled={sendingNotification === 'all' || stats.pending === 0}
            fullWidth={isMobile}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                background: '#e2e8f0',
                boxShadow: 'none',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {isMobile ? `שלח לממתינים (${stats.pending})` : (
              <Badge badgeContent={stats.pending} color="error">
                שלח הודעה לכל הממתינים
              </Badge>
            )}
          </Button>
          <IconButton
            onClick={loadData}
            disabled={loading}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              color: '#6366f1',
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
            }}
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
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
      )}

      {/* סטטיסטיקות */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 1 }}>סה"כ בקרות</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 1 }}>החודש</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#6366f1' }}>
                {stats.thisMonth}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 1 }}>הושלמו</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669' }}>
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 1 }}>ממתינים</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#d97706' }}>
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 1 }}>יש בעיות</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626' }}>
                {stats.issues}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* טבלת בקרות */}
      <>
          {/* סינון וחיפוש */}
          <Paper sx={{
            p: 2,
            mb: 3,
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  placeholder="חפש לפי מספר רישוי או רוכב..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      bgcolor: '#f8fafc',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      '&.Mui-focused': { bgcolor: '#ffffff' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>סינון לפי סטטוס</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="סינון לפי סטטוס"
                    sx={{
                      borderRadius: '12px',
                      bgcolor: '#f8fafc',
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    <MenuItem value="all">הכל</MenuItem>
                    <MenuItem value="pending">לא בוצע (ממתין)</MenuItem>
                    <MenuItem value="completed">בוצע - תקין</MenuItem>
                    <MenuItem value="issues">בוצע - יש בעיות</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>סינון לפי רוכב</InputLabel>
                  <Select
                    value={filterRider}
                    onChange={(e) => setFilterRider(e.target.value)}
                    label="סינון לפי רוכב"
                    sx={{
                      borderRadius: '12px',
                      bgcolor: '#f8fafc',
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    <MenuItem value="all">כל הרוכבים</MenuItem>
                    {riders.map(rider => (
                      <MenuItem key={rider._id || rider.id} value={rider._id || rider.id}>
                        {rider.firstName} {rider.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* טבלת בקרות - Desktop */}
          {!isMobile ? (
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>מספר רישוי</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>רוכב</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>תאריך בקרה</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>ק"מ</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>שמן</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>צמיגים</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>סטטוס</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <CircularProgress sx={{ color: '#6366f1' }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredChecks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <Build sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                        <Typography sx={{ color: '#64748b' }}>
                          לא נמצאו בקרות
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChecks.map((check) => (
                      <TableRow
                        key={check._id || check.id}
                        sx={{
                          '&:hover': { bgcolor: '#f8fafc' },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {check.vehicleLicensePlate || check.vehiclePlate || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                          {check.riderName || '-'}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                          {formatDate(check.checkDate)}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                          {check.currentKm?.toLocaleString('he-IL') ||
                           check.kilometers?.toLocaleString('he-IL') || '0'}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                          <Chip
                            label={check.checkResults?.oilCheck === 'ok' ? 'תקין' :
                                  check.checkResults?.oilCheck === 'low' ? 'נמוך' : '-'}
                            size="small"
                            sx={{
                              bgcolor: check.checkResults?.oilCheck === 'ok' ? 'rgba(16, 185, 129, 0.1)' :
                                      check.checkResults?.oilCheck === 'low' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                              color: check.checkResults?.oilCheck === 'ok' ? '#059669' :
                                    check.checkResults?.oilCheck === 'low' ? '#d97706' : '#64748b',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                          {check.checkResults?.tirePressureFront && check.checkResults?.tirePressureRear ? (
                            <Typography variant="body2">
                              {check.checkResults.tirePressureFront}/{check.checkResults.tirePressureRear}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>{getStatusChip(check)}</TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid #f1f5f9' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(check)}
                              title="צפה בפרטים"
                              sx={{
                                color: '#6366f1',
                                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            {check.status === 'pending' && (
                              <IconButton
                                size="small"
                                onClick={() => handleSendNotification(check._id || check.id)}
                                disabled={sendingNotification === (check._id || check.id)}
                                title="שלח הודעה לרוכב"
                                sx={{
                                  color: '#8b5cf6',
                                  '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.1)' },
                                }}
                              >
                                {sendingNotification === (check._id || check.id) ? (
                                  <CircularProgress size={20} sx={{ color: '#8b5cf6' }} />
                                ) : (
                                  <SendIcon fontSize="small" />
                                )}
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCheck(check._id || check.id)}
                              disabled={deletingCheck === (check._id || check.id)}
                              title="מחק בקרה"
                              sx={{
                                color: '#ef4444',
                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                              }}
                            >
                              {deletingCheck === (check._id || check.id) ? (
                                <CircularProgress size={20} sx={{ color: '#ef4444' }} />
                              ) : (
                                <Delete fontSize="small" />
                              )}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* כרטיסים למובייל */
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: '#6366f1' }} />
                </Box>
              ) : filteredChecks.length === 0 ? (
                <Paper sx={{
                  py: 6,
                  px: 3,
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                }}>
                  <Build sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography sx={{ color: '#64748b' }}>לא נמצאו בקרות</Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {filteredChecks.map((check) => (
                    <Card
                      key={check._id || check.id}
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {check.vehicleLicensePlate || check.vehiclePlate || '-'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              {check.riderName || '-'}
                            </Typography>
                          </Box>
                          {getStatusChip(check)}
                        </Box>

                        <Grid container spacing={1} sx={{ mt: 1 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>תאריך</Typography>
                            <Typography variant="body2" sx={{ color: '#1e293b' }}>{formatDate(check.checkDate)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>ק"מ</Typography>
                            <Typography variant="body2" sx={{ color: '#1e293b' }}>
                              {check.currentKm?.toLocaleString('he-IL') ||
                               check.kilometers?.toLocaleString('he-IL') || '0'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>שמן</Typography>
                            <Box>
                              <Chip
                                label={check.checkResults?.oilCheck === 'ok' ? 'תקין' :
                                      check.checkResults?.oilCheck === 'low' ? 'נמוך' : '-'}
                                size="small"
                                sx={{
                                  bgcolor: check.checkResults?.oilCheck === 'ok' ? 'rgba(16, 185, 129, 0.1)' :
                                          check.checkResults?.oilCheck === 'low' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                  color: check.checkResults?.oilCheck === 'ok' ? '#059669' :
                                        check.checkResults?.oilCheck === 'low' ? '#d97706' : '#64748b',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>צמיגים</Typography>
                            <Typography variant="body2" sx={{ color: '#1e293b' }}>
                              {check.checkResults?.tirePressureFront && check.checkResults?.tirePressureRear ?
                                `${check.checkResults.tirePressureFront}/${check.checkResults.tirePressureRear}` : '-'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                      <Divider />
                      <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1.5, gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewDetails(check)}
                          sx={{
                            color: '#6366f1',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                          }}
                        >
                          פרטים
                        </Button>
                        {check.status === 'pending' && (
                          <Button
                            size="small"
                            startIcon={sendingNotification === (check._id || check.id) ?
                              <CircularProgress size={16} sx={{ color: '#8b5cf6' }} /> : <SendIcon />}
                            onClick={() => handleSendNotification(check._id || check.id)}
                            disabled={sendingNotification === (check._id || check.id)}
                            sx={{
                              color: '#8b5cf6',
                              fontWeight: 600,
                              '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.1)' },
                            }}
                          >
                            שלח
                          </Button>
                        )}
                        <Button
                          size="small"
                          startIcon={deletingCheck === (check._id || check.id) ?
                            <CircularProgress size={16} sx={{ color: '#ef4444' }} /> : <Delete />}
                          onClick={() => handleDeleteCheck(check._id || check.id)}
                          disabled={deletingCheck === (check._id || check.id)}
                          sx={{
                            color: '#ef4444',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                          }}
                        >
                          מחק
                        </Button>
                      </CardActions>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {!loading && filteredChecks.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                מציג {filteredChecks.length} מתוך {checks.length} בקרות
              </Typography>
            </Box>
          )}
        </>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : '20px',
          },
        }}
      >
        {isMobile ? (
          <AppBar sx={{ position: 'relative', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={() => setDetailsDialogOpen(false)}>
                <Close />
              </IconButton>
              <Typography sx={{ flex: 1, fontWeight: 600 }} variant="h6">
                פרטי בקרה חודשית
              </Typography>
            </Toolbar>
          </AppBar>
        ) : (
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
                <Build sx={{ fontSize: 24, color: '#ffffff' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                פרטי בקרה חודשית
              </Typography>
            </Box>
          </DialogTitle>
        )}
        <DialogContent sx={{ pt: isMobile ? 3 : 2 }}>
          {selectedCheck && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card sx={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>מספר רישוי</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedCheck.vehicleLicensePlate || selectedCheck.vehiclePlate}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card sx={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>רוכב</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedCheck.riderName || 'לא ידוע'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card sx={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>תאריך בדיקה</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {formatDate(selectedCheck.checkDate)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card sx={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>קילומטראז'</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {(selectedCheck.currentKm || selectedCheck.kilometers || 0).toLocaleString('he-IL')} ק"מ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {selectedCheck.checkResults && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600, color: '#1e293b' }}>תוצאות בדיקות</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        label={`שמן: ${selectedCheck.checkResults.oilCheck === 'ok' ? 'תקין' : selectedCheck.checkResults.oilCheck === 'low' ? 'נמוך' : 'לא ניתן לבדוק'}`}
                        sx={{
                          bgcolor: selectedCheck.checkResults.oilCheck === 'ok' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: selectedCheck.checkResults.oilCheck === 'ok' ? '#059669' : '#d97706',
                          fontWeight: 600,
                        }}
                      />
                      {selectedCheck.checkResults.waterCheck && (
                        <Chip
                          label={`מים: ${selectedCheck.checkResults.waterCheck === 'ok' ? 'תקין' : selectedCheck.checkResults.waterCheck === 'low' ? 'נמוך' : 'לא ניתן לבדוק'}`}
                          sx={{
                            bgcolor: selectedCheck.checkResults.waterCheck === 'ok' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: selectedCheck.checkResults.waterCheck === 'ok' ? '#059669' : '#d97706',
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {selectedCheck.checkResults.tirePressureFront && (
                        <Chip
                          label={`צמיג קדמי: ${selectedCheck.checkResults.tirePressureFront} PSI`}
                          sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 600 }}
                        />
                      )}
                      {selectedCheck.checkResults.tirePressureRear && (
                        <Chip
                          label={`צמיג אחורי: ${selectedCheck.checkResults.tirePressureRear} PSI`}
                          sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 600 }}
                        />
                      )}
                      {selectedCheck.checkResults.brakesCondition && (
                        <Chip
                          label={`בלמים: ${selectedCheck.checkResults.brakesCondition === 'good' ? 'תקין' : selectedCheck.checkResults.brakesCondition === 'fair' ? 'בינוני' : 'לא תקין'}`}
                          sx={{
                            bgcolor: selectedCheck.checkResults.brakesCondition === 'good' ? 'rgba(16, 185, 129, 0.1)' :
                                    selectedCheck.checkResults.brakesCondition === 'fair' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: selectedCheck.checkResults.brakesCondition === 'good' ? '#059669' :
                                  selectedCheck.checkResults.brakesCondition === 'fair' ? '#d97706' : '#dc2626',
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {selectedCheck.checkResults.lightsCondition && (
                        <Chip
                          label={`פנסים: ${selectedCheck.checkResults.lightsCondition === 'good' ? 'תקין' : selectedCheck.checkResults.lightsCondition === 'fair' ? 'בינוני' : 'לא תקין'}`}
                          sx={{
                            bgcolor: selectedCheck.checkResults.lightsCondition === 'good' ? 'rgba(16, 185, 129, 0.1)' :
                                    selectedCheck.checkResults.lightsCondition === 'fair' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: selectedCheck.checkResults.lightsCondition === 'good' ? '#059669' :
                                  selectedCheck.checkResults.lightsCondition === 'fair' ? '#d97706' : '#dc2626',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                </>
              )}

              {(selectedCheck.issues || selectedCheck.notes) && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  {selectedCheck.issues && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ color: '#dc2626', fontWeight: 600 }}>בעיות שנמצאו:</Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>{selectedCheck.issues}</Typography>
                    </Grid>
                  )}
                  {selectedCheck.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>הערות:</Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>{selectedCheck.notes}</Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        {!isMobile && (
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setDetailsDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: '12px',
                px: 4,
                fontWeight: 600,
                borderColor: '#e2e8f0',
                color: '#64748b',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  bgcolor: '#f8fafc',
                },
              }}
            >
              סגור
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Dialog לפתיחת בקרות חודשיות */}
      <Dialog
        open={openChecksDialogOpen}
        onClose={() => setOpenChecksDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : '20px',
          },
        }}
      >
        {isMobile ? (
          <AppBar sx={{ position: 'relative', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={() => setOpenChecksDialogOpen(false)}>
                <Close />
              </IconButton>
              <Typography sx={{ flex: 1, fontWeight: 600 }} variant="h6">
                פתיחת בקרות חודשיות
              </Typography>
              <Button
                autoFocus
                color="inherit"
                onClick={handleOpenChecks}
                disabled={openingChecks || selectedRiders.length === 0}
                sx={{ fontWeight: 600 }}
              >
                {openingChecks ? 'פותח...' : `פתח (${selectedRiders.length})`}
              </Button>
            </Toolbar>
          </AppBar>
        ) : (
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
                <AddTask sx={{ fontSize: 24, color: '#ffffff' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  פתיחת בקרות חודשיות
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  בחר רוכבים לפתיחת בקרה חודשית - {new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
        )}
        <DialogContent sx={{ pt: isMobile ? 3 : 2 }}>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                נבחרו {selectedRiders.length} מתוך {eligibleRiders.length} רוכבים
              </Typography>
              <Button
                size="small"
                onClick={handleToggleAll}
                startIcon={<CheckCircle />}
                sx={{
                  color: '#6366f1',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                }}
              >
                {selectedRiders.length === eligibleRiders.length ? 'בטל הכל' : 'בחר הכל'}
              </Button>
            </Box>

            {eligibleRiders.length === 0 ? (
              <Alert
                severity="info"
                sx={{
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                אין רוכבים פעילים עם כלי משויך
              </Alert>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {eligibleRiders.map((rider) => (
                  <ListItem
                    key={rider._id || rider.id}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      mb: 1,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                      bgcolor: selectedRiders.includes(rider._id || rider.id) ? 'rgba(99, 102, 241, 0.05)' : 'background.paper',
                      borderColor: selectedRiders.includes(rider._id || rider.id) ? '#6366f1' : '#e2e8f0',
                    }}
                    onClick={() => handleToggleRider(rider._id || rider.id)}
                  >
                    <ListItemIcon>
                      <input
                        type="checkbox"
                        checked={selectedRiders.includes(rider._id || rider.id)}
                        onChange={() => handleToggleRider(rider._id || rider.id)}
                        style={{
                          width: 20,
                          height: 20,
                          cursor: 'pointer',
                          accentColor: '#6366f1',
                        }}
                      />
                    </ListItemIcon>
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
                        <Person sx={{ color: '#6366f1', fontSize: 20 }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {rider.firstName} {rider.lastName}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          כלי: {rider.assignedVehicle?.licensePlate} • {rider.assignedVehicle?.manufacturer} {rider.assignedVehicle?.model}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        {!isMobile && (
          <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
            <Button
              onClick={() => setOpenChecksDialogOpen(false)}
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
              variant="contained"
              onClick={handleOpenChecks}
              disabled={openingChecks || selectedRiders.length === 0}
              startIcon={openingChecks ? <CircularProgress size={20} color="inherit" /> : <AddTask />}
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
              {openingChecks ? 'פותח בקרות...' : `פתח ${selectedRiders.length} בקרות`}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Snackbar להודעות */}
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
