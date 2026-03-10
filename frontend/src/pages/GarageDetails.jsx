import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';
import {
  ArrowForward,
  Store,
  Phone,
  LocationOn,
  Person,
  AccessTime,
  Star,
  Build,
  AttachMoney,
  CheckCircle,
  Schedule,
  Cancel,
  HourglassEmpty,
  Search,
  Refresh,
  Edit,
  Visibility,
  TwoWheeler,
  StarBorder,
  StarHalf,
} from '@mui/icons-material';
import { garagesAPI, maintenanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MaintenanceDialog from '../components/MaintenanceDialog';

// ---- עזרים ----
const formatDate = (val) => {
  if (!val) return '—';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch {
    return '—';
  }
};

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n || 0);

const TYPE_MAP = {
  routine: { label: 'טיפול תקופתי', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  repair: { label: 'תיקון', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  emergency: { label: 'חירום', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  recall: { label: 'ריקול', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  accident_repair: { label: 'תיקון תאונה', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  other: { label: 'אחר', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const STATUS_MAP = {
  scheduled: { label: 'מתוכנן', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <Schedule fontSize="small" /> },
  in_progress: { label: 'בביצוע', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <HourglassEmpty fontSize="small" /> },
  completed: { label: 'הושלם', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle fontSize="small" /> },
  cancelled: { label: 'בוטל', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <Cancel fontSize="small" /> },
};

const SPECIALTY_MAP = {
  tires: 'צמיגים',
  brakes: 'בלמים',
  engine: 'מנוע',
  electrical: 'חשמל',
  bodywork: 'פחחות',
  general: 'כללי',
  emergency: 'חירום',
};

function RatingStars({ rating }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.25 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <Box key={i} sx={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
            {filled ? <Star fontSize="small" /> : half ? <StarHalf fontSize="small" /> : <StarBorder fontSize="small" sx={{ color: '#cbd5e1' }} />}
          </Box>
        );
      })}
      {rating > 0 && (
        <Typography variant="caption" sx={{ color: '#64748b', mr: 0.5, alignSelf: 'center' }}>
          ({rating})
        </Typography>
      )}
    </Box>
  );
}

function InfoCard({ icon, label, value, color = '#6366f1' }) {
  if (!value) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        borderRadius: '12px',
        bgcolor: '#f8fafc',
        border: '1px solid #e2e8f0',
        height: '100%',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        <Box sx={{ color: '#1e293b', fontWeight: 600, fontSize: '0.875rem', wordBreak: 'break-word', lineHeight: 1.5 }}>
          {value}
        </Box>
      </Box>
    </Box>
  );
}

export default function GarageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = useAuth();

  const [garage, setGarage] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // פילטרים לטבלת הטיפולים
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // דיאלוג צפייה בטיפול
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, maintRes] = await Promise.all([
        garagesAPI.getStatistics(id).catch(() => ({ data: { garage: null, statistics: {} } })),
        maintenanceAPI.getByGarage(id).catch(() => ({ data: { maintenances: [] } })),
      ]);

      const garageData = statsRes.data?.garage || null;
      setGarage(garageData);
      setStatistics(statsRes.data?.statistics || {});
      setMaintenances(maintRes.data?.maintenances || []);
    } catch (err) {
      setError('שגיאה בטעינת נתוני המוסך');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // סטטיסטיקות מחושבות מהטיפולים שנטענו
  const computedStats = useMemo(() => {
    const result = {
      total: maintenances.length,
      completed: 0,
      inProgress: 0,
      scheduled: 0,
      cancelled: 0,
      totalCost: 0,
    };
    for (const m of maintenances) {
      result.totalCost += m.costs?.totalCost || 0;
      if (m.status === 'completed') result.completed++;
      else if (m.status === 'in_progress') result.inProgress++;
      else if (m.status === 'scheduled') result.scheduled++;
      else if (m.status === 'cancelled') result.cancelled++;
    }
    result.averageCost = result.total > 0 ? Math.round(result.totalCost / result.total) : 0;
    return result;
  }, [maintenances]);

  // סטטיסטיקות לפי סוג
  const typeStats = useMemo(() => {
    const counts = {};
    for (const m of maintenances) {
      const t = m.maintenanceType || 'other';
      if (!counts[t]) counts[t] = { count: 0, totalCost: 0 };
      counts[t].count++;
      counts[t].totalCost += m.costs?.totalCost || 0;
    }
    return Object.entries(counts)
      .map(([type, data]) => ({ type, ...data, avgCost: data.count > 0 ? Math.round(data.totalCost / data.count) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [maintenances]);

  // רשימת טיפולים מסוננת
  const filteredMaintenances = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return maintenances.filter((m) => {
      const matchSearch =
        !s ||
        m.vehiclePlate?.toLowerCase().includes(s) ||
        m.riderName?.toLowerCase().includes(s) ||
        m.description?.toLowerCase().includes(s) ||
        m.maintenanceNumber?.toLowerCase().includes(s);
      const matchStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchType = filterType === 'all' || m.maintenanceType === filterType;
      return matchSearch && matchStatus && matchType;
    });
  }, [maintenances, searchTerm, filterStatus, filterType]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
        <Button onClick={() => navigate('/maintenance')} sx={{ mt: 2 }} startIcon={<ArrowForward />}>
          חזור לטיפולים
        </Button>
      </Box>
    );
  }

  if (!garage) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Store sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#64748b' }}>מוסך לא נמצא</Typography>
        <Button onClick={() => navigate('/maintenance')} sx={{ mt: 2 }} startIcon={<ArrowForward />}>
          חזור לטיפולים
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', px: isMobile ? 0 : 0 }}>
      {/* ===== HEADER ===== */}
      <Box sx={{ mb: isMobile ? 2 : 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowForward />}
          onClick={() => navigate('/maintenance')}
          sx={{ mb: 1.5, color: '#64748b', '&:hover': { bgcolor: 'transparent', color: '#6366f1' }, minHeight: 'auto', p: 0 }}
        >
          חזור לטיפולים
        </Button>

        <Box sx={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* אייקון מוסך */}
            <Box
              sx={{
                width: isMobile ? 48 : 60,
                height: isMobile ? 48 : 60,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 8px 20px rgba(99,102,241,0.35)',
              }}
            >
              <Store sx={{ color: '#fff', fontSize: isMobile ? 24 : 30 }} />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {garage.name}
                </Typography>
                <Chip
                  label={garage.isActive !== false ? 'פעיל' : 'לא פעיל'}
                  size="small"
                  sx={{
                    bgcolor: garage.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: garage.isActive !== false ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              {garage.city && (
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
                  {garage.city}
                </Typography>
              )}
              {garage.rating > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <RatingStars rating={garage.rating} />
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="רענן נתונים">
              <IconButton onClick={loadData} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
            {hasPermission('maintenance', 'edit') && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate('/maintenance')}
                sx={{ borderRadius: '10px', borderColor: '#e2e8f0', color: '#475569' }}
              >
                {isMobile ? 'ערוך' : 'ערוך מוסך'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* ===== INFO CARDS ===== */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', border: '1px solid #e2e8f0', mb: isMobile ? 2 : 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
          פרטי המוסך
        </Typography>
        <Grid container spacing={isMobile ? 1.5 : 2}>
          {garage.phone && (
            <Grid item xs={12} sm={6} md={4}>
              <InfoCard icon={<Phone sx={{ color: '#6366f1', fontSize: 18 }} />} label="טלפון" value={
                <Box>
                  <a href={`tel:${garage.phone}`} style={{ color: '#1e293b', textDecoration: 'none' }}>{garage.phone}</a>
                  {garage.phone2 && <><br /><a href={`tel:${garage.phone2}`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85em' }}>{garage.phone2}</a></>}
                </Box>
              } />
            </Grid>
          )}
          {(garage.address || garage.city) && (
            <Grid item xs={12} sm={6} md={4}>
              <InfoCard icon={<LocationOn sx={{ color: '#10b981', fontSize: 18 }} />} label="כתובת" value={[garage.address, garage.city].filter(Boolean).join(', ')} color="#10b981" />
            </Grid>
          )}
          {garage.contactPerson && (
            <Grid item xs={12} sm={6} md={4}>
              <InfoCard icon={<Person sx={{ color: '#f59e0b', fontSize: 18 }} />} label="איש קשר" value={garage.contactPerson} color="#f59e0b" />
            </Grid>
          )}
          {garage.workingHours && (
            <Grid item xs={12} sm={6} md={4}>
              <InfoCard icon={<AccessTime sx={{ color: '#3b82f6', fontSize: 18 }} />} label="שעות פעילות" value={garage.workingHours} color="#3b82f6" />
            </Grid>
          )}
          {garage.email && (
            <Grid item xs={12} sm={6} md={4}>
              <InfoCard icon={<Person sx={{ color: '#8b5cf6', fontSize: 18 }} />} label="אימייל" value={<a href={`mailto:${garage.email}`} style={{ color: '#1e293b', textDecoration: 'none' }}>{garage.email}</a>} color="#8b5cf6" />
            </Grid>
          )}
        </Grid>

        {/* התמחויות */}
        {garage.specialties?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>התמחויות</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {garage.specialties.map((s) => (
                <Chip
                  key={s}
                  label={SPECIALTY_MAP[s] || s}
                  size="small"
                  sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 600, fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* הערות */}
        {garage.notes && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
            <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, display: 'block', mb: 0.5 }}>הערות</Typography>
            <Typography variant="body2" sx={{ color: '#78350f' }}>{garage.notes}</Typography>
          </Box>
        )}
      </Paper>

      {/* ===== STATS CARDS ===== */}
      <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: isMobile ? 2 : 3 }}>
        {[
          { label: 'סה"כ טיפולים', value: computedStats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: <Build /> },
          { label: 'הושלמו', value: computedStats.completed, color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: <CheckCircle /> },
          { label: 'בביצוע', value: computedStats.inProgress, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <HourglassEmpty /> },
          { label: 'סה"כ עלות', value: formatCurrency(computedStats.totalCost), color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <AttachMoney />, small: true },
          { label: 'עלות ממוצעת', value: formatCurrency(computedStats.averageCost), color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <AttachMoney />, small: true },
        ].map((s, idx) => (
          <Grid item xs={6} sm={4} md={isMobile ? 6 : 'auto'} key={idx} sx={{ flexGrow: 1 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: isMobile ? '12px' : '16px',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { transform: isMobile ? 'none' : 'translateY(-2px)', boxShadow: isMobile ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.1)' },
              }}
            >
              <CardContent sx={{ py: isMobile ? 1.5 : 2.5, px: isMobile ? 1.5 : 2.5, textAlign: 'center', '&:last-child': { pb: isMobile ? 1.5 : 2.5 } }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                  <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                </Box>
                <Typography sx={{ color: '#64748b', fontSize: isMobile ? '0.7rem' : '0.8rem', mb: 0.5 }}>{s.label}</Typography>
                <Typography
                  variant={isMobile ? 'h6' : s.small ? 'h6' : 'h4'}
                  sx={{ fontWeight: 700, color: s.color, fontSize: s.small ? (isMobile ? '0.95rem' : '1.1rem') : undefined }}
                >
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ===== STATS BY TYPE ===== */}
      {typeStats.length > 0 && (
        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', border: '1px solid #e2e8f0', mb: isMobile ? 2 : 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
            טיפולים לפי סוג
          </Typography>
          <Stack spacing={isMobile ? 1.5 : 2}>
            {typeStats.map(({ type, count, totalCost, avgCost }) => {
              const meta = TYPE_MAP[type] || TYPE_MAP.other;
              const pct = computedStats.total > 0 ? Math.round((count / computedStats.total) * 100) : 0;
              return (
                <Box key={type}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={meta.label}
                        size="small"
                        sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.75rem' }}
                      />
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {count} טיפולים
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'left', display: 'flex', gap: isMobile ? 1 : 2, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        ממוצע: {formatCurrency(avgCost)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {pct}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${meta.color}18`,
                      '& .MuiLinearProgress-bar': { bgcolor: meta.color },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* ===== TREATMENTS TABLE ===== */}
      <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* כותרת + פילטרים */}
        <Box sx={{ p: isMobile ? 2 : 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: isMobile ? '1rem' : '1.125rem' }}>
              היסטוריית טיפולים
              {filteredMaintenances.length !== maintenances.length && (
                <Chip label={`${filteredMaintenances.length} / ${maintenances.length}`} size="small" sx={{ mr: 1, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700 }} />
              )}
              {maintenances.length > 0 && filteredMaintenances.length === maintenances.length && (
                <Chip label={maintenances.length} size="small" sx={{ mr: 1, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700 }} />
              )}
            </Typography>
          </Box>

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="חפש לפי כלי, רוכב, תיאור..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={6} sm={3.5} md={3.5}>
              <FormControl fullWidth size="small">
                <InputLabel>סטטוס</InputLabel>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="סטטוס" sx={{ borderRadius: '10px' }}>
                  <MenuItem value="all">הכל</MenuItem>
                  {Object.entries(STATUS_MAP).map(([v, m]) => <MenuItem key={v} value={v}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3.5} md={3.5}>
              <FormControl fullWidth size="small">
                <InputLabel>סוג</InputLabel>
                <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="סוג" sx={{ borderRadius: '10px' }}>
                  <MenuItem value="all">הכל</MenuItem>
                  {Object.entries(TYPE_MAP).map(([v, m]) => <MenuItem key={v} value={v}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* טבלה / כרטיסיות */}
        {isMobile ? (
          // ===== תצוגת מובייל - כרטיסיות =====
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredMaintenances.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Build sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>לא נמצאו טיפולים</Typography>
              </Box>
            ) : (
              filteredMaintenances.map((m, idx) => {
                const typeMeta = TYPE_MAP[m.maintenanceType] || TYPE_MAP.other;
                const statusMeta = STATUS_MAP[m.status] || STATUS_MAP.completed;
                return (
                  <Card
                    key={m.id}
                    elevation={0}
                    onClick={() => { setSelectedMaintenance(m); setViewDialogOpen(true); }}
                    sx={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      animation: `fadeIn 0.3s ease-out ${idx * 0.03}s both`,
                      '&:hover': { bgcolor: 'rgba(99,102,241,0.03)', borderColor: '#c7d2fe' },
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip label={typeMeta.label} size="small" sx={{ bgcolor: typeMeta.bg, color: typeMeta.color, fontWeight: 700, fontSize: '0.7rem' }} />
                        <Chip
                          icon={statusMeta.icon}
                          label={statusMeta.label}
                          size="small"
                          sx={{ bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 600, fontSize: '0.7rem', '& .MuiChip-icon': { color: statusMeta.color } }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <TwoWheeler sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{m.vehiclePlate || '—'}</Typography>
                        {m.riderName && <Typography variant="caption" sx={{ color: '#64748b' }}>• {m.riderName}</Typography>}
                      </Box>
                      {m.description && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>{formatDate(m.maintenanceDate)}</Typography>
                        {m.costs?.totalCost > 0 && (
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(m.costs.totalCost)}</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Box>
        ) : (
          // ===== תצוגת דסקטופ - טבלה =====
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>תאריך</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>כלי</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>רוכב</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>סוג טיפול</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>תיאור</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>עלות</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>סטטוס</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMaintenances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Build sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
                      <Typography variant="body1" sx={{ color: '#94a3b8' }}>לא נמצאו טיפולים</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaintenances.map((m, idx) => {
                    const typeMeta = TYPE_MAP[m.maintenanceType] || TYPE_MAP.other;
                    const statusMeta = STATUS_MAP[m.status] || STATUS_MAP.completed;
                    return (
                      <TableRow
                        key={m.id}
                        sx={{
                          cursor: 'pointer',
                          animation: `fadeIn 0.3s ease-out ${idx * 0.02}s both`,
                          '&:hover': { bgcolor: 'rgba(99,102,241,0.03)' },
                          transition: 'background-color 0.15s ease-in-out',
                        }}
                        onClick={() => { setSelectedMaintenance(m); setViewDialogOpen(true); }}
                      >
                        <TableCell sx={{ color: '#475569', fontSize: '0.875rem' }}>{formatDate(m.maintenanceDate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <TwoWheeler sx={{ fontSize: 16, color: '#94a3b8' }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{m.vehiclePlate || '—'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#475569', fontSize: '0.875rem' }}>{m.riderName || '—'}</TableCell>
                        <TableCell>
                          <Chip label={typeMeta.label} size="small" sx={{ bgcolor: typeMeta.bg, color: typeMeta.color, fontWeight: 700, fontSize: '0.75rem' }} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" sx={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {m.costs?.totalCost > 0 ? (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(m.costs.totalCost)}</Typography>
                          ) : <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={statusMeta.icon}
                            label={statusMeta.label}
                            size="small"
                            sx={{ bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 600, fontSize: '0.75rem', '& .MuiChip-icon': { color: statusMeta.color } }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="צפה בפרטים">
                            <IconButton size="small" onClick={() => { setSelectedMaintenance(m); setViewDialogOpen(true); }}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ===== DIALOG פרטי טיפול ===== */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        {selectedMaintenance && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Build sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>פרטי טיפול</Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>{formatDate(selectedMaintenance.maintenanceDate)}</Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>כלי</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedMaintenance.vehiclePlate || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>רוכב</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedMaintenance.riderName || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>סוג טיפול</Typography>
                    <Chip label={(TYPE_MAP[selectedMaintenance.maintenanceType] || TYPE_MAP.other).label} size="small"
                      sx={{ bgcolor: (TYPE_MAP[selectedMaintenance.maintenanceType] || TYPE_MAP.other).bg, color: (TYPE_MAP[selectedMaintenance.maintenanceType] || TYPE_MAP.other).color, fontWeight: 700 }} />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>סטטוס</Typography>
                    <Chip
                      icon={(STATUS_MAP[selectedMaintenance.status] || STATUS_MAP.completed).icon}
                      label={(STATUS_MAP[selectedMaintenance.status] || STATUS_MAP.completed).label}
                      size="small"
                      sx={{ bgcolor: (STATUS_MAP[selectedMaintenance.status] || STATUS_MAP.completed).bg, color: (STATUS_MAP[selectedMaintenance.status] || STATUS_MAP.completed).color, fontWeight: 600, '& .MuiChip-icon': { color: (STATUS_MAP[selectedMaintenance.status] || STATUS_MAP.completed).color } }}
                    />
                  </Grid>
                </Grid>

                {selectedMaintenance.description && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>תיאור</Typography>
                      <Typography variant="body2" sx={{ color: '#1e293b' }}>{selectedMaintenance.description}</Typography>
                    </Box>
                  </>
                )}

                {selectedMaintenance.costs?.totalCost > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>עלויות</Typography>
                      <Grid container spacing={1}>
                        {selectedMaintenance.costs.laborCost > 0 && (
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>עבודה</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(selectedMaintenance.costs.laborCost)}</Typography>
                          </Grid>
                        )}
                        {selectedMaintenance.costs.partsCost > 0 && (
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>חלקים</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(selectedMaintenance.costs.partsCost)}</Typography>
                          </Grid>
                        )}
                        {selectedMaintenance.costs.otherCosts > 0 && (
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>אחר</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(selectedMaintenance.costs.otherCosts)}</Typography>
                          </Grid>
                        )}
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'rgba(99,102,241,0.06)', borderRadius: '8px', mt: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>סה"כ</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#6366f1' }}>{formatCurrency(selectedMaintenance.costs.totalCost)}</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </>
                )}

                {selectedMaintenance.replacedParts?.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.75 }}>חלקים שהוחלפו</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {selectedMaintenance.replacedParts.map((p, i) => (
                          <Chip key={i} label={p} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569' }} />
                        ))}
                      </Box>
                    </Box>
                  </>
                )}

                {selectedMaintenance.notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>הערות</Typography>
                      <Typography variant="body2" sx={{ color: '#475569' }}>{selectedMaintenance.notes}</Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
              <Button onClick={() => setViewDialogOpen(false)} sx={{ color: '#64748b' }}>סגור</Button>
              {hasPermission('maintenance', 'edit') && (
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => {
                    setViewDialogOpen(false);
                    setEditDialogOpen(true);
                  }}
                >
                  ערוך טיפול
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* דיאלוג עריכת טיפול */}
      {editDialogOpen && selectedMaintenance && (
        <MaintenanceDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maintenance={selectedMaintenance}
          onSave={() => {
            setEditDialogOpen(false);
            loadData();
          }}
        />
      )}
    </Box>
  );
}
