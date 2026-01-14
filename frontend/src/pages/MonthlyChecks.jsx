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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Snackbar,
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
} from '@mui/icons-material';
import { monthlyChecksAPI, ridersAPI, vehiclesAPI } from '../services/api';

export default function MonthlyChecks() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState([]);
  const [riders, setRiders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRider, setFilterRider] = useState('all');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(0); // 0: כל הבקרות, 1: רוכבים ללא בקרה
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [sendingNotification, setSendingNotification] = useState(null); // ID של בקרה ששולחים לה הודעה
  const [openChecksDialogOpen, setOpenChecksDialogOpen] = useState(false);
  const [selectedRiders, setSelectedRiders] = useState([]);
  const [openingChecks, setOpeningChecks] = useState(false);

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

      setChecks(checksRes.data.checks || checksRes.data.monthlyChecks || []);
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
      const checkDate = check.checkDate?.toDate ? check.checkDate.toDate() : new Date(check.checkDate);
      return checkDate >= firstDayOfMonth;
    });

    // חישוב רוכבים פעילים ללא בקרה החודש
    const activeRiders = riders.filter(r => r.riderStatus === 'active' || r.status === 'active');
    const ridersWithCheckThisMonth = new Set(
      thisMonthChecks.map(check => check.riderId || check.riderName)
    );
    const ridersWithoutCheck = activeRiders.filter(
      rider => !ridersWithCheckThisMonth.has(rider._id || rider.id)
    );

    return {
      total: checks.length,
      thisMonth: thisMonthChecks.length,
      pending: checks.filter(c => c.status === 'pending').length,
      completed: checks.filter(c => c.status === 'completed' || c.status === 'passed').length,
      ridersWithoutCheck: ridersWithoutCheck.length,
    };
  }, [checks, riders]);

  // אופטימיזציה: חישוב רוכבים ללא בקרה עם useMemo
  const ridersWithoutCheck = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthChecks = checks.filter(check => {
      const checkDate = check.checkDate?.toDate ? check.checkDate.toDate() : new Date(check.checkDate);
      return checkDate >= firstDayOfMonth;
    });

    const activeRiders = riders.filter(r => r.riderStatus === 'active' || r.status === 'active');
    const ridersWithCheckThisMonth = new Set(
      thisMonthChecks.map(check => check.riderId || check.riderName)
    );

    return activeRiders.filter(
      rider => !ridersWithCheckThisMonth.has(rider._id || rider.id)
    ).map(rider => {
      // מציאת הבקרה האחרונה של הרוכב
      const riderChecks = checks.filter(c =>
        (c.riderId === rider._id || c.riderId === rider.id)
      ).sort((a, b) => {
        const dateA = a.checkDate?.toDate ? a.checkDate.toDate() : new Date(a.checkDate);
        const dateB = b.checkDate?.toDate ? b.checkDate.toDate() : new Date(b.checkDate);
        return dateB - dateA;
      });

      const lastCheck = riderChecks[0];
      const lastCheckDate = lastCheck
        ? (lastCheck.checkDate?.toDate ? lastCheck.checkDate.toDate() : new Date(lastCheck.checkDate))
        : null;

      let daysSinceLastCheck = null;
      if (lastCheckDate) {
        daysSinceLastCheck = Math.floor((now - lastCheckDate) / (1000 * 60 * 60 * 24));
      }

      // מציאת הכלי המשויך לרוכב
      const assignedVehicle = vehicles.find(v => v.assignedTo === (rider._id || rider.id));

      return {
        ...rider,
        lastCheckDate,
        daysSinceLastCheck,
        assignedVehicle, // הכלי המשויך
      };
    });
  }, [checks, riders, vehicles]);

  const getColorByDays = (days) => {
    if (!days) return 'default';
    if (days <= 5) return 'success';
    if (days <= 10) return 'warning';
    return 'error';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  const getStatusChip = (status) => {
    const statusMap = {
      completed: { label: 'הושלם', color: 'success', icon: <CheckCircle /> },
      passed: { label: 'עבר', color: 'success', icon: <CheckCircle /> },
      pending: { label: 'ממתין', color: 'warning', icon: <Warning /> },
      failed: { label: 'נכשל', color: 'error', icon: <ErrorOutline /> },
    };

    const { label, color, icon } = statusMap[status] || { label: status, color: 'default', icon: null };
    return <Chip label={label} color={color} size="small" icon={icon} />;
  };

  const handleViewDetails = useCallback((check) => {
    setSelectedCheck(check);
    setDetailsDialogOpen(true);
  }, []);

  const handleSendNotification = useCallback(async (checkId) => {
    try {
      setSendingNotification(checkId);
      await monthlyChecksAPI.sendNotification(checkId);
      setSnackbar({ open: true, message: 'הודעה נשלחה בהצלחה לרוכב', severity: 'success' });
      await loadData(); // רענון הנתונים
    } catch (error) {
      console.error('Error sending notification:', error);
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
        isEligible: !!assignedVehicle // רק רוכבים עם כלי משויך
      };
    }).filter(r => r.isEligible);
  }, [riders, vehicles]);

  const handleOpenChecksDialog = useCallback(() => {
    setSelectedRiders(eligibleRiders.map(r => r._id || r.id)); // בחירת כולם כברירת מחדל
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

  const handleOpenChecks = useCallback(async () => {
    if (selectedRiders.length === 0) {
      setSnackbar({ open: true, message: 'נא לבחור לפחות רוכב אחד', severity: 'warning' });
      return;
    }

    setOpeningChecks(true);
    try {
      const response = await monthlyChecksAPI.create({
        riderIds: selectedRiders,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });

      setSnackbar({
        open: true,
        message: `${selectedRiders.length} בקרות חודשיות נפתחו בהצלחה`,
        severity: 'success'
      });

      setOpenChecksDialogOpen(false);
      setSelectedRiders([]);
      await loadData();
    } catch (error) {
      console.error('Error opening checks:', error);
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

      const matchesStatus = filterStatus === 'all' || check.status === filterStatus;
      const matchesRider = filterRider === 'all' || check.riderId === filterRider;

      return matchesSearch && matchesStatus && matchesRider;
    });
  }, [checks, searchTerm, filterStatus, filterRider]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Build /> בקרה חודשית
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ניהול ומעקב אחר בקרות חודשיות
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddTask />}
            onClick={handleOpenChecksDialog}
          >
            פתח בקרות חודשיות
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={sendingNotification === 'all' ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={handleSendToAll}
            disabled={sendingNotification === 'all' || stats.pending === 0}
          >
            <Badge badgeContent={stats.pending} color="error">
              שלח הודעה לכל הממתינים
            </Badge>
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            רענן
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* סטטיסטיקות */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">סה"כ בקרות</Typography>
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">החודש</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats.thisMonth}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">הושלמו</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">ממתינים</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card
            sx={{
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => setViewMode(1)}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">ללא בקרה</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.ridersWithoutCheck}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={viewMode} onChange={(e, v) => setViewMode(v)}>
          <Tab label="כל הבקרות" />
          <Tab
            label={
              <Badge badgeContent={stats.ridersWithoutCheck} color="error">
                רוכבים ללא בקרה
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {viewMode === 0 ? (
        <>
          {/* סינון וחיפוש */}
          <Paper sx={{ p: 2, mb: 3 }}>
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
                        <Search />
                      </InputAdornment>
                    ),
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
                  >
                    <MenuItem value="all">הכל</MenuItem>
                    <MenuItem value="completed">הושלם</MenuItem>
                    <MenuItem value="passed">עבר</MenuItem>
                    <MenuItem value="pending">ממתין</MenuItem>
                    <MenuItem value="failed">נכשל</MenuItem>
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

          {/* טבלת בקרות */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>מספר רישוי</TableCell>
                  <TableCell>רוכב</TableCell>
                  <TableCell>תאריך בקרה</TableCell>
                  <TableCell>ק"מ</TableCell>
                  <TableCell>שמן</TableCell>
                  <TableCell>צמיגים</TableCell>
                  <TableCell>סטטוס</TableCell>
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
                ) : filteredChecks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box sx={{ py: 4 }}>
                        <Build sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography color="textSecondary">
                          לא נמצאו בקרות
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChecks.map((check) => (
                    <TableRow key={check._id || check.id} hover>
                      <TableCell>
                        <Typography variant="body1" fontWeight="500">
                          {check.vehicleLicensePlate || check.vehiclePlate || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{check.riderName || '-'}</TableCell>
                      <TableCell>{formatDate(check.checkDate)}</TableCell>
                      <TableCell>
                        {check.currentKm?.toLocaleString('he-IL') ||
                         check.kilometers?.toLocaleString('he-IL') || '0'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={check.checkResults?.oilCheck === 'ok' ? 'תקין' :
                                check.checkResults?.oilCheck === 'low' ? 'נמוך' : '-'}
                          color={check.checkResults?.oilCheck === 'ok' ? 'success' :
                                check.checkResults?.oilCheck === 'low' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {check.checkResults?.tirePressureFront && check.checkResults?.tirePressureRear ? (
                          <Typography variant="caption">
                            {check.checkResults.tirePressureFront}/{check.checkResults.tirePressureRear}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusChip(check.status)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleViewDetails(check)}
                          title="צפה בפרטים"
                        >
                          <Visibility />
                        </IconButton>
                        {check.status === 'pending' && (
                          <IconButton
                            color="secondary"
                            size="small"
                            onClick={() => handleSendNotification(check._id || check.id)}
                            disabled={sendingNotification === (check._id || check.id)}
                            title="שלח הודעה לרוכב"
                          >
                            {sendingNotification === (check._id || check.id) ? (
                              <CircularProgress size={20} />
                            ) : (
                              <SendIcon />
                            )}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!loading && filteredChecks.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                מציג {filteredChecks.length} מתוך {checks.length} בקרות
              </Typography>
            </Box>
          )}
        </>
      ) : (
        /* רוכבים ללא בקרה */
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" /> רוכבים שלא ביצעו בקרה החודש
          </Typography>
          <Divider sx={{ my: 2 }} />

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : ridersWithoutCheck.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="success.main">
                כל הרוכבים ביצעו בקרה החודש!
              </Typography>
            </Box>
          ) : (
            <List>
              {ridersWithoutCheck.map((rider) => (
                <ListItem
                  key={rider._id || rider.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: rider.daysSinceLastCheck > 10 ? 'error.light' :
                             rider.daysSinceLastCheck > 5 ? 'warning.light' : 'background.paper',
                  }}
                >
                  <ListItemIcon>
                    <Person color={getColorByDays(rider.daysSinceLastCheck)} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="500">
                          {rider.firstName} {rider.lastName}
                        </Typography>
                        {rider.daysSinceLastCheck !== null && (
                          <Chip
                            label={`${rider.daysSinceLastCheck} ימים מאז בקרה`}
                            color={getColorByDays(rider.daysSinceLastCheck)}
                            size="small"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {rider.assignedVehicle ?
                            `כלי: ${rider.assignedVehicle.licensePlate} (${rider.assignedVehicle.manufacturer} ${rider.assignedVehicle.model})` :
                            'ללא כלי משויך'}
                        </Typography>
                        {rider.lastCheckDate && (
                          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                            • בקרה אחרונה: {formatDate(rider.lastCheckDate)}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
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
            <Build /> פרטי בקרה חודשית
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedCheck && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">מספר רישוי</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {selectedCheck.vehicleLicensePlate || selectedCheck.vehiclePlate}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">רוכב</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {selectedCheck.riderName || 'לא ידוע'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">תאריך בדיקה</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {formatDate(selectedCheck.checkDate)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">קילומטראז'</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {(selectedCheck.currentKm || selectedCheck.kilometers || 0).toLocaleString('he-IL')} ק"מ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {selectedCheck.checkResults && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>תוצאות בדיקות</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip label={`שמן: ${selectedCheck.checkResults.oilCheck === 'ok' ? 'תקין' : selectedCheck.checkResults.oilCheck === 'low' ? 'נמוך' : 'לא ניתן לבדוק'}`}
                            color={selectedCheck.checkResults.oilCheck === 'ok' ? 'success' : 'warning'} />
                      {selectedCheck.checkResults.waterCheck && (
                        <Chip label={`מים: ${selectedCheck.checkResults.waterCheck === 'ok' ? 'תקין' : selectedCheck.checkResults.waterCheck === 'low' ? 'נמוך' : 'לא ניתן לבדוק'}`}
                              color={selectedCheck.checkResults.waterCheck === 'ok' ? 'success' : 'warning'} />
                      )}
                      {selectedCheck.checkResults.tirePressureFront && (
                        <Chip label={`צמיג קדמי: ${selectedCheck.checkResults.tirePressureFront} PSI`} />
                      )}
                      {selectedCheck.checkResults.tirePressureRear && (
                        <Chip label={`צמיג אחורי: ${selectedCheck.checkResults.tirePressureRear} PSI`} />
                      )}
                      {selectedCheck.checkResults.brakesCondition && (
                        <Chip label={`בלמים: ${selectedCheck.checkResults.brakesCondition === 'good' ? 'תקין' : selectedCheck.checkResults.brakesCondition === 'fair' ? 'בינוני' : 'לא תקין'}`}
                              color={selectedCheck.checkResults.brakesCondition === 'good' ? 'success' : selectedCheck.checkResults.brakesCondition === 'fair' ? 'warning' : 'error'} />
                      )}
                      {selectedCheck.checkResults.lightsCondition && (
                        <Chip label={`פנסים: ${selectedCheck.checkResults.lightsCondition === 'good' ? 'תקין' : selectedCheck.checkResults.lightsCondition === 'fair' ? 'בינוני' : 'לא תקין'}`}
                              color={selectedCheck.checkResults.lightsCondition === 'good' ? 'success' : selectedCheck.checkResults.lightsCondition === 'fair' ? 'warning' : 'error'} />
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
                      <Typography variant="subtitle2" color="error">בעיות שנמצאו:</Typography>
                      <Typography variant="body2">{selectedCheck.issues}</Typography>
                    </Grid>
                  )}
                  {selectedCheck.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">הערות:</Typography>
                      <Typography variant="body2">{selectedCheck.notes}</Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>סגור</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog לפתיחת בקרות חודשיות */}
      <Dialog
        open={openChecksDialogOpen}
        onClose={() => setOpenChecksDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddTask /> פתיחת בקרות חודשיות
          </Typography>
          <Typography variant="body2" color="textSecondary">
            בחר רוכבים לפתיחת בקרה חודשית - {new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1" fontWeight="500">
                נבחרו {selectedRiders.length} מתוך {eligibleRiders.length} רוכבים
              </Typography>
              <Button
                size="small"
                onClick={handleToggleAll}
                startIcon={<CheckCircle />}
              >
                {selectedRiders.length === eligibleRiders.length ? 'בטל הכל' : 'בחר הכל'}
              </Button>
            </Box>

            {eligibleRiders.length === 0 ? (
              <Alert severity="info">
                אין רוכבים פעילים עם כלי משויך
              </Alert>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {eligibleRiders.map((rider) => (
                  <ListItem
                    key={rider._id || rider.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: selectedRiders.includes(rider._id || rider.id) ? 'action.selected' : 'background.paper'
                    }}
                    onClick={() => handleToggleRider(rider._id || rider.id)}
                  >
                    <ListItemIcon>
                      <input
                        type="checkbox"
                        checked={selectedRiders.includes(rider._id || rider.id)}
                        onChange={() => handleToggleRider(rider._id || rider.id)}
                        style={{ width: 20, height: 20, cursor: 'pointer' }}
                      />
                    </ListItemIcon>
                    <ListItemIcon>
                      <Person color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="500">
                          {rider.firstName} {rider.lastName}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            כלי: {rider.assignedVehicle?.licensePlate}
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                            • {rider.assignedVehicle?.manufacturer} {rider.assignedVehicle?.model}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenChecksDialogOpen(false)}>
            ביטול
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenChecks}
            disabled={openingChecks || selectedRiders.length === 0}
            startIcon={openingChecks ? <CircularProgress size={20} /> : <AddTask />}
          >
            {openingChecks ? 'פותח בקרות...' : `פתח ${selectedRiders.length} בקרות`}
          </Button>
        </DialogActions>
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
