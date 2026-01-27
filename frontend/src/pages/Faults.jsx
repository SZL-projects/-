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

  // מיפויי סטטוסים וחומרות - עם צבעים מודרניים
  const statusMap = useMemo(() => ({
    open: { label: 'פתוחה', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <Warning sx={{ fontSize: 16 }} /> },
    in_progress: { label: 'בטיפול', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <Build sx={{ fontSize: 16 }} /> },
    resolved: { label: 'נפתרה', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    closed: { label: 'סגורה', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
  }), []);

  const severityMap = useMemo(() => ({
    critical: { label: 'קריטית', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    high: { label: 'גבוהה', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    medium: { label: 'בינונית', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    low: { label: 'נמוכה', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
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
    const { label, bgcolor, color, icon } = statusMap[status] || { label: status, bgcolor: '#f1f5f9', color: '#64748b', icon: null };
    return (
      <Chip
        label={label}
        size="small"
        icon={icon}
        sx={{
          bgcolor,
          color,
          fontWeight: 600,
          fontSize: '0.75rem',
          border: 'none',
          '& .MuiChip-label': { px: 1 },
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />
    );
  }, [statusMap]);

  const getSeverityChip = useCallback((severity) => {
    const { label, bgcolor, color } = severityMap[severity] || { label: severity, bgcolor: '#f1f5f9', color: '#64748b' };
    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor,
          color,
          fontWeight: 600,
          fontSize: '0.75rem',
          border: 'none',
          '& .MuiChip-label': { px: 1.5 },
        }}
      />
    );
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
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Modern Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
          }}>
            <Warning sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              ניהול תקלות
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              ניהול ומעקב אחר תקלות בכלים
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
          disabled={loading}
          sx={{
            borderRadius: '12px',
            borderColor: '#e2e8f0',
            color: '#64748b',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#6366f1',
              color: '#6366f1',
              bgcolor: 'rgba(99, 102, 241, 0.04)',
            },
          }}
        >
          רענן
        </Button>
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

      {/* Modern Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>סה"כ</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(239,68,68,0.2)', borderColor: '#ef4444' },
            }}
            onClick={() => setViewMode(1)}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>פתוחות</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {stats.open}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>בטיפול</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {stats.inProgress}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>נפתרו</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {stats.resolved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(239,68,68,0.2)', borderColor: '#ef4444' },
            }}
            onClick={() => setViewMode(2)}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>קריטיות</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {stats.critical}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>לא ניתן לרכב</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {stats.cannotRide}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modern Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={viewMode}
          onChange={(e, v) => setViewMode(v)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              color: '#64748b',
              '&.Mui-selected': {
                color: '#6366f1',
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#6366f1',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label="כל התקלות" />
          <Tab
            label={
              <Badge
                badgeContent={stats.open + stats.inProgress}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                  }
                }}
              >
                תקלות פתוחות
              </Badge>
            }
          />
          <Tab
            label={
              <Badge
                badgeContent={stats.critical}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                  }
                }}
              >
                תקלות קריטיות
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Modern Filter Section */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="סטטוס"
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
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
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
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
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="yes">כן</MenuItem>
                <MenuItem value="no">לא</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Modern Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>כלי</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>כותרת</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>קטגוריה</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>חומרה</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>ניתן לרכב?</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>סטטוס</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>תאריך דיווח</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', py: 2 }}>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress sx={{ color: '#6366f1' }} />
                </TableCell>
              </TableRow>
            ) : filteredFaults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box sx={{ py: 6 }}>
                    <Box sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 3,
                    }}>
                      <Warning sx={{ fontSize: 40, color: '#6366f1' }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
                      לא נמצאו תקלות
                    </Typography>
                    <Typography sx={{ color: '#64748b' }}>
                      אין תקלות התואמות לחיפוש
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredFaults.map((fault, index) => (
                <TableRow
                  key={fault._id || fault.id}
                  sx={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.03}s both`,
                    bgcolor: fault.canRide === false ? 'rgba(239, 68, 68, 0.04)' : 'inherit',
                    '&:hover': {
                      bgcolor: fault.canRide === false ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.04)',
                    },
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {fault.vehicleLicensePlate || fault.vehicleNumber || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                      {fault.title || fault.description?.substring(0, 50) || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(fault.category)}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        border: 'none',
                      }}
                    />
                  </TableCell>
                  <TableCell>{getSeverityChip(fault.severity)}</TableCell>
                  <TableCell>
                    {fault.canRide === true ? (
                      <Chip
                        icon={<CheckCircle sx={{ fontSize: 16 }} />}
                        label="כן"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                    ) : fault.canRide === false ? (
                      <Chip
                        icon={<Cancel sx={{ fontSize: 16 }} />}
                        label="לא"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                    ) : (
                      <Chip
                        label="לא ידוע"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(100, 116, 139, 0.1)',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{getStatusChip(fault.status)}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>
                    {formatDate(fault.reportedDate || fault.createdAt)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(fault)}
                      sx={{
                        color: '#6366f1',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                      }}
                    >
                      <Visibility />
                    </IconButton>
                    {fault.status === 'open' && (
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateStatus(fault._id || fault.id, 'in_progress')}
                        title="העבר לטיפול"
                        sx={{
                          color: '#f59e0b',
                          '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.08)' },
                        }}
                      >
                        <Build />
                      </IconButton>
                    )}
                    {fault.status === 'in_progress' && (
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateStatus(fault._id || fault.id, 'resolved')}
                        title="סמן כנפתר"
                        sx={{
                          color: '#10b981',
                          '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.08)' },
                        }}
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
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            מציג {filteredFaults.length} מתוך {faults.length} תקלות
          </Typography>
        </Box>
      )}

      {/* Modern Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Warning sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              פרטי תקלה
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFault && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>כלי</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedFault.vehicleLicensePlate || selectedFault.vehicleNumber}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>תאריך דיווח</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {formatDate(selectedFault.reportedDate || selectedFault.createdAt)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: selectedFault.canRide === false ? 'rgba(239, 68, 68, 0.3)' : '#e2e8f0',
                    bgcolor: selectedFault.canRide === false ? 'rgba(239, 68, 68, 0.04)' : '#fff',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>פרטי תקלה</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                      {getSeverityChip(selectedFault.severity)}
                      <Chip
                        label={getCategoryLabel(selectedFault.category)}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          fontWeight: 600,
                        }}
                      />
                      {getStatusChip(selectedFault.status)}
                      {selectedFault.canRide === true ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          label="ניתן לרכב"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(16, 185, 129, 0.1)',
                            color: '#059669',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      ) : selectedFault.canRide === false ? (
                        <Chip
                          icon={<Cancel sx={{ fontSize: 16 }} />}
                          label="לא ניתן לרכב"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            color: '#dc2626',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      ) : null}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                      {selectedFault.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                      {selectedFault.description}
                    </Typography>

                    {selectedFault.location && (
                      <>
                        <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>מיקום:</Typography>
                        <Typography variant="body2" sx={{ color: '#1e293b' }}>{selectedFault.location}</Typography>
                      </>
                    )}

                    {selectedFault.currentKm && (
                      <>
                        <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>קילומטראז':</Typography>
                        <Typography variant="body2" sx={{ color: '#1e293b' }}>{selectedFault.currentKm.toLocaleString()} ק"מ</Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {selectedFault.canRide === false && (
                <Grid item xs={12}>
                  <Alert
                    severity="error"
                    sx={{
                      borderRadius: '12px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      <ErrorOutline sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 18 }} />
                      שים לב: דווח שלא ניתן לרכב על כלי זה!
                    </Typography>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ borderColor: '#e2e8f0' }} />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, mb: 1.5 }}>פעולות זמינות:</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {selectedFault.status === 'open' && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Build />}
                        onClick={() => {
                          handleUpdateStatus(selectedFault._id || selectedFault.id, 'in_progress');
                          setDetailsDialogOpen(false);
                        }}
                        sx={{
                          bgcolor: '#f59e0b',
                          borderRadius: '10px',
                          fontWeight: 600,
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                          '&:hover': {
                            bgcolor: '#d97706',
                            boxShadow: '0 6px 16px rgba(245, 158, 11, 0.4)',
                          },
                        }}
                      >
                        העבר לטיפול
                      </Button>
                    )}
                    {selectedFault.status === 'in_progress' && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => {
                          handleUpdateStatus(selectedFault._id || selectedFault.id, 'resolved');
                          setDetailsDialogOpen(false);
                        }}
                        sx={{
                          bgcolor: '#10b981',
                          borderRadius: '10px',
                          fontWeight: 600,
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          '&:hover': {
                            bgcolor: '#059669',
                            boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)',
                          },
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDetailsDialogOpen(false)}
            sx={{
              color: '#64748b',
              fontWeight: 600,
              borderRadius: '10px',
              px: 3,
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
