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
  Divider,
  useMediaQuery,
  useTheme,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Visibility,
  Edit,
  Delete,
  Add,
  Gavel,
  FilterList,
  AttachMoney,
  Warning,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Close,
} from '@mui/icons-material';
import { insuranceClaimsAPI, vehiclesAPI, ridersAPI } from '../services/api';
import InsuranceClaimDialog from '../components/InsuranceClaimDialog';
import { useAuth } from '../contexts/AuthContext';

export default function InsuranceClaims() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission } = useAuth();

  const [claims, setClaims] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterInsuranceType, setFilterInsuranceType] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClaim, setDeletingClaim] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showFilters, setShowFilters] = useState(!isMobile);

  const statusMap = useMemo(() => ({
    draft: { label: 'טיוטה', color: '#94a3b8', bgcolor: 'rgba(148, 163, 184, 0.1)', icon: <HourglassEmpty fontSize="small" /> },
    submitted: { label: 'הוגשה', color: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.1)', icon: <CheckCircle fontSize="small" /> },
    under_review: { label: 'בבדיקה', color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)', icon: <HourglassEmpty fontSize="small" /> },
    approved: { label: 'אושרה', color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle fontSize="small" /> },
    rejected: { label: 'נדחתה', color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)', icon: <Cancel fontSize="small" /> },
    closed: { label: 'סגורה', color: '#64748b', bgcolor: 'rgba(100, 116, 139, 0.1)', icon: <CheckCircle fontSize="small" /> },
  }), []);

  const eventTypeMap = useMemo(() => ({
    accident: { label: 'תאונה', color: '#ef4444' },
    theft: { label: 'גניבה', color: '#8b5cf6' },
    vandalism: { label: 'ונדליזם', color: '#f59e0b' },
    natural_disaster: { label: 'אסון טבע', color: '#06b6d4' },
    other: { label: 'אחר', color: '#64748b' },
  }), []);

  const insuranceTypeMap = useMemo(() => ({
    mandatory: 'חובה',
    comprehensive: 'מקיף',
    thirdParty: 'צד שלישי',
  }), []);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '-';
    try {
      let date;
      if (timestamp.toDate) date = timestamp.toDate();
      else if (timestamp._seconds) date = new Date(timestamp._seconds * 1000);
      else date = new Date(timestamp);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('he-IL');
    } catch { return '-'; }
  }, []);

  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '-';
    return `₪${Number(amount).toLocaleString()}`;
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [claimsRes, vehiclesRes, ridersRes] = await Promise.all([
        insuranceClaimsAPI.getAll().catch(() => ({ data: { claims: [] } })),
        vehiclesAPI.getAll().catch(() => ({ data: { vehicles: [] } })),
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
      ]);

      setClaims(claimsRes.data.claims || []);
      setVehicles(vehiclesRes.data.vehicles || []);
      setRiders(ridersRes.data.riders || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const result = {
      total: claims.length,
      open: 0,
      totalClaimAmount: 0,
      totalApprovedAmount: 0,
    };

    for (const c of claims) {
      if (!['closed', 'rejected'].includes(c.status)) result.open++;
      result.totalClaimAmount += c.claimAmount || 0;
      result.totalApprovedAmount += c.approvedAmount || 0;
    }

    return result;
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterEventType !== 'all' && c.eventType !== filterEventType) return false;
      if (filterInsuranceType !== 'all' && c.insuranceType !== filterInsuranceType) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          c.claimNumber?.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term) ||
          c.vehiclePlate?.toLowerCase().includes(term) ||
          c.riderName?.toLowerCase().includes(term) ||
          c.insuranceCompany?.toLowerCase().includes(term) ||
          c.policyNumber?.toLowerCase().includes(term);
        if (!match) return false;
      }

      return true;
    });
  }, [claims, filterStatus, filterEventType, filterInsuranceType, searchTerm]);

  const handleAdd = useCallback(() => {
    setEditingClaim(null);
    setEditDialogOpen(true);
  }, []);

  const handleEdit = useCallback((claim) => {
    setEditingClaim(claim);
    setEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((claim) => {
    setSelectedClaim(claim);
    setDetailDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((claim) => {
    setDeletingClaim(claim);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingClaim) return;
    try {
      await insuranceClaimsAPI.delete(deletingClaim.id);
      await loadData();
      setDeleteDialogOpen(false);
      setDeletingClaim(null);
    } catch (err) {
      console.error('Error deleting claim:', err);
      setError('שגיאה במחיקת התביעה');
    }
  }, [deletingClaim]);

  const handleSave = useCallback(async () => {
    setEditDialogOpen(false);
    setEditingClaim(null);
    await loadData();
  }, []);

  const canEdit = hasPermission('insurance_claims', 'edit');

  const statCards = [
    { title: 'סה"כ תביעות', value: stats.total, color: '#6366f1', icon: <Gavel /> },
    { title: 'תביעות פתוחות', value: stats.open, color: '#f59e0b', icon: <HourglassEmpty /> },
    { title: 'סכום תביעות', value: formatCurrency(stats.totalClaimAmount), color: '#ef4444', icon: <AttachMoney /> },
    { title: 'סכום מאושר', value: formatCurrency(stats.totalApprovedAmount), color: '#10b981', icon: <CheckCircle /> },
  ];

  return (
    <Box dir="rtl" sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          }}>
            <Gavel sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: '#1e293b' }}>
              תביעות ביטוח
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              ניהול תביעות ביטוח לכלי הצי
            </Typography>
          </Box>
        </Box>

        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              bgcolor: '#f59e0b', borderRadius: '12px', fontWeight: 600, px: 3,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            תביעה חדשה
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              borderRight: `4px solid ${stat.color}`,
            }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: 0.7 }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ borderRadius: '16px', mb: 3, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Box sx={{
          p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: isMobile ? 'pointer' : 'default',
          bgcolor: '#f8fafc',
        }}
          onClick={() => isMobile && setShowFilters(!showFilters)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList sx={{ color: '#64748b' }} />
            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
              סינון וחיפוש
            </Typography>
          </Box>
          {isMobile && (
            <IconButton size="small">
              {showFilters ? <Close fontSize="small" /> : <FilterList fontSize="small" />}
            </IconButton>
          )}
        </Box>

        <Collapse in={showFilters}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Grid>
              <Grid item xs={4} sm={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>סטטוס</InputLabel>
                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="סטטוס" sx={{ borderRadius: '10px' }}>
                    <MenuItem value="all">הכל</MenuItem>
                    {Object.entries(statusMap).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4} sm={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>סוג אירוע</InputLabel>
                  <Select value={filterEventType} onChange={(e) => setFilterEventType(e.target.value)} label="סוג אירוע" sx={{ borderRadius: '10px' }}>
                    <MenuItem value="all">הכל</MenuItem>
                    {Object.entries(eventTypeMap).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>סוג ביטוח</InputLabel>
                  <Select value={filterInsuranceType} onChange={(e) => setFilterInsuranceType(e.target.value)} label="סוג ביטוח" sx={{ borderRadius: '10px' }}>
                    <MenuItem value="all">הכל</MenuItem>
                    {Object.entries(insuranceTypeMap).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
            <CircularProgress sx={{ color: '#f59e0b' }} />
          </Box>
        ) : filteredClaims.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 6 }}>
            <Gavel sx={{ fontSize: 64, color: '#e2e8f0', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600 }}>
              {searchTerm || filterStatus !== 'all' || filterEventType !== 'all' || filterInsuranceType !== 'all'
                ? 'לא נמצאו תביעות התואמות את הסינון'
                : 'אין תביעות ביטוח עדיין'}
            </Typography>
            {canEdit && !searchTerm && filterStatus === 'all' && (
              <Button variant="outlined" startIcon={<Add />} onClick={handleAdd} sx={{ mt: 2, borderRadius: '10px', color: '#f59e0b', borderColor: '#f59e0b' }}>
                צור תביעה ראשונה
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>מספר תביעה</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>כלי</TableCell>
                  {!isMobile && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>רוכב</TableCell>}
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>סוג אירוע</TableCell>
                  {!isMobile && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>תאריך</TableCell>}
                  {!isMobile && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>חברת ביטוח</TableCell>}
                  {!isTablet && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>סכום תביעה</TableCell>}
                  {!isTablet && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>סכום מאושר</TableCell>}
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>סטטוס</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClaims.map((claim) => {
                  const statusInfo = statusMap[claim.status] || statusMap.draft;
                  const eventInfo = eventTypeMap[claim.eventType] || eventTypeMap.other;
                  return (
                    <TableRow
                      key={claim.id}
                      onClick={() => handleViewDetails(claim)}
                      sx={{ cursor: 'pointer', '&:nth-of-type(odd)': { bgcolor: 'rgba(248, 250, 252, 0.5)' }, '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' } }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {claim.claimNumber || '-'}
                      </TableCell>
                      <TableCell>{claim.vehiclePlate || '-'}</TableCell>
                      {!isMobile && <TableCell>{claim.riderName || '-'}</TableCell>}
                      <TableCell>
                        <Chip
                          label={eventInfo.label}
                          size="small"
                          sx={{
                            bgcolor: `${eventInfo.color}15`,
                            color: eventInfo.color,
                            fontWeight: 600,
                            borderRadius: '8px',
                          }}
                        />
                      </TableCell>
                      {!isMobile && <TableCell>{formatDate(claim.eventDate)}</TableCell>}
                      {!isMobile && <TableCell>{claim.insuranceCompany || '-'}</TableCell>}
                      {!isTablet && <TableCell>{formatCurrency(claim.claimAmount)}</TableCell>}
                      {!isTablet && <TableCell>{formatCurrency(claim.approvedAmount)}</TableCell>}
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          sx={{
                            bgcolor: statusInfo.bgcolor,
                            color: statusInfo.color,
                            fontWeight: 600,
                            borderRadius: '8px',
                          }}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {canEdit && (
                            <>
                              <Tooltip title="עריכה">
                                <IconButton size="small" onClick={() => handleEdit(claim)} sx={{ color: '#f59e0b' }}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="מחיקה">
                                <IconButton size="small" onClick={() => handleOpenDelete(claim)} sx={{ color: '#ef4444' }}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '20px' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Gavel sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                פרטי תביעה {selectedClaim?.claimNumber}
              </Typography>
            </Box>
            <IconButton onClick={() => setDetailDialogOpen(false)} size="small"><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedClaim && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>פרטי אירוע</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">מספר תביעה</Typography>
                <Typography sx={{ fontWeight: 600 }}>{selectedClaim.claimNumber || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">סוג אירוע</Typography>
                <Typography sx={{ fontWeight: 600 }}>{eventTypeMap[selectedClaim.eventType]?.label || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">תאריך אירוע</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatDate(selectedClaim.eventDate)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">תיאור</Typography>
                <Typography>{selectedClaim.description || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">כלי</Typography>
                <Typography sx={{ fontWeight: 600 }}>{selectedClaim.vehiclePlate || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">רוכב</Typography>
                <Typography sx={{ fontWeight: 600 }}>{selectedClaim.riderName || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">מיקום</Typography>
                <Typography>{selectedClaim.location?.address || '-'}</Typography>
              </Grid>

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>פרטי ביטוח</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">חברת ביטוח</Typography>
                <Typography sx={{ fontWeight: 600 }}>{selectedClaim.insuranceCompany || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">סוג ביטוח</Typography>
                <Typography sx={{ fontWeight: 600 }}>{insuranceTypeMap[selectedClaim.insuranceType] || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">מספר פוליסה</Typography>
                <Typography sx={{ fontWeight: 600 }}>{selectedClaim.policyNumber || '-'}</Typography>
              </Grid>
              {selectedClaim.externalClaimNumber && (
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">מספר תביעה חיצוני</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{selectedClaim.externalClaimNumber}</Typography>
                </Grid>
              )}

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>סכומים וסטטוס</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">סכום תביעה</Typography>
                <Typography sx={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(selectedClaim.claimAmount)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">סכום מאושר</Typography>
                <Typography sx={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(selectedClaim.approvedAmount)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">סכום ששולם</Typography>
                <Typography sx={{ fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(selectedClaim.paidAmount)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">סטטוס</Typography>
                <Chip
                  label={statusMap[selectedClaim.status]?.label || selectedClaim.status}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: statusMap[selectedClaim.status]?.bgcolor,
                    color: statusMap[selectedClaim.status]?.color,
                    fontWeight: 600,
                  }}
                />
              </Grid>

              {(selectedClaim.appraiser?.name || selectedClaim.appraiser?.phone) && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>שמאי</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">שם</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{selectedClaim.appraiser?.name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">טלפון</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{selectedClaim.appraiser?.phone || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">תאריך פגישה</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formatDate(selectedClaim.appraiser?.appointmentDate)}</Typography>
                  </Grid>
                </>
              )}

              {selectedClaim.rejectionReason && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ borderRadius: '12px' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>סיבת דחייה:</Typography>
                      {selectedClaim.rejectionReason}
                    </Alert>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {canEdit && selectedClaim && (
            <Button
              variant="outlined"
              onClick={() => { setDetailDialogOpen(false); handleEdit(selectedClaim); }}
              sx={{ borderRadius: '10px', color: '#f59e0b', borderColor: '#f59e0b', fontWeight: 600, mr: 'auto' }}
            >
              עריכה
            </Button>
          )}
          <Button onClick={() => setDetailDialogOpen(false)} sx={{ borderRadius: '10px', fontWeight: 600 }}>
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        dir="rtl"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>מחיקת תביעה</DialogTitle>
        <DialogContent>
          <Typography>
            האם למחוק את התביעה {deletingClaim?.claimNumber}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            פעולה זו אינה ניתנת לביטול.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: '10px' }}>ביטול</Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{
              bgcolor: '#ef4444', borderRadius: '10px', fontWeight: 600,
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            מחק
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit/Create Dialog */}
      <InsuranceClaimDialog
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setEditingClaim(null); }}
        claim={editingClaim}
        vehicles={vehicles}
        riders={riders}
        onSave={handleSave}
      />
    </Box>
  );
}
