import { useState, useEffect } from 'react';
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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Build,
} from '@mui/icons-material';
import { monthlyChecksAPI } from '../services/api';
import MonthlyCheckDialog from '../components/MonthlyCheckDialog';

export default function MonthlyChecks() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkToDelete, setCheckToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadChecks();
  }, []);

  const loadChecks = async () => {
    try {
      setLoading(true);
      const response = await monthlyChecksAPI.getAll({ search: searchTerm });
      setChecks(response.data.checks || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת בקרות');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadChecks();
  };

  const handleOpenDialog = (check = null) => {
    setEditingCheck(check);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCheck(null);
  };

  const handleSaveCheck = async (checkData) => {
    try {
      if (editingCheck) {
        await monthlyChecksAPI.update(editingCheck.id, checkData);
        showSnackbar('הבקרה עודכנה בהצלחה', 'success');
      } else {
        await monthlyChecksAPI.create(checkData);
        showSnackbar('הבקרה נוספה בהצלחה', 'success');
      }
      handleCloseDialog();
      loadChecks();
    } catch (err) {
      console.error('Error saving check:', err);
      showSnackbar('שגיאה בשמירת הבקרה', 'error');
    }
  };

  const handleDeleteClick = (check) => {
    setCheckToDelete(check);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!checkToDelete) return;

    try {
      await monthlyChecksAPI.delete(checkToDelete.id);
      showSnackbar('הבקרה נמחקה בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setCheckToDelete(null);
      loadChecks();
    } catch (err) {
      console.error('Error deleting check:', err);
      showSnackbar('שגיאה במחיקת הבקרה', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const statusMap = {
      passed: { label: 'עבר', color: 'success' },
      failed: { label: 'נכשל', color: 'error' },
      pending: { label: 'ממתין', color: 'warning' },
    };

    const { label, color} = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          בקרה חודשית
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => handleOpenDialog()}
        >
          בקרה חדשה
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* חיפוש */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="חפש לפי מספר רישוי או רוכב..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            dir="rtl"
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ minWidth: 120 }}
          >
            חיפוש
          </Button>
        </Box>
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
              <TableCell>סטטוס</TableCell>
              <TableCell>הערות</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : checks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 4 }}>
                    <Build sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="textSecondary">
                      לא נמצאו בקרות
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              checks.map((check) => (
                <TableRow key={check.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {check.vehiclePlate}
                    </Typography>
                  </TableCell>
                  <TableCell>{check.riderName || '-'}</TableCell>
                  <TableCell>{formatDate(check.checkDate)}</TableCell>
                  <TableCell>{check.kilometers?.toLocaleString('he-IL') || '0'}</TableCell>
                  <TableCell>{getStatusChip(check.status)}</TableCell>
                  <TableCell>{check.notes || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/monthly-checks/${check.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenDialog(check)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(check)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* סטטיסטיקה */}
      {!loading && checks.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {checks.length} בקרות
          </Typography>
        </Box>
      )}

      {/* Check Dialog */}
      <MonthlyCheckDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveCheck}
        check={editingCheck}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        dir="rtl"
      >
        <DialogTitle>אישור מחיקה</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך למחוק את הבקרה של{' '}
            <strong>{checkToDelete?.vehiclePlate}</strong>?
            <br />
            פעולה זו אינה הפיכה.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            מחק
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
