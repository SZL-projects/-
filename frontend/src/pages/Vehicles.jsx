import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Card,
  CardContent,
  CardActions,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  Grid,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  TwoWheeler,
  DirectionsCar as CarIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';
import VehicleDialog from '../components/VehicleDialog';
import { useDebounce } from '../hooks/useDebounce';

export default function Vehicles() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadVehicles();
  }, [debouncedSearchTerm]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll({ search: debouncedSearchTerm });
      setVehicles(response.data.vehicles || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת כלים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = useCallback((vehicle = null) => {
    setEditingVehicle(vehicle);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingVehicle(null);
  }, []);

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

  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // מיפוי סטטוסים - מוגדר מחוץ לרנדר למניעת יצירה מחדש
  const statusMap = useMemo(() => ({
    active: { label: 'פעיל', color: 'success' },
    waiting_for_rider: { label: 'ממתין לרוכב', color: 'warning' },
    faulty: { label: 'תקול', color: 'error' },
    unfit: { label: 'לא כשיר', color: 'error' },
    stolen_lost: { label: 'גנוב/אבוד', color: 'error' },
    decommissioned: { label: 'מושבת', color: 'default' },
  }), []);

  const getStatusChip = useCallback((status) => {
    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  }, [statusMap]);

  const getTypeLabel = useCallback((type) => {
    return type === 'scooter' ? 'קטנוע' : 'אופנוע';
  }, []);

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          ניהול כלים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size={isMobile ? 'medium' : 'large'}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
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
        <TextField
          fullWidth
          placeholder="חפש לפי מספר רישוי, מספר פנימי או דגם..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          dir="rtl"
          size={isMobile ? 'small' : 'medium'}
        />
      </Paper>

      {/* תוכן כלים - טבלה למסכים גדולים, כרטיסים למובייל */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : vehicles.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <TwoWheeler sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography color="textSecondary">
            לא נמצאו כלים
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile View - Cards
        <Stack spacing={2}>
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} sx={{ dir: 'rtl' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {vehicle.licensePlate}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {vehicle.internalNumber ? `מס' פנימי: ${vehicle.internalNumber}` : ''}
                    </Typography>
                  </Box>
                  {getStatusChip(vehicle.status)}
                </Box>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {getTypeLabel(vehicle.type)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {vehicle.year}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" fontWeight="500">
                      {vehicle.manufacturer} {vehicle.model}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SpeedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {vehicle.currentKilometers?.toLocaleString('he-IL') || '0'} ק"מ
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                >
                  צפייה
                </Button>
                <Box>
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => handleOpenDialog(vehicle)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick(vehicle)}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop View - Table
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
              {vehicles.map((vehicle) => (
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
