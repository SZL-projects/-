import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Build,
  CheckCircle,
  Schedule,
  Cancel,
  Refresh,
  Add,
  AttachMoney,
  DirectionsCar,
  CompareArrows,
  Store,
} from '@mui/icons-material';
import { maintenanceAPI, vehiclesAPI, ridersAPI, garagesAPI } from '../services/api';
import MaintenanceDialog from '../components/MaintenanceDialog';

export default function Maintenance() {
  const [maintenances, setMaintenances] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [riders, setRiders] = useState([]);
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPaidBy, setFilterPaidBy] = useState('all');
  const [filterGarage, setFilterGarage] = useState('all');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(0); // 0: הכל, 1: בהמתנה, 2: הושלמו
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareData, setCompareData] = useState([]);
  const [compareType, setCompareType] = useState('all');
  const [loadingCompare, setLoadingCompare] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [maintenanceRes, vehiclesRes, ridersRes, garagesRes] = await Promise.all([
        maintenanceAPI.getAll().catch(() => ({ data: { maintenances: [] } })),
        vehiclesAPI.getAll().catch(() => ({ data: { vehicles: [] } })),
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
        garagesAPI.getAll().catch(() => ({ data: { garages: [] } })),
      ]);

      setMaintenances(maintenanceRes.data.maintenances || []);
      setVehicles(vehiclesRes.data.vehicles || []);
      setRiders(ridersRes.data.riders || []);
      setGarages(garagesRes.data.garages || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // סטטיסטיקות
  const stats = useMemo(() => {
    const result = {
      total: maintenances.length,
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalCost: 0,
    };

    for (const m of maintenances) {
      if (m.status === 'scheduled') result.scheduled++;
      else if (m.status === 'in_progress') result.inProgress++;
      else if (m.status === 'completed') result.completed++;
      else if (m.status === 'cancelled') result.cancelled++;

      result.totalCost += m.costs?.totalCost || 0;
    }

    return result;
  }, [maintenances]);

  const handleViewDetails = useCallback((maintenance) => {
    setSelectedMaintenance(maintenance);
    setDetailsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((maintenance) => {
    setEditingMaintenance(maintenance);
    setEditDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingMaintenance(null);
    setEditDialogOpen(true);
  }, []);

  const handleUpdateStatus = useCallback(async (maintenanceId, newStatus) => {
    try {
      await maintenanceAPI.update(maintenanceId, { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Error updating maintenance status:', err);
      setError('שגיאה בעדכון הסטטוס');
    }
  }, []);

  const handleComplete = useCallback(async (maintenanceId, costs) => {
    try {
      await maintenanceAPI.complete(maintenanceId, { costs });
      await loadData();
      setDetailsDialogOpen(false);
    } catch (err) {
      console.error('Error completing maintenance:', err);
      setError('שגיאה בסגירת הטיפול');
    }
  }, []);

  const loadCompareData = useCallback(async (maintenanceType = null) => {
    try {
      setLoadingCompare(true);
      const response = await garagesAPI.comparePrices(maintenanceType === 'all' ? null : maintenanceType);
      setCompareData(response.data.comparison || []);
    } catch (err) {
      console.error('Error loading comparison data:', err);
    } finally {
      setLoadingCompare(false);
    }
  }, []);

  const handleOpenCompare = useCallback(() => {
    setCompareDialogOpen(true);
    loadCompareData(compareType);
  }, [compareType, loadCompareData]);

  const handleCompareTypeChange = useCallback((newType) => {
    setCompareType(newType);
    loadCompareData(newType);
  }, [loadCompareData]);

  // פורמט תאריך
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }), []);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dateFormatter.format(date);
  }, [dateFormatter]);

  // פורמט מחיר
  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  // מיפויים
  const statusMap = useMemo(() => ({
    scheduled: { label: 'מתוכנן', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', icon: <Schedule sx={{ fontSize: 16 }} /> },
    in_progress: { label: 'בביצוע', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <Build sx={{ fontSize: 16 }} /> },
    completed: { label: 'הושלם', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    cancelled: { label: 'בוטל', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b', icon: <Cancel sx={{ fontSize: 16 }} /> },
  }), []);

  const typeMap = useMemo(() => ({
    routine: { label: 'טיפול תקופתי', color: '#2563eb' },
    repair: { label: 'תיקון', color: '#d97706' },
    emergency: { label: 'חירום', color: '#dc2626' },
    recall: { label: 'ריקול', color: '#7c3aed' },
    accident_repair: { label: 'תיקון תאונה', color: '#dc2626' },
    other: { label: 'אחר', color: '#64748b' },
  }), []);

  const paidByMap = useMemo(() => ({
    unit: 'היחידה',
    rider: 'הרוכב',
    insurance: 'ביטוח',
    warranty: 'אחריות',
    shared: 'משותף',
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

  const getTypeChip = useCallback((type) => {
    const { label, color } = typeMap[type] || { label: type, color: '#64748b' };
    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: `${color}15`,
          color,
          fontWeight: 600,
          fontSize: '0.75rem',
          border: 'none',
          '& .MuiChip-label': { px: 1.5 },
        }}
      />
    );
  }, [typeMap]);

  // סינון
  const filteredMaintenances = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return maintenances.filter(m => {
      const matchesSearch = !searchTerm ||
        m.maintenanceNumber?.toLowerCase().includes(searchLower) ||
        m.vehiclePlate?.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower) ||
        m.garage?.name?.toLowerCase().includes(searchLower);

      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchesType = filterType === 'all' || m.maintenanceType === filterType;
      const matchesPaidBy = filterPaidBy === 'all' || m.paidBy === filterPaidBy;
      const matchesGarage = filterGarage === 'all' || m.garage?.id === filterGarage || m.garage?.name === filterGarage;

      // סינון לפי טאב
      let matchesTab = true;
      if (viewMode === 1) { // בהמתנה
        matchesTab = m.status === 'scheduled' || m.status === 'in_progress';
      } else if (viewMode === 2) { // הושלמו
        matchesTab = m.status === 'completed';
      }

      return matchesSearch && matchesStatus && matchesType && matchesPaidBy && matchesGarage && matchesTab;
    });
  }, [maintenances, searchTerm, filterStatus, filterType, filterPaidBy, filterGarage, viewMode]);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
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
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              ניהול טיפולים
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              מעקב אחר טיפולים ותחזוקה של הכלים
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
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
          <Button
            variant="outlined"
            startIcon={<CompareArrows />}
            onClick={handleOpenCompare}
            sx={{
              borderRadius: '12px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#10b981',
                color: '#10b981',
                bgcolor: 'rgba(16, 185, 129, 0.04)',
              },
            }}
          >
            השוואת מחירים
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              borderRadius: '12px',
              bgcolor: '#6366f1',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                bgcolor: '#4f46e5',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
              },
            }}
          >
            טיפול חדש
          </Button>
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

      {/* Stats Cards */}
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
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(59,130,246,0.2)', borderColor: '#3b82f6' },
            }}
            onClick={() => setViewMode(1)}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>מתוכננים</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {stats.scheduled}
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
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>בביצוע</Typography>
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
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(16,185,129,0.2)', borderColor: '#10b981' },
            }}
            onClick={() => setViewMode(2)}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>הושלמו</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 1 }}>
                <AttachMoney sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                סה"כ עלויות
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#6366f1' }}>
                {formatCurrency(stats.totalCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
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
          <Tab label="כל הטיפולים" />
          <Tab
            label={
              <Badge
                badgeContent={stats.scheduled + stats.inProgress}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#3b82f6',
                    color: '#fff',
                    fontWeight: 600,
                  }
                }}
              >
                בהמתנה / בביצוע
              </Badge>
            }
          />
          <Tab
            label={
              <Badge
                badgeContent={stats.completed}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#10b981',
                    color: '#fff',
                    fontWeight: 600,
                  }
                }}
              >
                הושלמו
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Filters */}
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
              placeholder="חפש לפי מספר טיפול, כלי, מוסך..."
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
                <MenuItem value="scheduled">מתוכנן</MenuItem>
                <MenuItem value="in_progress">בביצוע</MenuItem>
                <MenuItem value="completed">הושלם</MenuItem>
                <MenuItem value="cancelled">בוטל</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>סוג טיפול</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="סוג טיפול"
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="routine">טיפול תקופתי</MenuItem>
                <MenuItem value="repair">תיקון</MenuItem>
                <MenuItem value="emergency">חירום</MenuItem>
                <MenuItem value="recall">ריקול</MenuItem>
                <MenuItem value="accident_repair">תיקון תאונה</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>מי שילם?</InputLabel>
              <Select
                value={filterPaidBy}
                onChange={(e) => setFilterPaidBy(e.target.value)}
                label="מי שילם?"
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="unit">היחידה</MenuItem>
                <MenuItem value="rider">הרוכב</MenuItem>
                <MenuItem value="insurance">ביטוח</MenuItem>
                <MenuItem value="warranty">אחריות</MenuItem>
                <MenuItem value="shared">משותף</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>מוסך</InputLabel>
              <Select
                value={filterGarage}
                onChange={(e) => setFilterGarage(e.target.value)}
                label="מוסך"
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                }}
              >
                <MenuItem value="all">כל המוסכים</MenuItem>
                {garages.map(garage => (
                  <MenuItem key={garage.id} value={garage.id}>
                    {garage.name}{garage.city ? ` - ${garage.city}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
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
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>מס' טיפול</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>כלי</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>סוג</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>תיאור</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>מוסך</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>עלות</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>סטטוס</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>תאריך</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', py: 2 }}>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress sx={{ color: '#6366f1' }} />
                </TableCell>
              </TableRow>
            ) : filteredMaintenances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
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
                      <Build sx={{ fontSize: 40, color: '#6366f1' }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
                      לא נמצאו טיפולים
                    </Typography>
                    <Typography sx={{ color: '#64748b' }}>
                      אין טיפולים התואמים לחיפוש
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredMaintenances.map((maintenance, index) => (
                <TableRow
                  key={maintenance.id}
                  sx={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.03}s both`,
                    '&:hover': {
                      bgcolor: 'rgba(99, 102, 241, 0.04)',
                    },
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>
                      {maintenance.maintenanceNumber || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {maintenance.vehiclePlate || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getTypeChip(maintenance.maintenanceType)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {maintenance.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#1e293b' }}>
                      {maintenance.garage?.name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: maintenance.costs?.totalCost > 0 ? '#1e293b' : '#64748b' }}>
                      {formatCurrency(maintenance.costs?.totalCost)}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(maintenance.status)}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>
                    {formatDate(maintenance.maintenanceDate)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(maintenance)}
                      sx={{
                        color: '#6366f1',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                      }}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(maintenance)}
                      sx={{
                        color: '#64748b',
                        '&:hover': { bgcolor: 'rgba(100, 116, 139, 0.08)' },
                      }}
                    >
                      <Edit />
                    </IconButton>
                    {maintenance.status === 'scheduled' && (
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateStatus(maintenance.id, 'in_progress')}
                        title="התחל טיפול"
                        sx={{
                          color: '#f59e0b',
                          '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.08)' },
                        }}
                      >
                        <Build />
                      </IconButton>
                    )}
                    {maintenance.status === 'in_progress' && (
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(maintenance)}
                        title="סגור טיפול"
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

      {!loading && filteredMaintenances.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            מציג {filteredMaintenances.length} מתוך {maintenances.length} טיפולים
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
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Build sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              פרטי טיפול - {selectedMaintenance?.maintenanceNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMaintenance && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>כלי</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedMaintenance.vehiclePlate}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>תאריך טיפול</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {formatDate(selectedMaintenance.maintenanceDate)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>ק"מ בטיפול</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedMaintenance.kilometersAtMaintenance?.toLocaleString() || '-'} ק"מ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>מוסך</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedMaintenance.garage?.name || '-'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {getTypeChip(selectedMaintenance.maintenanceType)}
                      {getStatusChip(selectedMaintenance.status)}
                      <Chip
                        label={paidByMap[selectedMaintenance.paidBy] || selectedMaintenance.paidBy}
                        size="small"
                        sx={{ bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b', fontWeight: 600 }}
                      />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>תיאור</Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7, mb: 2 }}>
                      {selectedMaintenance.description}
                    </Typography>

                    <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />

                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>עלויות</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>עבודה</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(selectedMaintenance.costs?.laborCost)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>חלקים</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(selectedMaintenance.costs?.partsCost)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>אחר</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(selectedMaintenance.costs?.otherCosts)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600 }}>סה"כ</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(selectedMaintenance.costs?.totalCost)}</Typography>
                      </Grid>
                    </Grid>

                    {selectedMaintenance.replacedParts?.length > 0 && (
                      <>
                        <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>חלקים שהוחלפו</Typography>
                        {selectedMaintenance.replacedParts.map((part, i) => (
                          <Typography key={i} variant="body2" sx={{ color: '#64748b' }}>
                            • {part.partName} (x{part.quantity}) - {formatCurrency(part.cost)}
                          </Typography>
                        ))}
                      </>
                    )}

                    {selectedMaintenance.notes && (
                      <>
                        <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>הערות</Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>{selectedMaintenance.notes}</Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {selectedMaintenance.status !== 'completed' && selectedMaintenance.status !== 'cancelled' && (
                <Grid item xs={12}>
                  <Divider sx={{ borderColor: '#e2e8f0' }} />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, mb: 1.5 }}>פעולות:</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      {selectedMaintenance.status === 'scheduled' && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Build />}
                          onClick={() => {
                            handleUpdateStatus(selectedMaintenance.id, 'in_progress');
                            setDetailsDialogOpen(false);
                          }}
                          sx={{
                            bgcolor: '#f59e0b',
                            borderRadius: '10px',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                            '&:hover': { bgcolor: '#d97706' },
                          }}
                        >
                          התחל טיפול
                        </Button>
                      )}
                      {selectedMaintenance.status === 'in_progress' && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => handleEdit(selectedMaintenance)}
                          sx={{
                            bgcolor: '#10b981',
                            borderRadius: '10px',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            '&:hover': { bgcolor: '#059669' },
                          }}
                        >
                          סגור טיפול
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}
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

      {/* Edit/Add Dialog */}
      <MaintenanceDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingMaintenance(null);
        }}
        maintenance={editingMaintenance}
        vehicles={vehicles}
        riders={riders}
        onSave={async () => {
          await loadData();
          setEditDialogOpen(false);
          setEditingMaintenance(null);
        }}
      />

      {/* Compare Prices Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CompareArrows sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              השוואת מחירים בין מוסכים
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>סוג טיפול</InputLabel>
              <Select
                value={compareType}
                onChange={(e) => handleCompareTypeChange(e.target.value)}
                label="סוג טיפול"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="all">כל הסוגים</MenuItem>
                <MenuItem value="routine">טיפול תקופתי</MenuItem>
                <MenuItem value="repair">תיקון</MenuItem>
                <MenuItem value="emergency">חירום</MenuItem>
                <MenuItem value="recall">ריקול</MenuItem>
                <MenuItem value="accident_repair">תיקון תאונה</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loadingCompare ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#10b981' }} />
            </Box>
          ) : compareData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Store sx={{ fontSize: 60, color: '#94a3b8', mb: 2 }} />
              <Typography sx={{ color: '#64748b' }}>
                אין נתונים להשוואה עבור סוג הטיפול שנבחר
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>מוסך</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>מספר טיפולים</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>מחיר ממוצע</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>מחיר מינימום</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>מחיר מקסימום</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>סה"כ הוצאות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compareData.map((garage, index) => (
                    <TableRow
                      key={garage.garageId}
                      sx={{
                        bgcolor: index === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
                      }}
                    >
                      <TableCell>
                        {index === 0 ? (
                          <Chip
                            label="1"
                            size="small"
                            sx={{
                              bgcolor: '#10b981',
                              color: '#fff',
                              fontWeight: 700,
                              minWidth: 28,
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontWeight: 600, color: '#64748b', textAlign: 'center' }}>
                            {index + 1}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, color: index === 0 ? '#10b981' : '#1e293b' }}>
                          {garage.garageName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#64748b' }}>{garage.count}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, color: index === 0 ? '#10b981' : '#1e293b' }}>
                          {formatCurrency(garage.averageCost)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#64748b' }}>{formatCurrency(garage.minCost)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#64748b' }}>{formatCurrency(garage.maxCost)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, color: '#6366f1' }}>
                          {formatCurrency(garage.totalCost)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {compareData.length > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>
                💡 המוסך הזול ביותר: {compareData[0]?.garageName} - מחיר ממוצע {formatCurrency(compareData[0]?.averageCost)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCompareDialogOpen(false)}
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
