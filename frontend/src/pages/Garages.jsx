import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
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
  CardActionArea,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme,
  Snackbar,
} from '@mui/material';
import {
  Store,
  Search,
  Add,
  Edit,
  Delete,
  Phone,
  LocationOn,
  Build,
  AttachMoney,
  Refresh,
  Star,
  ChevronLeft,
  MoreVert,
  Menu,
} from '@mui/icons-material';
import { garagesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n || 0);

const SPECIALTY_MAP = {
  tires: 'צמיגים',
  brakes: 'בלמים',
  engine: 'מנוע',
  electrical: 'חשמל',
  bodywork: 'פחחות',
  general: 'כללי',
  emergency: 'חירום',
};

const SPECIALTY_OPTIONS = Object.entries(SPECIALTY_MAP).map(([value, label]) => ({ value, label }));

const EMPTY_FORM = {
  name: '',
  phone: '',
  phone2: '',
  address: '',
  city: '',
  contactPerson: '',
  email: '',
  workingHours: '',
  specialties: [],
  rating: 0,
  notes: '',
};

function StarRating({ value, onChange, size = 22 }) {
  const [hover, setHover] = useState(0);
  return (
    <Box sx={{ display: 'flex', gap: 0.25 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          onClick={() => onChange && onChange(i === value ? 0 : i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          sx={{
            color: (hover || value) >= i ? '#f59e0b' : '#cbd5e1',
            cursor: onChange ? 'pointer' : 'default',
            fontSize: size,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.1s',
          }}
        >
          <Star fontSize="inherit" />
        </Box>
      ))}
    </Box>
  );
}

export default function Garages() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = useAuth();

  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');

  // פילטרים
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  // דיאלוג הוספה/עריכה
  const [formOpen, setFormOpen] = useState(false);
  const [editingGarage, setEditingGarage] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // דיאלוג מחיקה
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGarage, setDeletingGarage] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadGarages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await garagesAPI.getAll({ includeInactive: true });
      setGarages(res.data?.garages || []);
    } catch (err) {
      setError('שגיאה בטעינת רשימת המוסכים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGarages();
  }, [loadGarages]);

  const filteredGarages = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return garages.filter((g) => {
      const matchSearch =
        !s ||
        g.name?.toLowerCase().includes(s) ||
        g.city?.toLowerCase().includes(s) ||
        g.contactPerson?.toLowerCase().includes(s) ||
        g.phone?.includes(s);
      const matchSpecialty = filterSpecialty === 'all' || g.specialties?.includes(filterSpecialty);
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && g.isActive !== false) ||
        (filterStatus === 'inactive' && g.isActive === false);
      return matchSearch && matchSpecialty && matchStatus;
    });
  }, [garages, searchTerm, filterSpecialty, filterStatus]);

  // ===== הוספה/עריכה =====
  const openAdd = () => {
    setEditingGarage(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (garage, e) => {
    e.stopPropagation();
    setEditingGarage(garage);
    setFormData({
      name: garage.name || '',
      phone: garage.phone || '',
      phone2: garage.phone2 || '',
      address: garage.address || '',
      city: garage.city || '',
      contactPerson: garage.contactPerson || '',
      email: garage.email || '',
      workingHours: garage.workingHours || '',
      specialties: garage.specialties || [],
      rating: garage.rating || 0,
      notes: garage.notes || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('שם המוסך הוא שדה חובה');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      if (editingGarage) {
        await garagesAPI.update(editingGarage.id, formData);
        setSnackbar('המוסך עודכן בהצלחה');
      } else {
        await garagesAPI.create(formData);
        setSnackbar('המוסך נוצר בהצלחה');
      }
      setFormOpen(false);
      loadGarages();
    } catch (err) {
      setFormError(err.response?.data?.message || 'שגיאה בשמירת המוסך');
    } finally {
      setSaving(false);
    }
  };

  // ===== מחיקה =====
  const openDelete = (garage, e) => {
    e.stopPropagation();
    setDeletingGarage(garage);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await garagesAPI.delete(deletingGarage.id);
      setSnackbar('המוסך הוסר');
      setDeleteDialogOpen(false);
      loadGarages();
    } catch (err) {
      setSnackbar('שגיאה במחיקת המוסך');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSpecialty = (val) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(val)
        ? prev.specialties.filter((s) => s !== val)
        : [...prev.specialties, val],
    }));
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1.5 : 0,
          mb: isMobile ? 2 : 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: isMobile ? 44 : 52,
              height: isMobile ? 44 : 52,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(245,158,11,0.35)',
              flexShrink: 0,
            }}
          >
            <Store sx={{ color: '#fff', fontSize: isMobile ? 22 : 28 }} />
          </Box>
          <Box>
            <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
              מוסכים
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {garages.filter((g) => g.isActive !== false).length} פעילים • {garages.length} סה"כ
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="רענן">
            <IconButton onClick={loadGarages} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          {hasPermission('maintenance', 'edit') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAdd}
              sx={{ borderRadius: '10px' }}
            >
              {isMobile ? 'הוסף' : 'מוסך חדש'}
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>
      )}

      {/* ===== FILTERS ===== */}
      <Paper elevation={0} sx={{ p: isMobile ? 1.5 : 2, borderRadius: '16px', border: '1px solid #e2e8f0', mb: isMobile ? 2 : 3 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={5} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="חפש לפי שם, עיר, טלפון..."
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
              <InputLabel>התמחות</InputLabel>
              <Select value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value)} label="התמחות" sx={{ borderRadius: '10px' }}>
                <MenuItem value="all">כל ההתמחויות</MenuItem>
                {SPECIALTY_OPTIONS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3.5} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>סטטוס</InputLabel>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="סטטוס" sx={{ borderRadius: '10px' }}>
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="active">פעיל</MenuItem>
                <MenuItem value="inactive">לא פעיל</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* ===== GARAGES GRID ===== */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredGarages.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Store sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#94a3b8', mb: 1 }}>לא נמצאו מוסכים</Typography>
          {hasPermission('maintenance', 'edit') && (
            <Button variant="contained" startIcon={<Add />} onClick={openAdd} sx={{ mt: 1, borderRadius: '10px' }}>
              הוסף מוסך חדש
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={isMobile ? 1.5 : 2}>
          {filteredGarages.map((garage, idx) => (
            <Grid item xs={12} sm={6} md={4} key={garage.id}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  border: garage.isActive !== false ? '1px solid #e2e8f0' : '1px solid #fecaca',
                  bgcolor: garage.isActive !== false ? '#ffffff' : '#fff5f5',
                  animation: `fadeIn 0.3s ease-out ${idx * 0.04}s both`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 10px 30px -5px rgba(99,102,241,0.15)',
                    transform: 'translateY(-3px)',
                    borderColor: '#c7d2fe',
                  },
                  position: 'relative',
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/garages/${garage.id}`)}
                  sx={{ borderRadius: '16px', p: 0 }}
                >
                  <CardContent sx={{ p: isMobile ? 2 : 2.5, pb: '16px !important' }}>
                    {/* כותרת */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 700,
                              color: '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 170,
                            }}
                          >
                            {garage.name}
                          </Typography>
                          {garage.isActive === false && (
                            <Chip label="לא פעיל" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: '0.65rem', height: 18 }} />
                          )}
                        </Box>
                        {garage.rating > 0 && <StarRating value={garage.rating} size={16} />}
                      </Box>

                      {/* כפתורי פעולה */}
                      {hasPermission('maintenance', 'edit') && (
                        <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="ערוך">
                            <IconButton
                              size="small"
                              onClick={(e) => openEdit(garage, e)}
                              sx={{ color: '#94a3b8', '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.08)' } }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="הסר">
                            <IconButton
                              size="small"
                              onClick={(e) => openDelete(garage, e)}
                              sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>

                    {/* פרטי קשר */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, mb: 1.5 }}>
                      {garage.city && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LocationOn sx={{ fontSize: 14, color: '#10b981', flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: '#475569' }}>{garage.city}{garage.address ? ` • ${garage.address}` : ''}</Typography>
                        </Box>
                      )}
                      {garage.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Phone sx={{ fontSize: 14, color: '#3b82f6', flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: '#475569' }}>{garage.phone}</Typography>
                        </Box>
                      )}
                    </Box>

                    {/* התמחויות */}
                    {garage.specialties?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                        {garage.specialties.slice(0, 3).map((s) => (
                          <Chip
                            key={s}
                            label={SPECIALTY_MAP[s] || s}
                            size="small"
                            sx={{ bgcolor: 'rgba(99,102,241,0.07)', color: '#6366f1', fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                          />
                        ))}
                        {garage.specialties.length > 3 && (
                          <Chip label={`+${garage.specialties.length - 3}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', height: 20 }} />
                        )}
                      </Box>
                    )}

                    {/* סטטיסטיקות */}
                    {(garage.totalMaintenances > 0 || garage.totalCost > 0) && (
                      <>
                        <Divider sx={{ mb: 1.5 }} />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>טיפולים</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>
                              {garage.totalMaintenances || 0}
                            </Typography>
                          </Box>
                          {garage.totalCost > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>סה"כ עלות</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                {formatCurrency(garage.totalCost)}
                              </Typography>
                            </Box>
                          )}
                          {garage.averageCost > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>ממוצע</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                {formatCurrency(garage.averageCost)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </>
                    )}

                    {/* קישור לפרטים */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>
                        לפרטים ולהיסטוריה
                        <ChevronLeft fontSize="small" />
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ===== DIALOG הוספה/עריכה ===== */}
      <Dialog
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingGarage ? 'עריכת מוסך' : 'מוסך חדש'}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{formError}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="שם המוסך *"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="עיר"
                value={formData.city}
                onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="טלפון"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="טלפון 2"
                value={formData.phone2}
                onChange={(e) => setFormData((p) => ({ ...p, phone2: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="כתובת"
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="איש קשר"
                value={formData.contactPerson}
                onChange={(e) => setFormData((p) => ({ ...p, contactPerson: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="אימייל"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="שעות פעילות"
                value={formData.workingHours}
                onChange={(e) => setFormData((p) => ({ ...p, workingHours: e.target.value }))}
                size="small"
                placeholder="לדוגמה: א׳-ה׳ 08:00-18:00"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>

            {/* התמחויות */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>
                התמחויות
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {SPECIALTY_OPTIONS.map((s) => (
                  <Chip
                    key={s.value}
                    label={s.label}
                    onClick={() => toggleSpecialty(s.value)}
                    variant={formData.specialties.includes(s.value) ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      ...(formData.specialties.includes(s.value)
                        ? { bgcolor: 'rgba(99,102,241,0.12)', color: '#6366f1', borderColor: '#6366f1' }
                        : { color: '#64748b', borderColor: '#e2e8f0' }),
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {/* דירוג */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.75 }}>
                דירוג
              </Typography>
              <StarRating value={formData.rating} onChange={(v) => setFormData((p) => ({ ...p, rating: v }))} size={26} />
            </Grid>

            {/* הערות */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="הערות"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                multiline
                rows={2}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} disabled={saving} sx={{ color: '#64748b' }}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            sx={{ minWidth: 90, borderRadius: '10px' }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : editingGarage ? 'עדכן' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG מחיקה ===== */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>הסרת מוסך</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            האם להסיר את המוסך <strong>{deletingGarage?.name}</strong>?
            <br />
            הטיפולים הקשורים אליו יישמרו אבל המוסך יסומן כלא פעיל.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ color: '#64748b' }}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' }, borderRadius: '10px', minWidth: 80 }}
          >
            {deleting ? <CircularProgress size={18} color="inherit" /> : 'הסר'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== SNACKBAR ===== */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
