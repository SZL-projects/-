import { useState, useEffect, useCallback, memo } from 'react';
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
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Person,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { ridersAPI, vehiclesAPI } from '../services/api';
import RiderDialog from '../components/RiderDialog';
import { useDebounce } from '../hooks/useDebounce';

export default function Riders() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riderToDelete, setRiderToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadRiders();
  }, [debouncedSearchTerm]); // שינוי: מאזין ל-debouncedSearchTerm במקום טעינה ראשונית

  const loadRiders = async () => {
    try {
      setLoading(true);
      const response = await ridersAPI.getAll({ search: debouncedSearchTerm });
      setRiders(response.data.riders || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת רוכבים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = useCallback((rider = null) => {
    setEditingRider(rider);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingRider(null);
  }, []);

  const handleSaveRider = useCallback(async (riderData) => {
    try {
      if (editingRider) {
        // עדכון רוכב קיים
        const oldVehicleId = editingRider.assignedVehicleId;
        const newVehicleId = riderData.assignedVehicleId;
        const oldAssignmentStatus = editingRider.assignmentStatus;
        const newAssignmentStatus = riderData.assignmentStatus;

        console.log('Riders - Assignment change:', {
          oldVehicleId,
          newVehicleId,
          oldAssignmentStatus,
          newAssignmentStatus
        });

        // טיפול בשינוי שיוך הכלי - לפני עדכון הרוכב!
        // מקרה 1: רוכב שהיה משויך ועכשיו לא משויך - לבטל שיוך
        if (oldAssignmentStatus === 'assigned' && newAssignmentStatus === 'unassigned' && oldVehicleId) {
          console.log('Riders - Unassigning vehicle:', oldVehicleId);
          await vehiclesAPI.unassign(oldVehicleId);
        }
        // מקרה 2: רוכב שלא היה משויך ועכשיו משויך - לשייך
        else if (oldAssignmentStatus === 'unassigned' && newAssignmentStatus === 'assigned' && newVehicleId) {
          console.log('Riders - Assigning vehicle:', newVehicleId);
          await vehiclesAPI.assign(newVehicleId, editingRider.id);
        }
        // מקרה 3: רוכב משויך שמחליף כלי - לבטל את הישן ולשייך את החדש
        else if (oldAssignmentStatus === 'assigned' && newAssignmentStatus === 'assigned' && oldVehicleId !== newVehicleId) {
          if (oldVehicleId) {
            console.log('Riders - Unassigning old vehicle:', oldVehicleId);
            try {
              await vehiclesAPI.unassign(oldVehicleId);
            } catch (err) {
              console.warn('Error unassigning old vehicle:', err);
            }
          }
          if (newVehicleId) {
            console.log('Riders - Assigning new vehicle:', newVehicleId);
            await vehiclesAPI.assign(newVehicleId, editingRider.id);
          }
        }

        // עדכון פרטי הרוכב (ללא שדות השיוך - הם כבר עודכנו על ידי assign/unassign)
        const riderDataWithoutAssignment = { ...riderData };
        delete riderDataWithoutAssignment.assignedVehicleId;
        delete riderDataWithoutAssignment.assignmentStatus;

        await ridersAPI.update(editingRider.id, riderDataWithoutAssignment);

        showSnackbar('הרוכב עודכן בהצלחה', 'success');
      } else {
        // יצירת רוכב חדש
        const newVehicleId = riderData.assignedVehicleId;
        const newAssignmentStatus = riderData.assignmentStatus;

        // יצירת הרוכב (ללא שדות השיוך)
        const riderDataWithoutAssignment = { ...riderData };
        delete riderDataWithoutAssignment.assignedVehicleId;
        delete riderDataWithoutAssignment.assignmentStatus;

        const response = await ridersAPI.create(riderDataWithoutAssignment);
        const newRiderId = response.data.rider.id;

        // אם צריך לשייך כלי
        if (newAssignmentStatus === 'assigned' && newVehicleId) {
          console.log('Riders - Creating new rider and assigning vehicle:', newVehicleId);
          await vehiclesAPI.assign(newVehicleId, newRiderId);
        }

        showSnackbar('הרוכב נוסף בהצלחה', 'success');
      }
      handleCloseDialog();
      loadRiders();
    } catch (err) {
      console.error('Error saving rider:', err);
      showSnackbar('שגיאה בשמירת הרוכב', 'error');
    }
  }, [editingRider, handleCloseDialog, loadRiders]);

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
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          ניהול רוכבים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size={isMobile ? 'medium' : 'large'}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
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
        <TextField
          fullWidth
          placeholder="חפש לפי שם, ת''ז או טלפון..."
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

      {/* תוכן רוכבים - טבלה למסכים גדולים, כרטיסים למובייל */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : riders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Person sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography color="textSecondary">
            לא נמצאו רוכבים
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile View - Cards
        <Stack spacing={2}>
          {riders.map((rider) => (
            <Card key={rider.id} sx={{ dir: 'rtl' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {rider.firstName} {rider.lastName}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    {getStatusChip(rider.riderStatus)}
                    {getAssignmentChip(rider.assignmentStatus)}
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BadgeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      ת"ז: {rider.idNumber}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" dir="ltr" sx={{ textAlign: 'right', width: '100%' }}>
                      {rider.phone}
                    </Typography>
                  </Box>

                  {rider.region?.district && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        מחוז: {rider.region.district}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/riders/${rider.id}`)}
                >
                  צפייה
                </Button>
                <Box>
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => handleOpenDialog(rider)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick(rider)}
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
              {riders.map((rider) => (
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
