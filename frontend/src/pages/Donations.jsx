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
  Tabs,
  Tab,
  Menu,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  Refresh,
  Add,
  VolunteerActivism,
  Person,
  Visibility,
  AccountBalance,
  RemoveCircleOutline,
  ArrowDropDown,
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

const expenseCategoryLabels = {
  retreat: 'גיבוש',
  equipment: 'ציוד',
  food: 'אוכל',
  transport: 'הסעות',
  other: 'אחר',
};

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
  const [editingType, setEditingType] = useState('donation');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDonation, setDeletingDonation] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0=הכל, 1=תרומות, 2=הוצאות
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);

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
    let totalDonations = 0;
    let totalExpenses = 0;
    let donationsCount = 0;
    let expensesCount = 0;

    for (const d of donations) {
      const type = d.type || 'donation';
      if (type === 'expense') {
        totalExpenses += d.amount || 0;
        expensesCount++;
      } else {
        totalDonations += d.amount || 0;
        donationsCount++;
      }
    }

    return {
      total: donations.length,
      donationsCount,
      expensesCount,
      totalDonations,
      totalExpenses,
      balance: totalDonations - totalExpenses,
    };
  }, [donations]);

  // סינון
  const filteredDonations = useMemo(() => {
    let result = [...donations];

    // סינון לפי טאב
    if (activeTab === 1) {
      result = result.filter(d => (d.type || 'donation') === 'donation');
    } else if (activeTab === 2) {
      result = result.filter(d => d.type === 'expense');
    }

    if (filterPaymentMethod !== 'all') {
      result = result.filter(d => d.paymentMethod === filterPaymentMethod);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.donationNumber?.toLowerCase().includes(search) ||
        d.riderName?.toLowerCase().includes(search) ||
        d.notes?.toLowerCase().includes(search) ||
        d.category?.toLowerCase().includes(search) ||
        String(d.amount).includes(search)
      );
    }

    return result;
  }, [donations, activeTab, filterPaymentMethod, searchTerm]);

  const handleAddDonation = useCallback(() => {
    setEditingDonation(null);
    setEditingType('donation');
    setEditDialogOpen(true);
    setAddMenuAnchor(null);
  }, []);

  const handleAddExpense = useCallback(() => {
    setEditingDonation(null);
    setEditingType('expense');
    setEditDialogOpen(true);
    setAddMenuAnchor(null);
  }, []);

  const handleEdit = useCallback((donation) => {
    setEditingDonation(donation);
    setEditingType(donation.type || 'donation');
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
      console.error('Error deleting:', err);
      setError('שגיאה במחיקה');
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
            <AccountBalance sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              קופה
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ניהול תרומות והוצאות
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
            endIcon={<ArrowDropDown />}
            onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            size={isMobile ? 'small' : 'medium'}
          >
            הוספה
          </Button>
          <Menu
            anchorEl={addMenuAnchor}
            open={Boolean(addMenuAnchor)}
            onClose={() => setAddMenuAnchor(null)}
          >
            <MenuItem onClick={handleAddDonation}>
              <VolunteerActivism sx={{ ml: 1, color: '#10b981' }} fontSize="small" />
              תרומה חדשה
            </MenuItem>
            <MenuItem onClick={handleAddExpense}>
              <RemoveCircleOutline sx={{ ml: 1, color: '#ef4444' }} fontSize="small" />
              הוצאה חדשה
            </MenuItem>
          </Menu>
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
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {formatCurrency(stats.totalDonations)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                סה"כ תרומות ({stats.donationsCount})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {formatCurrency(stats.totalExpenses)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                סה"כ הוצאות ({stats.expensesCount})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ border: '2px solid', borderColor: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
                {formatCurrency(stats.balance)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                יתרה בקופה
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#6366f1' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                סה"כ רשומות
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* טאבים */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="הכל" />
          <Tab label={`תרומות (${stats.donationsCount})`} />
          <Tab label={`הוצאות (${stats.expensesCount})`} />
        </Tabs>
      </Paper>

      {/* חיפוש וסינון */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="חיפוש..."
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
          {activeTab !== 2 && (
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
          )}
          <Grid item xs={12} sm={12} md={5}>
            <Typography variant="body2" color="text.secondary">
              {filteredDonations.length} רשומות מוצגות מתוך {donations.length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* טבלה / כרטיסים */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredDonations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {donations.length === 0 ? 'אין רשומות במערכת' : 'לא נמצאו רשומות מתאימות'}
              </Typography>
            </Paper>
          ) : (
            filteredDonations.map((donation) => {
              const isExp = donation.type === 'expense';
              return (
                <Paper key={donation.id} onClick={() => handleEdit(donation)} sx={{ p: 2, borderRight: `4px solid ${isExp ? '#ef4444' : '#10b981'}`, cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={isExp ? 'הוצאה' : 'תרומה'}
                          size="small"
                          sx={{
                            bgcolor: isExp ? '#fef2f2' : '#f0fdf4',
                            color: isExp ? '#ef4444' : '#10b981',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {donation.donationNumber}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {isExp ? (expenseCategoryLabels[donation.category] || donation.notes || 'הוצאה') : (donation.riderName || 'לא ידוע')}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: isExp ? '#ef4444' : '#10b981' }}>
                      {isExp ? '-' : '+'}{formatCurrency(donation.amount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(donation.donationDate)}
                    </Typography>
                    <Box onClick={(e) => e.stopPropagation()}>
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
              );
            })
          )}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>סוג</TableCell>
                <TableCell>מספר אסמכתא</TableCell>
                <TableCell>רוכב / תיאור</TableCell>
                <TableCell>סכום</TableCell>
                <TableCell>אמצעי תשלום / קטגוריה</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>הערות</TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDonations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {donations.length === 0 ? 'אין רשומות במערכת' : 'לא נמצאו רשומות מתאימות'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDonations.map((donation) => {
                  const isExp = donation.type === 'expense';
                  return (
                    <TableRow key={donation.id} hover onClick={() => handleEdit(donation)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Chip
                          label={isExp ? 'הוצאה' : 'תרומה'}
                          size="small"
                          sx={{
                            bgcolor: isExp ? '#fef2f2' : '#f0fdf4',
                            color: isExp ? '#ef4444' : '#10b981',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {donation.donationNumber || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" sx={{ color: '#64748b' }} />
                          <Typography variant="body2">
                            {donation.riderName || (isExp ? (expenseCategoryLabels[donation.category] || '-') : 'לא ידוע')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: isExp ? '#ef4444' : '#10b981' }}>
                          {isExp ? '-' : '+'}{formatCurrency(donation.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {isExp ? (
                          <Chip
                            label={expenseCategoryLabels[donation.category] || 'אחר'}
                            size="small"
                            sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            label={paymentMethodLabels[donation.paymentMethod] || donation.paymentMethod}
                            size="small"
                            sx={{
                              bgcolor: `${paymentMethodColors[donation.paymentMethod] || '#64748b'}20`,
                              color: paymentMethodColors[donation.paymentMethod] || '#64748b',
                              fontWeight: 600,
                            }}
                          />
                        )}
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
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
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
                  );
                })
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
        type={editingType}
      />

      {/* דיאלוג אישור מחיקה */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        dir="rtl"
      >
        <DialogTitle>מחיקת {deletingDonation?.type === 'expense' ? 'הוצאה' : 'תרומה'}</DialogTitle>
        <DialogContent>
          <Typography>
            האם למחוק את ה{deletingDonation?.type === 'expense' ? 'הוצאה' : 'תרומה'} {deletingDonation?.donationNumber}
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
            {selectedDonation?.type === 'expense'
              ? <RemoveCircleOutline sx={{ color: '#ef4444' }} />
              : <VolunteerActivism sx={{ color: '#6366f1' }} />
            }
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              פרטי {selectedDonation?.type === 'expense' ? 'הוצאה' : 'תרומה'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {selectedDonation?.donationNumber}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedDonation && (
            <Grid container spacing={2}>
              {selectedDonation.riderName && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">רוכב</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedDonation.riderName}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">סכום</Typography>
                <Typography variant="h5" sx={{
                  fontWeight: 700,
                  color: selectedDonation.type === 'expense' ? '#ef4444' : '#10b981'
                }}>
                  {selectedDonation.type === 'expense' ? '-' : '+'}{formatCurrency(selectedDonation.amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                {selectedDonation.type === 'expense' ? (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">קטגוריה</Typography>
                    <Chip
                      label={expenseCategoryLabels[selectedDonation.category] || 'אחר'}
                      sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 600, mt: 0.5 }}
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">תאריך</Typography>
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
                  <Typography variant="subtitle2" color="text.secondary">
                    {selectedDonation.type === 'expense' ? 'תיאור' : 'הערות'}
                  </Typography>
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
