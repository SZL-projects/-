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
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Warning,
  Add,
  CheckCircle,
  Info,
  Error as ErrorIcon,
  TwoWheeler,
  Build,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { faultsAPI, ridersAPI, vehiclesAPI } from '../services/api';

export default function MyFaults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [faults, setFaults] = useState([]);
  const [rider, setRider] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingFault, setReportingFault] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0); // 0 = פתוחות, 1 = כל התקלות
  const [newFault, setNewFault] = useState({
    description: '',
    severity: 'medium',
    location: '',
    notes: '',
  });

  const statusMap = useMemo(() => ({
    open: { label: 'פתוחה', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <ErrorIcon sx={{ fontSize: 16 }} /> },
    in_progress: { label: 'בטיפול', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <Schedule sx={{ fontSize: 16 }} /> },
    resolved: { label: 'טופלה', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    closed: { label: 'סגורה', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b', icon: <Info sx={{ fontSize: 16 }} /> },
  }), []);

  const severityMap = useMemo(() => ({
    critical: { label: 'קריטית', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    high: { label: 'גבוהה', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    medium: { label: 'בינונית', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
    low: { label: 'נמוכה', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' },
  }), []);

  useEffect(() => {
    loadMyFaults();
  }, [user]);

  const loadMyFaults = async () => {
    try {
      setLoading(true);

      let riderData = null;

      // נסיון 1: אם למשתמש יש riderId - טען לפי ID
      if (user?.riderId) {
        try {
          const riderResponse = await ridersAPI.getById(user.riderId);
          riderData = riderResponse.data.rider;
          setRider(riderData);
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
            setRider(matchedRider);
          }
        } catch (err) {
          console.error('Error searching for rider:', err);
        }
      }

      // אם לא נמצא רוכב - הצג שגיאה ידידותית
      if (!riderData) {
        setError('לא נמצא פרופיל רוכב למשתמש זה. אנא פנה למנהל המערכת.');
        setLoading(false);
        return;
      }

      // בדיקה אם הרוכב משויך לכלי
      if (!riderData.isAssigned && !riderData.assignedVehicleId) {
        setError('אינך משויך לכלי כרגע');
        setLoading(false);
        return;
      }

      // טעינת פרטי הכלי
      const vehicleResponse = await vehiclesAPI.getById(riderData.assignedVehicleId);
      setVehicle(vehicleResponse.data.vehicle);

      // טעינת כל התקלות של הכלי
      const faultsResponse = await faultsAPI.getAll();
      const vehicleFaults = faultsResponse.data.faults
        .filter(fault => fault.vehicleId === riderData.assignedVehicleId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFaults(vehicleFaults);

      setError('');
    } catch (err) {
      console.error('Error loading faults:', err);
      setError('שגיאה בטעינת התקלות');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleReportFault = async () => {
    if (!newFault.description.trim()) {
      showSnackbar('נא למלא תיאור תקלה', 'warning');
      return;
    }

    try {
      setReportingFault(true);

      await faultsAPI.create({
        vehicleId: vehicle.id,
        riderId: rider.id,
        description: newFault.description,
        severity: newFault.severity,
        location: newFault.location,
        notes: newFault.notes,
        status: 'open',
        reportedDate: new Date().toISOString(),
        reportedBy: user.id,
      });

      showSnackbar('תקלה דווחה בהצלחה', 'success');
      setReportDialogOpen(false);
      setNewFault({
        description: '',
        severity: 'medium',
        location: '',
        notes: '',
      });
      loadMyFaults();
    } catch (err) {
      console.error('Error reporting fault:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בדיווח תקלה', 'error');
    } finally {
      setReportingFault(false);
    }
  };

  const getStatusChip = (status) => {
    const config = statusMap[status] || { label: status, bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
    return (
      <Chip
        label={config.label}
        size="small"
        icon={config.icon}
        sx={{
          bgcolor: config.bgcolor,
          color: config.color,
          fontWeight: 500,
          '& .MuiChip-icon': { color: config.color },
        }}
      />
    );
  };

  const getSeverityChip = (severity) => {
    const config = severityMap[severity] || { label: severity, bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          bgcolor: config.bgcolor,
          color: config.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const openFaults = faults.filter(f => f.status === 'open' || f.status === 'in_progress');
  const displayFaults = activeTab === 0 ? openFaults : faults;

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
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
      <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            borderRadius: '12px',
            bgcolor: 'rgba(245, 158, 11, 0.1)',
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

  if (!vehicle) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4, animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            bgcolor: 'rgba(100, 116, 139, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <Warning sx={{ fontSize: 40, color: '#64748b' }} />
        </Box>
        <Typography variant="h5" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
          לא נמצא כלי משויך
        </Typography>
        <Typography sx={{ color: '#64748b' }}>
          כרגע אינך משויך לכלי רכב
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Warning sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
              התקלות שלי
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <TwoWheeler sx={{ fontSize: 18, color: '#64748b' }} />
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                כלי: {vehicle.vehicleNumber || vehicle.internalNumber}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setReportDialogOpen(true)}
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1.2,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          דווח תקלה
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              bgcolor: 'rgba(239, 68, 68, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#dc2626' }}>
                    {faults.filter(f => f.status === 'open').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>תקלות פתוחות</Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ErrorIcon sx={{ color: '#dc2626', fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              bgcolor: 'rgba(245, 158, 11, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#d97706' }}>
                    {faults.filter(f => f.status === 'in_progress').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>בטיפול</Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Build sx={{ color: '#d97706', fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              bgcolor: 'rgba(16, 185, 129, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#059669' }}>
                    {faults.filter(f => f.status === 'resolved').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>טופלו</Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle sx={{ color: '#059669', fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#6366f1' }}>
                    {faults.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>סה"כ תקלות</Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Warning sx={{ color: '#6366f1', fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper
        sx={{
          mb: 2,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              color: '#64748b',
              '&.Mui-selected': { color: '#6366f1' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1' },
          }}
        >
          <Tab label={`תקלות פתוחות (${openFaults.length})`} />
          <Tab label={`כל התקלות (${faults.length})`} />
        </Tabs>
      </Paper>

      {/* Faults Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>תיאור</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>חומרה</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>סטטוס</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>מיקום</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>תאריך דיווח</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>הערות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayFaults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '16px',
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 32, color: '#059669' }} />
                  </Box>
                  <Typography sx={{ color: '#64748b', fontWeight: 500 }}>
                    {activeTab === 0 ? 'אין תקלות פתוחות' : 'אין תקלות רשומות'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayFaults.map((fault) => (
                <TableRow
                  key={fault.id}
                  hover
                  sx={{
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.02)' },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="500" sx={{ color: '#1e293b' }}>
                      {fault.description || 'ללא תיאור'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getSeverityChip(fault.severity)}</TableCell>
                  <TableCell>{getStatusChip(fault.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {fault.location || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {fault.reportedDate
                        ? new Date(fault.reportedDate).toLocaleDateString('he-IL')
                        : new Date(fault.createdAt).toLocaleDateString('he-IL')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      {fault.notes || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Report Fault Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
          דיווח תקלה
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert
              severity="info"
              sx={{
                borderRadius: '12px',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                '& .MuiAlert-icon': { color: '#6366f1' },
                '& .MuiAlert-message': { color: '#6366f1' },
              }}
            >
              כלי: {vehicle.vehicleNumber || vehicle.internalNumber}
            </Alert>

            <TextField
              label="תיאור התקלה"
              value={newFault.description}
              onChange={(e) => setNewFault({ ...newFault, description: e.target.value })}
              multiline
              rows={3}
              required
              fullWidth
              sx={textFieldSx}
            />

            <FormControl fullWidth>
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>חומרת התקלה</InputLabel>
              <Select
                value={newFault.severity}
                onChange={(e) => setNewFault({ ...newFault, severity: e.target.value })}
                label="חומרת התקלה"
                sx={{
                  borderRadius: '12px',
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', borderWidth: 2 },
                }}
              >
                <MenuItem value="low">נמוכה</MenuItem>
                <MenuItem value="medium">בינונית</MenuItem>
                <MenuItem value="high">גבוהה</MenuItem>
                <MenuItem value="critical">קריטית</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="מיקום התקלה"
              value={newFault.location}
              onChange={(e) => setNewFault({ ...newFault, location: e.target.value })}
              fullWidth
              placeholder="לדוגמה: גלגל קדמי, בלמים, מנוע..."
              sx={textFieldSx}
            />

            <TextField
              label="הערות נוספות"
              value={newFault.notes}
              onChange={(e) => setNewFault({ ...newFault, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
              sx={textFieldSx}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setReportDialogOpen(false)}
            sx={{
              color: '#64748b',
              borderRadius: '10px',
              px: 3,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(100, 116, 139, 0.08)' },
            }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleReportFault}
            variant="contained"
            disabled={reportingFault || !newFault.description.trim()}
            sx={{
              borderRadius: '10px',
              px: 3,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
              '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            {reportingFault ? 'מדווח...' : 'דווח תקלה'}
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
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            fontWeight: 500,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
