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
  TwoWheeler,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';
import VehicleDialog from '../components/VehicleDialog';

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll({ search: searchTerm });
      setVehicles(response.data.vehicles || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת כלים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadVehicles();
  };

  const handleOpenDialog = (vehicle = null) => {
    setEditingVehicle(vehicle);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVehicle(null);
  };

  const handleSaveVehicle = async (vehicleData) => {
    try {
      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle.id, vehicleData);
        showSnackbar('הכלי עודכן בהצלחה', 'success');
      } else {
        await vehiclesAPI.create(vehicleData);
        showSnackbar('הכלי נוסף בהצלחה', 'success');
      }
      handleCloseDialog();
      loadVehicles();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      showSnackbar('שגיאה בשמירת הכלי', 'error');
    }
  };

  const handleDeleteClick = (vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;

    try {
      await vehiclesAPI.delete(vehicleToDelete.id);
      showSnackbar('הכלי נמחק בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
      loadVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      showSnackbar('שגיאה במחיקת הכלי', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success' },
      waiting_for_rider: { label: 'ממתין לרוכב', color: 'warning' },
      faulty: { label: 'תקול', color: 'error' },
      unfit: { label: 'לא כשיר', color: 'error' },
      stolen_lost: { label: 'גנוב/אבוד', color: 'error' },
      decommissioned: { label: 'מושבת', color: 'default' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getTypeLabel = (type) => {
    return type === 'scooter' ? 'קטנוע' : 'אופנוע';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול כלים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => handleOpenDialog()}
        >
          כלי חדש
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
            placeholder="חפש לפי מספר רישוי, מספר פנימי או דגם..."
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

      {/* טבלת כלים */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>מס' רישוי</TableCell>
              <TableCell>מס' פנימי</TableCell>
              <TableCell>סוג</TableCell>
              <TableCell>יצרן</TableCell>
              <TableCell>דגם</TableCell>
              <TableCell>שנה</TableCell>
              <TableCell>ק"מ נוכחי</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Box sx={{ py: 4 }}>
                    <TwoWheeler sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="textSecondary">
                      לא נמצאו כלים
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {vehicle.licensePlate}
                    </Typography>
                  </TableCell>
                  <TableCell>{vehicle.internalNumber || '-'}</TableCell>
                  <TableCell>{getTypeLabel(vehicle.type)}</TableCell>
                  <TableCell>{vehicle.manufacturer}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell>
                    {vehicle.currentKilometers?.toLocaleString('he-IL') || '0'}
                  </TableCell>
                  <TableCell>{getStatusChip(vehicle.status)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenDialog(vehicle)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(vehicle)}
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
      {!loading && vehicles.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {vehicles.length} כלים
          </Typography>
        </Box>
      )}

      {/* Vehicle Dialog */}
      <VehicleDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveVehicle}
        vehicle={editingVehicle}
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
            האם אתה בטוח שברצונך למחוק את הכלי{' '}
            <strong>{vehicleToDelete?.licensePlate}</strong>?
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
