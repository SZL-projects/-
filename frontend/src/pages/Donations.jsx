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
  Tooltip,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  Refresh,
  Add,
  VolunteerActivism,
  AttachMoney,
  Person,
  CreditCard,
  Visibility,
} from '@mui/icons-material';
import { donationsAPI, ridersAPI } from '../services/api';
import DonationDialog from '../components/DonationDialog';
import { useAuth } from '../contexts/AuthContext';

const paymentMethodLabels = {
  credit_card: 'אשראי',
  bit: 'ביט',
  nedarim_plus: 'נדרים פלוס',
  other: 'אחר',
};

const paymentMethodColors = {
  credit_card: '#6366f1',
  bit: '#10b981',
  nedarim_plus: '#f59e0b',
  other: '#64748b',
};

// פורמט תאריך
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  try {
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('he-IL');
  } catch {
    return '-';
  }
};

// פורמט מספר לש"ח
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return `₪${Number(amount).toLocaleString('he-IL')}`;
};

export default function Donations() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser, hasPermission } = useAuth();

  const [donations, setDonations] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDonation, setDeletingDonation] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [donationsRes, ridersRes] = await Promise.all([
        donationsAPI.getAll().catch(() => ({ data: { donations: [] } })),
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
      ]);

      setDonations(donationsRes.data.donations || []);
      setRiders(ridersRes.data.riders || []);
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
    let totalAmount = 0;
    let countByMethod = {};

    for (const d of donations) {
      totalAmount += d.amount || 0;
      const method = d.paymentMethod || 'other';
      countByMethod[method] = (countByMethod[method] || 0) + 1;
    }

    return {
      total: donations.length,
      totalAmount,
      countByMethod,
    };
  }, [donations]);

  // סינון תרומות
  const filteredDonations = useMemo(() => {
    let result = [...donations];

    if (filterPaymentMethod !== 'all') {
      result = result.filter(d => d.paymentMethod === filterPaymentMethod);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.donationNumber?.toLowerCase().includes(search) ||
        d.riderName?.toLowerCase().includes(search) ||
        d.notes?.toLowerCase().includes(search) ||
        String(d.amount).includes(search)
      );
    }

    return result;
  }, [donations, filterPaymentMethod, searchTerm]);

  const handleAdd = useCallback(() => {
    setEditingDonation(null);
    setEditDialogOpen(true);
  }, []);

  const handleEdit = useCallback((donation) => {
    setEditingDonation(donation);
    setEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((donation) => {
    setSelectedDonation(donation);
    setDetailsDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((donation) => {
    setDeletingDonation(donation);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingDonation) return;
    try {
      await donationsAPI.delete(deletingDonation.id);
      await loadData();
      setDeleteDialogOpen(false);
      setDeletingDonation(null);
    } catch (err) {
      console.error('Error deleting donation:', err);
      setError('שגיאה במחיקת התרומה');
    }
  }, [deletingDonation]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ direction: 'rtl' }}>
      {/* כותרת */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <VolunteerActivism sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              תרומות
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ניהול תרומות ותורמים
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            size={isMobile ? 'small' : 'medium'}
          >
            רענון
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            size={isMobile ? 'small' : 'medium'}
          >
            תרומה חדשה
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* כרטיסי סטטיסטיקות */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#6366f1' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                סה"כ תרומות
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {formatCurrency(stats.totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                סה"כ סכום
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {stats.countByMethod['credit_card'] || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                אשראי
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {(stats.countByMethod['bit'] || 0) + (stats.countByMethod['nedarim_plus'] || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ביט / נדרים פלוס
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* חיפוש וסינון */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="חיפוש תרומות..."
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
            <FormControl fullWidth size="small">
              <InputLabel>אמצעי תשלום</InputLabel>
              <Select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                label="אמצעי תשלום"
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="credit_card">אשראי</MenuItem>
                <MenuItem value="bit">ביט</MenuItem>
                <MenuItem value="nedarim_plus">נדרים פלוס</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={5}>
            <Typography variant="body2" color="text.secondary">
              {filteredDonations.length} תרומות מוצגות מתוך {donations.length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* טבלת תרומות */}
      {isMobile ? (
        // תצוגת מובייל - כרטיסים
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredDonations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {donations.length === 0 ? 'אין תרומות במערכת' : 'לא נמצאו תרומות מתאימות'}
              </Typography>
            </Paper>
          ) : (
            filteredDonations.map((donation) => (
              <Paper key={donation.id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {donation.riderName || 'לא ידוע'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {donation.donationNumber}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(donation.amount)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={paymentMethodLabels[donation.paymentMethod] || donation.paymentMethod}
                      size="small"
                      sx={{
                        bgcolor: `${paymentMethodColors[donation.paymentMethod] || '#64748b'}20`,
                        color: paymentMethodColors[donation.paymentMethod] || '#64748b',
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(donation.donationDate)}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleViewDetails(donation)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEdit(donation)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenDelete(donation)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))
          )}
        </Box>
      ) : (
        // תצוגת דסקטופ - טבלה
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>מספר תרומה</TableCell>
                <TableCell>רוכב</TableCell>
                <TableCell>סכום</TableCell>
                <TableCell>אמצעי תשלום</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>הערות</TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDonations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {donations.length === 0 ? 'אין תרומות במערכת' : 'לא נמצאו תרומות מתאימות'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDonations.map((donation) => (
                  <TableRow key={donation.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {donation.donationNumber || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" sx={{ color: '#64748b' }} />
                        <Typography variant="body2">
                          {donation.riderName || 'לא ידוע'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>
                        {formatCurrency(donation.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={paymentMethodLabels[donation.paymentMethod] || donation.paymentMethod}
                        size="small"
                        sx={{
                          bgcolor: `${paymentMethodColors[donation.paymentMethod] || '#64748b'}20`,
                          color: paymentMethodColors[donation.paymentMethod] || '#64748b',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(donation.donationDate)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {donation.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="צפייה">
                        <IconButton size="small" onClick={() => handleViewDetails(donation)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="עריכה">
                        <IconButton size="small" onClick={() => handleEdit(donation)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="מחיקה">
                        <IconButton size="small" onClick={() => handleOpenDelete(donation)} color="error">
                          <Delete fontSize="small" />
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

      {/* דיאלוג יצירה/עריכה */}
      <DonationDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        donation={editingDonation}
        riders={riders}
        onSave={loadData}
      />

      {/* דיאלוג אישור מחיקה */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        dir="rtl"
      >
        <DialogTitle>מחיקת תרומה</DialogTitle>
        <DialogContent>
          <Typography>
            האם למחוק את התרומה {deletingDonation?.donationNumber}
            {deletingDonation?.riderName ? ` של ${deletingDonation.riderName}` : ''}
            {deletingDonation?.amount ? ` בסך ${formatCurrency(deletingDonation.amount)}` : ''}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            מחיקה
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג פרטים */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VolunteerActivism sx={{ color: '#6366f1' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              פרטי תרומה
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {selectedDonation?.donationNumber}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedDonation && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">רוכב</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedDonation.riderName || 'לא ידוע'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">סכום</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {formatCurrency(selectedDonation.amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">אמצעי תשלום</Typography>
                <Chip
                  label={paymentMethodLabels[selectedDonation.paymentMethod] || selectedDonation.paymentMethod}
                  sx={{
                    bgcolor: `${paymentMethodColors[selectedDonation.paymentMethod] || '#64748b'}20`,
                    color: paymentMethodColors[selectedDonation.paymentMethod] || '#64748b',
                    fontWeight: 600,
                    mt: 0.5,
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">תאריך תרומה</Typography>
                <Typography variant="body1">
                  {formatDate(selectedDonation.donationDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">תאריך יצירה</Typography>
                <Typography variant="body1">
                  {formatDate(selectedDonation.createdAt)}
                </Typography>
              </Grid>
              {selectedDonation.notes && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">הערות</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedDonation.notes}
                  </Typography>
                </Grid>
              )}
              {selectedDonation.documents?.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    קבצים ({selectedDonation.documents.length})
                  </Typography>
                  {selectedDonation.documents.map((doc, index) => (
                    <Chip
                      key={index}
                      label={doc.originalName || doc.filename}
                      variant="outlined"
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                      onClick={() => doc.webViewLink && window.open(doc.webViewLink, '_blank')}
                    />
                  ))}
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailsDialogOpen(false)}>סגירה</Button>
          <Button
            variant="contained"
            onClick={() => {
              setDetailsDialogOpen(false);
              handleEdit(selectedDonation);
            }}
            startIcon={<Edit />}
          >
            עריכה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
