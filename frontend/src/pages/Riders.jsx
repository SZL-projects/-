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
  Person,
} from '@mui/icons-material';
import { ridersAPI } from '../services/api';
import RiderDialog from '../components/RiderDialog';

export default function Riders() {
  const navigate = useNavigate();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riderToDelete, setRiderToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadRiders();
  }, []);

  const loadRiders = async () => {
    try {
      setLoading(true);
      const response = await ridersAPI.getAll({ search: searchTerm });
      setRiders(response.data.riders || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת רוכבים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadRiders();
  };

  const handleOpenDialog = (rider = null) => {
    setEditingRider(rider);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRider(null);
  };

  const handleSaveRider = async (riderData) => {
    try {
      if (editingRider) {
        await ridersAPI.update(editingRider.id, riderData);
        showSnackbar('הרוכב עודכן בהצלחה', 'success');
      } else {
        await ridersAPI.create(riderData);
        showSnackbar('הרוכב נוסף בהצלחה', 'success');
      }
      handleCloseDialog();
      loadRiders();
    } catch (err) {
      console.error('Error saving rider:', err);
      showSnackbar('שגיאה בשמירת הרוכב', 'error');
    }
  };

  const handleDeleteClick = (rider) => {
    setRiderToDelete(rider);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!riderToDelete) return;

    try {
      await ridersAPI.delete(riderToDelete.id);
      showSnackbar('הרוכב נמחק בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setRiderToDelete(null);
      loadRiders();
    } catch (err) {
      console.error('Error deleting rider:', err);
      showSnackbar('שגיאה במחיקת הרוכב', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success' },
      inactive: { label: 'לא פעיל', color: 'default' },
      frozen: { label: 'מוקפא', color: 'warning' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getAssignmentChip = (status) => {
    const statusMap = {
      assigned: { label: 'משויך', color: 'primary' },
      unassigned: { label: 'לא משויך', color: 'default' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול רוכבים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => handleOpenDialog()}
        >
          רוכב חדש
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
            placeholder="חפש לפי שם, ת''ז או טלפון..."
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

      {/* טבלת רוכבים */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם מלא</TableCell>
              <TableCell>ת"ז</TableCell>
              <TableCell>טלפון</TableCell>
              <TableCell>מחוז</TableCell>
              <TableCell>סטטוס רוכב</TableCell>
              <TableCell>סטטוס שיוך</TableCell>
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
            ) : riders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 4 }}>
                    <Person sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="textSecondary">
                      לא נמצאו רוכבים
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              riders.map((rider) => (
                <TableRow key={rider.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {rider.firstName} {rider.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{rider.idNumber}</TableCell>
                  <TableCell dir="ltr" sx={{ textAlign: 'right' }}>
                    {rider.phone}
                  </TableCell>
                  <TableCell>{rider.region?.district || '-'}</TableCell>
                  <TableCell>{getStatusChip(rider.riderStatus)}</TableCell>
                  <TableCell>{getAssignmentChip(rider.assignmentStatus)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/riders/${rider.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenDialog(rider)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(rider)}
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
      {!loading && riders.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {riders.length} רוכבים
          </Typography>
        </Box>
      )}

      {/* Rider Dialog */}
      <RiderDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveRider}
        rider={editingRider}
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
            האם אתה בטוח שברצונך למחוק את הרוכב{' '}
            <strong>{riderToDelete?.firstName} {riderToDelete?.lastName}</strong>?
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
