import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Divider,
} from '@mui/material';
import {
  Search,
  Visibility,
  Edit,
  Warning,
  CheckCircle,
  Build,
  Cancel,
  Refresh,
  ErrorOutline,
  TwoWheeler,
} from '@mui/icons-material';
import { faultsAPI, ridersAPI, vehiclesAPI } from '../services/api';

export default function Faults() {
  const navigate = useNavigate();
  const [faults, setFaults] = useState([]);
  const [riders, setRiders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCanRide, setFilterCanRide] = useState('all');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(0); // 0: הכל, 1: פתוחות, 2: קריטיות
  const [selectedFault, setSelectedFault] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [faultsRes, ridersRes, vehiclesRes] = await Promise.all([
        faultsAPI.getAll().catch(() => ({ data: { faults: [] } })),
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
        vehiclesAPI.getAll().catch(() => ({ data: { vehicles: [] } })),
      ]);

      setFaults(faultsRes.data.faults || []);
      setRiders(ridersRes.data.riders || []);
      setVehicles(vehiclesRes.data.vehicles || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // אופטימיזציה: חישוב סטטיסטיקות במעבר אחד על המערך
  const stats = useMemo(() => {
    const result = {
      total: faults.length,
      open: 0,
      inProgress: 0,
      resolved: 0,
      critical: 0,
      cannotRide: 0,
    };

    for (const f of faults) {
      if (f.status === 'open') result.open++;
      else if (f.status === 'in_progress') result.inProgress++;
      else if (f.status === 'resolved' || f.status === 'closed') result.resolved++;

      if (f.severity === 'critical' || f.severity === 'high') result.critical++;
      if (f.canRide === false) result.cannotRide++;
    }

    return result;
  }, [faults]);

  const handleViewDetails = useCallback((fault) => {
    setSelectedFault(fault);
    setDetailsDialogOpen(true);
  }, []);

  const handleUpdateStatus = useCallback(async (faultId, newStatus) => {
    try {
      await faultsAPI.update(faultId, { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Error updating fault status:', err);
      setError('שגיאה בעדכון הסטטוס');
    }
  }, []);

  // מיפוי קבוע - מוגדר מחוץ לרנדר
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }), []);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dateFormatter.format(date);
  }, [dateFormatter]);

  // מיפויי סטטוסים וחומרות - מוגדרים מחוץ לרנדר
  const statusMap = useMemo(() => ({
    open: { label: 'פתוחה', color: 'error', icon: <Warning /> },
    in_progress: { label: 'בטיפול', color: 'warning', icon: <Build /> },
    resolved: { label: 'נפתרה', color: 'success', icon: <CheckCircle /> },
    closed: { label: 'סגורה', color: 'default', icon: <CheckCircle /> },
  }), []);

  const severityMap = useMemo(() => ({
    critical: { label: 'קריטית', color: 'error' },
    high: { label: 'גבוהה', color: 'error' },
    medium: { label: 'בינונית', color: 'warning' },
    low: { label: 'נמוכה', color: 'info' },
  }), []);

  const categoryMap = useMemo(() => ({
    engine: 'מנוע',
    brakes: 'בלמים',
    electrical: 'חשמל ותאורה',
    tires: 'צמיגים',
    bodywork: 'מרכב',
    other: 'אחר',
  }), []);

  const getStatusChip = useCallback((status) => {
    const { label, color, icon } = statusMap[status] || { label: status, color: 'default', icon: null };
    return <Chip label={label} color={color} size="small" icon={icon} />;
  }, [statusMap]);

  const getSeverityChip = useCallback((severity) => {
    const { label, color } = severityMap[severity] || { label: severity, color: 'default' };
    return <Chip label={label} color={color} size="small" variant="outlined" />;
  }, [severityMap]);

  const getCategoryLabel = useCallback((category) => {
    return categoryMap[category] || category;
  }, [categoryMap]);

  // אופטימיזציה: useMemo למניעת סינון מיותר בכל render
  const filteredFaults = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return faults.filter(fault => {
      const matchesSearch = !searchTerm ||
        fault.vehicleLicensePlate?.toLowerCase().includes(searchLower) ||
        fault.vehicleNumber?.toLowerCase().includes(searchLower) ||
        fault.title?.toLowerCase().includes(searchLower) ||
        fault.description?.toLowerCase().includes(searchLower);

      const matchesStatus = filterStatus === 'all' || fault.status === filterStatus;
      const matchesSeverity = filterSeverity === 'all' || fault.severity === filterSeverity;
      const matchesCanRide = filterCanRide === 'all' ||
        (filterCanRide === 'yes' && fault.canRide === true) ||
        (filterCanRide === 'no' && fault.canRide === false);

      // סינון לפי טאב
      let matchesTab = true;
      if (viewMode === 1) { // פתוחות
        matchesTab = fault.status === 'open' || fault.status === 'in_progress';
      } else if (viewMode === 2) { // קריטיות
        matchesTab = fault.severity === 'critical' || fault.severity === 'high' || fault.canRide === false;
      }

      return matchesSearch && matchesStatus && matchesSeverity && matchesCanRide && matchesTab;
    });
  }, [faults, searchTerm, filterStatus, filterSeverity, filterCanRide, viewMode]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning /> ניהול תקלות
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ניהול ומעקב אחר תקלות בכלים
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
          disabled={loading}
        >
          רענן
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* סטטיסטיקות */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">סה"כ</Typography>
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setViewMode(1)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">פתוחות</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.open}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">בטיפול</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.inProgress}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">נפתרו</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.resolved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setViewMode(2)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">קריטיות</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.critical}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">לא ניתן לרכב</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.cannotRide}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={viewMode} onChange={(e, v) => setViewMode(v)}>
          <Tab label="כל התקלות" />
          <Tab
            label={
              <Badge badgeContent={stats.open + stats.inProgress} color="error">
                תקלות פתוחות
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={stats.critical} color="error">
                תקלות קריטיות
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* סינון וחיפוש */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="חפש לפי כלי, כותרת או תיאור..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="סטטוס"
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="open">פתוחה</MenuItem>
                <MenuItem value="in_progress">בטיפול</MenuItem>
                <MenuItem value="resolved">נפתרה</MenuItem>
                <MenuItem value="closed">סגורה</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>חומרה</InputLabel>
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                label="חומרה"
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="critical">קריטית</MenuItem>
                <MenuItem value="high">גבוהה</MenuItem>
                <MenuItem value="medium">בינונית</MenuItem>
                <MenuItem value="low">נמוכה</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>ניתן לרכב?</InputLabel>
              <Select
                value={filterCanRide}
                onChange={(e) => setFilterCanRide(e.target.value)}
                label="ניתן לרכב?"
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="yes">כן</MenuItem>
                <MenuItem value="no">לא</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* טבלת תקלות */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>כלי</TableCell>
              <TableCell>כותרת</TableCell>
              <TableCell>קטגוריה</TableCell>
              <TableCell>חומרה</TableCell>
              <TableCell>ניתן לרכב?</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell>תאריך דיווח</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredFaults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box sx={{ py: 4 }}>
                    <Warning sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="textSecondary">
                      לא נמצאו תקלות
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredFaults.map((fault) => (
                <TableRow
                  key={fault._id || fault.id}
                  hover
                  sx={{
                    bgcolor: fault.canRide === false ? 'error.lighter' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {fault.vehicleLicensePlate || fault.vehicleNumber || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {fault.title || fault.description?.substring(0, 50) || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(fault.category)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{getSeverityChip(fault.severity)}</TableCell>
                  <TableCell>
                    {fault.canRide === true ? (
                      <Chip icon={<CheckCircle />} label="כן" color="success" size="small" />
                    ) : fault.canRide === false ? (
                      <Chip icon={<Cancel />} label="לא" color="error" size="small" />
                    ) : (
                      <Chip label="לא ידוע" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{getStatusChip(fault.status)}</TableCell>
                  <TableCell>
                    {formatDate(fault.reportedDate || fault.createdAt)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleViewDetails(fault)}
                    >
                      <Visibility />
                    </IconButton>
                    {fault.status === 'open' && (
                      <IconButton
                        color="warning"
                        size="small"
                        onClick={() => handleUpdateStatus(fault._id || fault.id, 'in_progress')}
                        title="העבר לטיפול"
                      >
                        <Build />
                      </IconButton>
                    )}
                    {fault.status === 'in_progress' && (
                      <IconButton
                        color="success"
                        size="small"
                        onClick={() => handleUpdateStatus(fault._id || fault.id, 'resolved')}
                        title="סמן כנפתר"
                      >
                        <CheckCircle />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && filteredFaults.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            מציג {filteredFaults.length} מתוך {faults.length} תקלות
          </Typography>
        </Box>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning /> פרטי תקלה
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedFault && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">כלי</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {selectedFault.vehicleLicensePlate || selectedFault.vehicleNumber}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">תאריך דיווח</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {formatDate(selectedFault.reportedDate || selectedFault.createdAt)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined" sx={{
                  bgcolor: selectedFault.canRide === false ? 'error.light' : 'background.paper'
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>פרטי תקלה</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {getSeverityChip(selectedFault.severity)}
                      <Chip label={getCategoryLabel(selectedFault.category)} color="primary" size="small" />
                      {getStatusChip(selectedFault.status)}
                      {selectedFault.canRide === true ? (
                        <Chip icon={<CheckCircle />} label="ניתן לרכב" color="success" size="small" />
                      ) : selectedFault.canRide === false ? (
                        <Chip icon={<Cancel />} label="לא ניתן לרכב" color="error" size="small" />
                      ) : null}
                    </Box>
                    <Typography variant="subtitle1" fontWeight="500" gutterBottom>
                      {selectedFault.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {selectedFault.description}
                    </Typography>

                    {selectedFault.location && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2">מיקום:</Typography>
                        <Typography variant="body2">{selectedFault.location}</Typography>
                      </>
                    )}

                    {selectedFault.currentKm && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2">קילומטראז':</Typography>
                        <Typography variant="body2">{selectedFault.currentKm.toLocaleString()} ק"מ</Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {selectedFault.canRide === false && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography variant="body2" fontWeight="500">
                      <ErrorOutline sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      שים לב: דווח שלא ניתן לרכב על כלי זה!
                    </Typography>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>פעולות זמינות:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedFault.status === 'open' && (
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        startIcon={<Build />}
                        onClick={() => {
                          handleUpdateStatus(selectedFault._id || selectedFault.id, 'in_progress');
                          setDetailsDialogOpen(false);
                        }}
                      >
                        העבר לטיפול
                      </Button>
                    )}
                    {selectedFault.status === 'in_progress' && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => {
                          handleUpdateStatus(selectedFault._id || selectedFault.id, 'resolved');
                          setDetailsDialogOpen(false);
                        }}
                      >
                        סמן כנפתר
                      </Button>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>סגור</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
