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
    const statusMap = {
      open: { label: 'פתוחה', color: 'error', icon: <ErrorIcon /> },
      in_progress: { label: 'בטיפול', color: 'warning', icon: <Warning /> },
      resolved: { label: 'טופלה', color: 'success', icon: <CheckCircle /> },
      closed: { label: 'סגורה', color: 'default', icon: <Info /> },
    };
    const { label, color, icon } = statusMap[status] || { label: status, color: 'default', icon: null };
    return <Chip label={label} color={color} size="small" icon={icon} />;
  };

  const getSeverityChip = (severity) => {
    const severityMap = {
      critical: { label: 'קריטית', color: 'error' },
      high: { label: 'גבוהה', color: 'warning' },
      medium: { label: 'בינונית', color: 'info' },
      low: { label: 'נמוכה', color: 'default' },
    };
    const { label, color } = severityMap[severity] || { label: severity, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const openFaults = faults.filter(f => f.status === 'open' || f.status === 'in_progress');
  const displayFaults = activeTab === 0 ? openFaults : faults;

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
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="textSecondary">
          אם אתה אמור להיות רוכב, אנא פנה למנהל המערכת לשיוך חשבון המשתמש לרוכב
        </Typography>
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Warning sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          לא נמצא כלי משויך
        </Typography>
        <Typography color="textSecondary">
          כרגע אינך משויך לכלי רכב
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            התקלות שלי
          </Typography>
          <Typography variant="body1" color="textSecondary">
            כלי: {vehicle.vehicleNumber || vehicle.internalNumber}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setReportDialogOpen(true)}
          size="large"
        >
          דווח תקלה
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">
                {faults.filter(f => f.status === 'open').length}
              </Typography>
              <Typography variant="body2">תקלות פתוחות</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">
                {faults.filter(f => f.status === 'in_progress').length}
              </Typography>
              <Typography variant="body2">בטיפול</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">
                {faults.filter(f => f.status === 'resolved').length}
              </Typography>
              <Typography variant="body2">טופלו</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">
                {faults.length}
              </Typography>
              <Typography variant="body2">סה"כ תקלות</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`תקלות פתוחות (${openFaults.length})`} />
          <Tab label={`כל התקלות (${faults.length})`} />
        </Tabs>
      </Paper>

      {/* Faults Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>תיאור</TableCell>
              <TableCell>חומרה</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell>מיקום</TableCell>
              <TableCell>תאריך דיווח</TableCell>
              <TableCell>הערות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayFaults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
                  <Typography color="textSecondary">
                    {activeTab === 0 ? 'אין תקלות פתוחות' : 'אין תקלות רשומות'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayFaults.map((fault) => (
                <TableRow key={fault.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {fault.description || 'ללא תיאור'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getSeverityChip(fault.severity)}</TableCell>
                  <TableCell>{getStatusChip(fault.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {fault.location || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {fault.reportedDate
                        ? new Date(fault.reportedDate).toLocaleDateString('he-IL')
                        : new Date(fault.createdAt).toLocaleDateString('he-IL')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
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
      >
        <DialogTitle>דיווח תקלה</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
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
            />

            <FormControl fullWidth>
              <InputLabel>חומרת התקלה</InputLabel>
              <Select
                value={newFault.severity}
                onChange={(e) => setNewFault({ ...newFault, severity: e.target.value })}
                label="חומרת התקלה"
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
            />

            <TextField
              label="הערות נוספות"
              value={newFault.notes}
              onChange={(e) => setNewFault({ ...newFault, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>ביטול</Button>
          <Button
            onClick={handleReportFault}
            variant="contained"
            disabled={reportingFault || !newFault.description.trim()}
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
