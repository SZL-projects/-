import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';
import VehicleFiles from '../components/VehicleFiles';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [folderData, setFolderData] = useState(null);
  const [creatingFolders, setCreatingFolders] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadVehicle();
  }, [id]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getById(id);
      setVehicle(response.data.vehicle);

      if (response.data.vehicle.driveFolderData) {
        setFolderData(response.data.vehicle.driveFolderData);
      }
    } catch (err) {
      setError('שגיאה בטעינת פרטי הכלי');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const createFolderStructure = async () => {
    if (!vehicle) return;

    setCreatingFolders(true);
    try {
      const response = await vehiclesAPI.createFolder(vehicle.internalNumber || vehicle.licensePlate);
      setFolderData(response.data.data);
      showSnackbar('תיקיות נוצרו בהצלחה', 'success');
    } catch (err) {
      console.error('Error creating folders:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה ביצירת תיקיות', 'error');
    } finally {
      setCreatingFolders(false);
    }
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
    return <Chip label={label} color={color} />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !vehicle) {
    return (
      <Box>
        <Alert severity="error">{error || 'לא נמצא כלי'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/vehicles')}>
          חזרה לרשימת כלים
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/vehicles')}
          sx={{ mr: 2 }}
        >
          חזרה
        </Button>
        <Typography variant="h4" fontWeight="bold">
          פרטי כלי - {vehicle.licensePlate}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          sx={{ mr: 'auto' }}
        >
          עריכה
        </Button>
      </Box>

      {/* פרטים כלליים */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          פרטים כלליים
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              מספר רישוי
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.licensePlate}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              מספר פנימי
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.internalNumber || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              סוג
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.type === 'scooter' ? 'קטנוע' : 'אופנוע'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              סטטוס
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {getStatusChip(vehicle.status)}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              יצרן
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.manufacturer}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              דגם
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.model}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              שנת ייצור
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.year}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              קילומטרז נוכחי
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {vehicle.currentKilometers?.toLocaleString('he-IL') || '0'} ק"מ
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* קבצים ומסמכים */}
      <Box sx={{ mb: 3 }}>
        {!folderData ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              קבצים ומסמכים
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              טרם נוצרה מבנה תיקיות עבור כלי זה. לחץ על הכפתור ליצירת תיקיות ב-Google Drive.
            </Alert>
            <Button
              variant="contained"
              onClick={createFolderStructure}
              disabled={creatingFolders}
            >
              {creatingFolders ? 'יוצר תיקיות...' : 'צור מבנה תיקיות'}
            </Button>
          </Paper>
        ) : (
          <VehicleFiles
            vehicleNumber={vehicle.internalNumber || vehicle.licensePlate}
            vehicleFolderData={folderData}
          />
        )}
      </Box>

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
