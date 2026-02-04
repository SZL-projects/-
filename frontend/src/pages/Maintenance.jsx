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
  useMediaQuery,
  useTheme,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
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
  Delete,
  Settings,
  ExpandMore,
  ExpandLess,
  FilterList,
} from '@mui/icons-material';
import { maintenanceAPI, vehiclesAPI, ridersAPI, garagesAPI, maintenanceTypesAPI } from '../services/api';
import MaintenanceDialog from '../components/MaintenanceDialog';
import { useAuth } from '../contexts/AuthContext';

export default function Maintenance() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.roles?.includes('super_admin');

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
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingMaintenance, setCompletingMaintenance] = useState(null);
  const [completeCosts, setCompleteCosts] = useState({ laborCost: 0, partsCost: 0, otherCosts: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState(null);
  const [garageManageOpen, setGarageManageOpen] = useState(false);
  const [editingGarage, setEditingGarage] = useState(null);
  const [garageFormData, setGarageFormData] = useState({ name: '', phone: '', address: '', city: '' });
  const [maintenanceTypesOpen, setMaintenanceTypesOpen] = useState(false);
  const [maintenanceTypesFromDB, setMaintenanceTypesFromDB] = useState([]);
  const [newTypeKey, setNewTypeKey] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#64748b');
  const [editingType, setEditingType] = useState(null);
  const [typeSaving, setTypeSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [maintenanceRes, vehiclesRes, ridersRes, garagesRes, typesRes] = await Promise.all([
        maintenanceAPI.getAll().catch(() => ({ data: { maintenances: [] } })),
        vehiclesAPI.getAll().catch(() => ({ data: { vehicles: [] } })),
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
        garagesAPI.getAll().catch(() => ({ data: { garages: [] } })),
        maintenanceTypesAPI.getAll().catch(() => ({ data: { types: [] } })),
      ]);

      setMaintenances(maintenanceRes.data.maintenances || []);
      setVehicles(vehiclesRes.data.vehicles || []);
      setRiders(ridersRes.data.riders || []);
      setGarages(garagesRes.data.garages || []);
      setMaintenanceTypesFromDB(typesRes.data.types || []);
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
      setCompleteDialogOpen(false);
      setCompletingMaintenance(null);
    } catch (err) {
      console.error('Error completing maintenance:', err);
      setError('שגיאה בסגירת הטיפול');
    }
  }, []);

  const handleOpenComplete = useCallback((maintenance) => {
    setCompletingMaintenance(maintenance);
    setCompleteCosts({
      laborCost: maintenance.costs?.laborCost || 0,
      partsCost: maintenance.costs?.partsCost || 0,
      otherCosts: maintenance.costs?.otherCosts || 0,
    });
    setCompleteDialogOpen(true);
  }, []);

  const handleSubmitComplete = useCallback(async () => {
    if (!completingMaintenance) return;
    const totalCost = (completeCosts.laborCost || 0) + (completeCosts.partsCost || 0) + (completeCosts.otherCosts || 0);
    await handleComplete(completingMaintenance.id, { ...completeCosts, totalCost });
  }, [completingMaintenance, completeCosts, handleComplete]);

  const handleDelete = useCallback(async () => {
    if (!deletingMaintenance) return;
    try {
      await maintenanceAPI.delete(deletingMaintenance.id);
      await loadData();
      setDeleteDialogOpen(false);
      setDeletingMaintenance(null);
    } catch (err) {
      console.error('Error deleting maintenance:', err);
      setError('שגיאה במחיקת הטיפול');
    }
  }, [deletingMaintenance]);

  const handleOpenDelete = useCallback((maintenance) => {
    setDeletingMaintenance(maintenance);
    setDeleteDialogOpen(true);
  }, []);

  // Garage management
  const handleSaveGarage = useCallback(async () => {
    try {
      if (editingGarage) {
        await garagesAPI.update(editingGarage.id, garageFormData);
      } else {
        await garagesAPI.create(garageFormData);
      }
      const response = await garagesAPI.getAll();
      setGarages(response.data.garages || []);
      setEditingGarage(null);
      setGarageFormData({ name: '', phone: '', address: '', city: '' });
    } catch (err) {
      console.error('Error saving garage:', err);
      setError('שגיאה בשמירת המוסך');
    }
  }, [editingGarage, garageFormData]);

  const handleEditGarage = useCallback((garage) => {
    setEditingGarage(garage);
    setGarageFormData({
      name: garage.name || '',
      phone: garage.phone || '',
      address: garage.address || '',
      city: garage.city || '',
    });
  }, []);

  const handleDeleteGarage = useCallback(async (garageId) => {
    try {
      await garagesAPI.delete(garageId);
      const response = await garagesAPI.getAll();
      setGarages(response.data.garages || []);
    } catch (err) {
      console.error('Error deleting garage:', err);
      setError('שגיאה במחיקת המוסך');
    }
  }, []);

  // Maintenance Types management
  const handleSaveType = useCallback(async () => {
    if (!isSuperAdmin) return;

    try {
      setTypeSaving(true);
      if (editingType) {
        await maintenanceTypesAPI.update(editingType.id, {
          label: newTypeLabel,
          color: newTypeColor
        });
      } else {
        await maintenanceTypesAPI.create({
          key: newTypeKey,
          label: newTypeLabel,
          color: newTypeColor
        });
      }
      const response = await maintenanceTypesAPI.getAll();
      setMaintenanceTypesFromDB(response.data.types || []);
      setNewTypeKey('');
      setNewTypeLabel('');
      setNewTypeColor('#64748b');
      setEditingType(null);
    } catch (err) {
      console.error('Error saving maintenance type:', err);
      setError(err.response?.data?.message || 'שגיאה בשמירת סוג הטיפול');
    } finally {
      setTypeSaving(false);
    }
  }, [isSuperAdmin, editingType, newTypeKey, newTypeLabel, newTypeColor]);

  const handleEditType = useCallback((type) => {
    setEditingType(type);
    setNewTypeKey(type.key);
    setNewTypeLabel(type.label);
    setNewTypeColor(type.color || '#64748b');
  }, []);

  const handleDeleteType = useCallback(async (typeId) => {
    if (!isSuperAdmin) return;

    try {
      await maintenanceTypesAPI.delete(typeId);
      const response = await maintenanceTypesAPI.getAll();
      setMaintenanceTypesFromDB(response.data.types || []);
    } catch (err) {
      console.error('Error deleting maintenance type:', err);
      setError(err.response?.data?.message || 'שגיאה במחיקת סוג הטיפול');
    }
  }, [isSuperAdmin]);

  const handleInitializeTypes = useCallback(async () => {
    if (!isSuperAdmin) return;

    try {
      setTypeSaving(true);
      await maintenanceTypesAPI.initialize();
      const response = await maintenanceTypesAPI.getAll();
      setMaintenanceTypesFromDB(response.data.types || []);
    } catch (err) {
      console.error('Error initializing maintenance types:', err);
      setError(err.response?.data?.message || 'שגיאה באתחול סוגי הטיפולים');
    } finally {
      setTypeSaving(false);
    }
  }, [isSuperAdmin]);

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

  const typeMap = useMemo(() => {
    // אם יש סוגי טיפולים מהמסד נתונים, השתמש בהם
    if (maintenanceTypesFromDB.length > 0) {
      const map = {};
      maintenanceTypesFromDB.forEach(type => {
        map[type.key] = { label: type.label, color: type.color };
      });
      return map;
    }
    // ברירת מחדל
    return {
      routine: { label: 'טיפול תקופתי', color: '#2563eb' },
      repair: { label: 'תיקון', color: '#d97706' },
      emergency: { label: 'חירום', color: '#dc2626' },
      recall: { label: 'ריקול', color: '#7c3aed' },
      accident_repair: { label: 'תיקון תאונה', color: '#dc2626' },
      other: { label: 'אחר', color: '#64748b' },
    };
  }, [maintenanceTypesFromDB]);

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
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', px: isMobile ? 1 : 0 }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        mb: isMobile ? 2 : 4,
        gap: isMobile ? 2 : 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: isMobile ? 44 : 56,
            height: isMobile ? 44 : 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            flexShrink: 0,
          }}>
            <Build sx={{ fontSize: isMobile ? 22 : 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography
              variant={isMobile ? "h5" : "h4"}
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              ניהול טיפולים
            </Typography>
            {!isMobile && (
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                מעקב אחר טיפולים ותחזוקה של הכלים
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'stretch' : 'flex-end',
        }}>
          {isMobile ? (
            <>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAdd}
                fullWidth
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#6366f1',
                  fontWeight: 600,
                  py: 1.2,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  '&:hover': { bgcolor: '#4f46e5' },
                }}
              >
                טיפול חדש
              </Button>
              <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                <Tooltip title="רענן">
                  <IconButton onClick={loadData} disabled={loading} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="השוואת מחירים">
                  <IconButton onClick={handleOpenCompare} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <CompareArrows />
                  </IconButton>
                </Tooltip>
                <Tooltip title="ניהול מוסכים">
                  <IconButton onClick={() => setGarageManageOpen(true)} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <Store />
                  </IconButton>
                </Tooltip>
                <Tooltip title="סוגי טיפולים">
                  <IconButton onClick={() => setMaintenanceTypesOpen(true)} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <Settings />
                  </IconButton>
                </Tooltip>
                <Tooltip title="סינון">
                  <IconButton onClick={() => setShowFilters(!showFilters)} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', bgcolor: showFilters ? 'rgba(99, 102, 241, 0.1)' : 'transparent' }}>
                    <FilterList />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          ) : (
            <>
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
                variant="outlined"
                startIcon={<Store />}
                onClick={() => setGarageManageOpen(true)}
                sx={{
                  borderRadius: '12px',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#f59e0b',
                    color: '#f59e0b',
                    bgcolor: 'rgba(245, 158, 11, 0.04)',
                  },
                }}
              >
                ניהול מוסכים
              </Button>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setMaintenanceTypesOpen(true)}
                sx={{
                  borderRadius: '12px',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#8b5cf6',
                    color: '#8b5cf6',
                    bgcolor: 'rgba(139, 92, 246, 0.04)',
                  },
                }}
              >
                סוגי טיפולים
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
            </>
          )}
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
      <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: isMobile ? 2 : 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: isMobile ? 'none' : 'translateY(-2px)', boxShadow: isMobile ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 2.5, px: isMobile ? 1 : 2 }}>
              <Typography sx={{ color: '#64748b', fontSize: isMobile ? '0.75rem' : '0.875rem', mb: 0.5 }}>סה"כ</Typography>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: '#1e293b' }}>{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: isMobile ? 'none' : 'translateY(-2px)', boxShadow: isMobile ? 'none' : '0 10px 25px -5px rgba(59,130,246,0.2)', borderColor: '#3b82f6' },
            }}
            onClick={() => setViewMode(1)}
          >
            <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 2.5, px: isMobile ? 1 : 2 }}>
              <Typography sx={{ color: '#64748b', fontSize: isMobile ? '0.75rem' : '0.875rem', mb: 0.5 }}>מתוכננים</Typography>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {stats.scheduled}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: isMobile ? 'none' : 'translateY(-2px)', boxShadow: isMobile ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 2.5, px: isMobile ? 1 : 2 }}>
              <Typography sx={{ color: '#64748b', fontSize: isMobile ? '0.75rem' : '0.875rem', mb: 0.5 }}>בביצוע</Typography>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {stats.inProgress}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: isMobile ? 'none' : 'translateY(-2px)', boxShadow: isMobile ? 'none' : '0 10px 25px -5px rgba(16,185,129,0.2)', borderColor: '#10b981' },
            }}
            onClick={() => setViewMode(2)}
          >
            <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 2.5, px: isMobile ? 1 : 2 }}>
              <Typography sx={{ color: '#64748b', fontSize: isMobile ? '0.75rem' : '0.875rem', mb: 0.5 }}>הושלמו</Typography>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: '#10b981' }}>
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { transform: isMobile ? 'none' : 'translateY(-2px)', boxShadow: isMobile ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.1)' },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 2.5, px: isMobile ? 1 : 2 }}>
              <Typography sx={{ color: '#64748b', fontSize: isMobile ? '0.75rem' : '0.875rem', mb: 0.5 }}>
                <AttachMoney sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                סה"כ עלויות
              </Typography>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: '#6366f1' }}>
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

      {/* Filters - collapsible on mobile */}
      <Collapse in={showFilters || !isMobile}>
        <Paper
          elevation={0}
          sx={{
            p: isMobile ? 1.5 : 2.5,
            mb: isMobile ? 2 : 3,
            borderRadius: isMobile ? '12px' : '16px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <Grid container spacing={isMobile ? 1.5 : 2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size={isMobile ? "small" : "medium"}
                placeholder="חפש טיפול, כלי, מוסך..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#94a3b8', fontSize: isMobile ? 18 : 24 }} />
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
            <Grid item xs={6} sm={6} md={3}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="סטטוס"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">הכל</MenuItem>
                  <MenuItem value="scheduled">מתוכנן</MenuItem>
                  <MenuItem value="in_progress">בביצוע</MenuItem>
                  <MenuItem value="completed">הושלם</MenuItem>
                  <MenuItem value="cancelled">בוטל</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>סוג טיפול</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="סוג טיפול"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">הכל</MenuItem>
                  {Object.entries(typeMap).map(([key, { label }]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>מי שילם?</InputLabel>
                <Select
                  value={filterPaidBy}
                  onChange={(e) => setFilterPaidBy(e.target.value)}
                  label="מי שילם?"
                  sx={{ borderRadius: '12px' }}
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
            <Grid item xs={6} sm={6} md={3}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>מוסך</InputLabel>
                <Select
                  value={filterGarage}
                  onChange={(e) => setFilterGarage(e.target.value)}
                  label="מוסך"
                  sx={{ borderRadius: '12px' }}
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
      </Collapse>

      {/* Table / Cards - responsive */}
      {isMobile ? (
        // Mobile: Card view
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#6366f1' }} />
            </Box>
          ) : filteredMaintenances.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <Build sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
                לא נמצאו טיפולים
              </Typography>
              <Typography sx={{ color: '#64748b' }}>אין טיפולים התואמים לחיפוש</Typography>
            </Paper>
          ) : (
            filteredMaintenances.map((maintenance) => (
              <Card
                key={maintenance.id}
                elevation={0}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  '&:active': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {maintenance.vehiclePlate || '-'}
                        </Typography>
                        {getStatusChip(maintenance.status)}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600 }}>
                        #{maintenance.maintenanceNumber || '-'}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: maintenance.costs?.totalCost > 0 ? '#6366f1' : '#94a3b8' }}>
                      {formatCurrency(maintenance.costs?.totalCost)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    {getTypeChip(maintenance.maintenanceType)}
                    {maintenance.garage?.name && (
                      <Chip size="small" label={maintenance.garage.name} sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 500, fontSize: '0.7rem' }} />
                    )}
                  </Box>

                  <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, lineHeight: 1.4 }} noWrap>
                    {maintenance.description || '-'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {formatDate(maintenance.maintenanceDate)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleViewDetails(maintenance)} sx={{ color: '#6366f1' }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEdit(maintenance)} sx={{ color: '#64748b' }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      {maintenance.status === 'scheduled' && (
                        <IconButton size="small" onClick={() => handleUpdateStatus(maintenance.id, 'in_progress')} sx={{ color: '#f59e0b' }}>
                          <Build fontSize="small" />
                        </IconButton>
                      )}
                      {maintenance.status === 'in_progress' && (
                        <IconButton size="small" onClick={() => handleOpenComplete(maintenance)} sx={{ color: '#10b981' }}>
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => handleOpenDelete(maintenance)} sx={{ color: '#ef4444' }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        // Desktop: Table view
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
                      <Tooltip title="צפה בפרטים">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(maintenance)}
                          sx={{ color: '#6366f1', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' } }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ערוך">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(maintenance)}
                          sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(100, 116, 139, 0.08)' } }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {maintenance.status === 'scheduled' && (
                        <Tooltip title="התחל טיפול">
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateStatus(maintenance.id, 'in_progress')}
                            sx={{ color: '#f59e0b', '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.08)' } }}
                          >
                            <Build />
                          </IconButton>
                        </Tooltip>
                      )}
                      {maintenance.status === 'in_progress' && (
                        <Tooltip title="סגור טיפול">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenComplete(maintenance)}
                            sx={{ color: '#10b981', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.08)' } }}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="מחק">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDelete(maintenance)}
                          sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
                {Object.entries(typeMap).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
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

      {/* Complete Maintenance Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '20px' } }}
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
              <CheckCircle sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              סגירת טיפול
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {completingMaintenance && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                טיפול: <strong>{completingMaintenance.maintenanceNumber}</strong> | כלי: <strong>{completingMaintenance.vehiclePlate}</strong>
              </Alert>

              <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: 2 }}>
                הזן את העלויות הסופיות:
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="עלות עבודה"
                    type="number"
                    value={completeCosts.laborCost}
                    onChange={(e) => setCompleteCosts(prev => ({ ...prev, laborCost: parseFloat(e.target.value) || 0 }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="עלות חלקים"
                    type="number"
                    value={completeCosts.partsCost}
                    onChange={(e) => setCompleteCosts(prev => ({ ...prev, partsCost: parseFloat(e.target.value) || 0 }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="עלויות אחרות"
                    type="number"
                    value={completeCosts.otherCosts}
                    onChange={(e) => setCompleteCosts(prev => ({ ...prev, otherCosts: parseFloat(e.target.value) || 0 }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
              </Grid>

              <Box sx={{
                mt: 3,
                p: 2,
                borderRadius: '12px',
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Typography sx={{ fontWeight: 600, color: '#059669' }}>סה"כ עלות:</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669' }}>
                  ₪{((completeCosts.laborCost || 0) + (completeCosts.partsCost || 0) + (completeCosts.otherCosts || 0)).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompleteDialogOpen(false)} sx={{ color: '#64748b', fontWeight: 600, borderRadius: '10px' }}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitComplete}
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
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Delete sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              מחיקת טיפול
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#64748b', mt: 1 }}>
            האם אתה בטוח שברצונך למחוק את הטיפול <strong>{deletingMaintenance?.maintenanceNumber}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
            פעולה זו לא ניתנת לביטול
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#64748b', fontWeight: 600, borderRadius: '10px' }}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{
              bgcolor: '#ef4444',
              borderRadius: '10px',
              fontWeight: 600,
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            מחק
          </Button>
        </DialogActions>
      </Dialog>

      {/* Garage Management Dialog */}
      <Dialog
        open={garageManageOpen}
        onClose={() => {
          setGarageManageOpen(false);
          setEditingGarage(null);
          setGarageFormData({ name: '', phone: '', address: '', city: '' });
        }}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '20px' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Store sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              ניהול מוסכים
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Add/Edit Form */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600, mb: 2 }}>
              {editingGarage ? 'עריכת מוסך' : 'הוספת מוסך חדש'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="שם המוסך *"
                  value={garageFormData.name}
                  onChange={(e) => setGarageFormData(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="טלפון"
                  value={garageFormData.phone}
                  onChange={(e) => setGarageFormData(prev => ({ ...prev, phone: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="עיר"
                  value={garageFormData.city}
                  onChange={(e) => setGarageFormData(prev => ({ ...prev, city: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="כתובת"
                  value={garageFormData.address}
                  onChange={(e) => setGarageFormData(prev => ({ ...prev, address: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveGarage}
                    disabled={!garageFormData.name}
                    sx={{
                      bgcolor: '#10b981',
                      borderRadius: '10px',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    {editingGarage ? 'עדכן' : 'הוסף'}
                  </Button>
                  {editingGarage && (
                    <Button
                      onClick={() => {
                        setEditingGarage(null);
                        setGarageFormData({ name: '', phone: '', address: '', city: '' });
                      }}
                      sx={{ color: '#64748b', borderRadius: '10px' }}
                    >
                      ביטול
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Garages List */}
          <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}>
            רשימת מוסכים ({garages.length})
          </Typography>
          <List sx={{ bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {garages.length === 0 ? (
              <ListItem>
                <ListItemText primary="אין מוסכים" sx={{ textAlign: 'center', color: '#94a3b8' }} />
              </ListItem>
            ) : (
              garages.map((garage) => (
                <ListItem
                  key={garage.id}
                  sx={{
                    borderBottom: '1px solid #f1f5f9',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <ListItemText
                    primary={garage.name}
                    secondary={`${garage.city || ''}${garage.phone ? ` • ${garage.phone}` : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleEditGarage(garage)} sx={{ color: '#6366f1' }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteGarage(garage.id)} sx={{ color: '#ef4444' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setGarageManageOpen(false);
              setEditingGarage(null);
              setGarageFormData({ name: '', phone: '', address: '', city: '' });
            }}
            sx={{ color: '#64748b', fontWeight: 600, borderRadius: '10px' }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Maintenance Types Dialog */}
      <Dialog
        open={maintenanceTypesOpen}
        onClose={() => {
          setMaintenanceTypesOpen(false);
          setEditingType(null);
          setNewTypeKey('');
          setNewTypeLabel('');
          setNewTypeColor('#64748b');
        }}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '20px' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Settings sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              סוגי טיפולים
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {isSuperAdmin && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 2 }}>
                {editingType ? 'עריכת סוג טיפול' : 'הוספת סוג טיפול חדש'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="שם סוג הטיפול *"
                  value={newTypeLabel}
                  onChange={(e) => {
                    setNewTypeLabel(e.target.value);
                    // יצירה אוטומטית של מפתח מהשם (רק אם לא בעריכה)
                    if (!editingType) {
                      const autoKey = e.target.value
                        .trim()
                        .replace(/\s+/g, '_')
                        .replace(/[^\u0590-\u05FFa-zA-Z0-9_]/g, '')
                        .toLowerCase() || `type_${Date.now()}`;
                      setNewTypeKey(autoKey);
                    }
                  }}
                  placeholder="לדוגמה: החלפת שמן"
                  sx={{ flex: 1, minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>צבע:</Typography>
                  <input
                    type="color"
                    value={newTypeColor}
                    onChange={(e) => setNewTypeColor(e.target.value)}
                    style={{ width: 40, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={handleSaveType}
                  disabled={!newTypeLabel || typeSaving}
                  sx={{
                    bgcolor: '#8b5cf6',
                    borderRadius: '10px',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#7c3aed' },
                  }}
                >
                  {typeSaving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (editingType ? 'עדכן' : 'הוסף')}
                </Button>
                {editingType && (
                  <Button
                    onClick={() => {
                      setEditingType(null);
                      setNewTypeKey('');
                      setNewTypeLabel('');
                      setNewTypeColor('#64748b');
                    }}
                    sx={{ color: '#64748b', borderRadius: '10px' }}
                  >
                    ביטול
                  </Button>
                )}
              </Box>
            </Box>
          )}

          <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}>
            סוגי הטיפולים המוגדרים ({Object.keys(typeMap).length})
          </Typography>

          <List sx={{ bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', mb: 2 }}>
            {Object.entries(typeMap).map(([key, { label, color }]) => {
              const dbType = maintenanceTypesFromDB.find(t => t.key === key);
              return (
                <ListItem
                  key={key}
                  sx={{
                    borderBottom: '1px solid #f1f5f9',
                    '&:last-child': { borderBottom: 'none' },
                    py: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '4px',
                        bgcolor: color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {label}
                    </Typography>
                  </Box>
                  {isSuperAdmin && dbType && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEditType(dbType)} sx={{ color: '#8b5cf6' }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteType(dbType.id)} sx={{ color: '#ef4444' }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </ListItem>
              );
            })}
          </List>

          {!isSuperAdmin && (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              רק מנהל על יכול להוסיף או לערוך סוגי טיפולים.
            </Alert>
          )}

          {isSuperAdmin && maintenanceTypesFromDB.length === 0 && (
            <Alert
              severity="warning"
              sx={{ borderRadius: '12px' }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleInitializeTypes}
                  disabled={typeSaving}
                >
                  {typeSaving ? <CircularProgress size={16} /> : 'אתחל'}
                </Button>
              }
            >
              סוגי הטיפולים עדיין לא נשמרו במסד הנתונים. לחץ על "אתחל" כדי לשמור את ברירות המחדל.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setMaintenanceTypesOpen(false);
              setEditingType(null);
              setNewTypeKey('');
              setNewTypeLabel('');
              setNewTypeColor('#64748b');
            }}
            sx={{ color: '#64748b', fontWeight: 600, borderRadius: '10px' }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
