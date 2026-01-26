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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { ArrowBack, Edit, Refresh, CreateNewFolder } from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';
import VehicleFiles from '../components/VehicleFiles';
import VehicleDialog from '../components/VehicleDialog';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [folderData, setFolderData] = useState(null);
  const [creatingFolders, setCreatingFolders] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addFolderDialogOpen, setAddFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [refreshingFolders, setRefreshingFolders] = useState(false);

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

  const handleEditVehicle = async (formData) => {
    try {
      await vehiclesAPI.update(id, formData);
      showSnackbar('הכלי עודכן בהצלחה', 'success');
      setEditDialogOpen(false);
      loadVehicle();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בעדכון הכלי', 'error');
    }
  };

  const createFolderStructure = async () => {
    if (!vehicle) return;

    setCreatingFolders(true);
    try {
      const response = await vehiclesAPI.createFolder(
        vehicle.internalNumber || vehicle.licensePlate,
        id
      );
      setFolderData(response.data.data);
      showSnackbar('תיקיות נוצרו בהצלחה', 'success');
      // רענון נתוני הכלי
      await loadVehicle();
    } catch (err) {
      console.error('Error creating folders:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה ביצירת תיקיות', 'error');
    } finally {
      setCreatingFolders(false);
    }
  };

  const refreshFolders = async () => {
    if (!folderData) return;

    setRefreshingFolders(true);
    try {
      const response = await vehiclesAPI.refreshFolders(id);
      showSnackbar(response.data.message, 'success');
      await loadVehicle();
    } catch (err) {
      console.error('Error refreshing folders:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בריענון התיקיות', 'error');
    } finally {
      setRefreshingFolders(false);
    }
  };

  const addCustomFolder = async () => {
    if (!newFolderName.trim()) {
      showSnackbar('נא להזין שם תיקייה', 'error');
      return;
    }

    setCreatingFolders(true);
    try {
      await vehiclesAPI.addCustomFolder(id, newFolderName.trim());
      showSnackbar('תיקייה נוצרה בהצלחה', 'success');
      setAddFolderDialogOpen(false);
      setNewFolderName('');
      await loadVehicle();
    } catch (err) {
      console.error('Error adding custom folder:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה ביצירת תיקייה', 'error');
    } finally {
      setCreatingFolders(false);
    }
  };

  const deleteFolderStructure = async () => {
    if (!folderData || !window.confirm('האם אתה בטוח שברצונך למחוק את כל מבנה התיקיות? פעולה זו תמחק את כל הקבצים!')) {
      return;
    }

    setCreatingFolders(true);
    try {
      // מחיקת כל תת-התיקיות אחת אחת
      const foldersToDelete = [
        folderData.insuranceFolderId,
        folderData.archiveFolderId,
        folderData.photosFolderId,
        folderData.miscFolderId,
        ...(folderData.customFolders || []).map(f => f.id)
      ].filter(Boolean); // מסנן רק IDs שקיימים

      // מחיקת כל תת-תיקייה (רקורסיבית - כולל כל הקבצים בתוכה)
      for (const folderId of foldersToDelete) {
        try {
          await vehiclesAPI.deleteFile(folderId, true); // recursive=true
        } catch (err) {
          console.warn('⚠️ Failed to delete folder:', folderId, err.message);
          // ממשיכים גם אם נכשל
        }
      }

      // מחיקת התיקייה הראשית (רקורסיבית)
      if (folderData.mainFolderId) {
        try {
          await vehiclesAPI.deleteFile(folderData.mainFolderId, true); // recursive=true
        } catch (err) {
          console.warn('⚠️ Failed to delete main folder:', err.message);
        }
      }

      // עדכון הכלי - הסרת נתוני התיקיות
      await vehiclesAPI.update(id, {
        driveFolderData: null,
        insuranceFolderId: null,
        archiveFolderId: null,
        photosFolderId: null,
        miscFolderId: null
      });

      setFolderData(null);
      showSnackbar('מבנה התיקיות נמחק בהצלחה', 'success');
      await loadVehicle();
    } catch (err) {
      console.error('Error deleting folders:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה במחיקת תיקיות', 'error');
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
          onClick={() => setEditDialogOpen(true)}
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
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6">
                קבצים ומסמכים
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={refreshFolders}
                  disabled={refreshingFolders || creatingFolders}
                  size="small"
                  startIcon={refreshingFolders ? <CircularProgress size={16} /> : <Refresh />}
                >
                  {refreshingFolders ? 'מרענן...' : 'רענן תיקיות'}
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => setAddFolderDialogOpen(true)}
                  disabled={creatingFolders}
                  size="small"
                  startIcon={<CreateNewFolder />}
                >
                  הוסף תיקייה
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={deleteFolderStructure}
                  disabled={creatingFolders}
                  size="small"
                >
                  מחק מבנה תיקיות
                </Button>
              </Box>
            </Box>
            <VehicleFiles
              vehicleNumber={vehicle.internalNumber || vehicle.licensePlate}
              vehicleFolderData={folderData}
              vehicleId={id}
              onFolderDeleted={loadVehicle}
            />
          </Box>
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

      {/* Edit Vehicle Dialog */}
      <VehicleDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditVehicle}
        vehicle={vehicle}
      />

      {/* Add Folder Dialog */}
      <Dialog
        open={addFolderDialogOpen}
        onClose={() => {
          setAddFolderDialogOpen(false);
          setNewFolderName('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>הוספת תיקייה חדשה</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="שם התיקייה"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="לדוגמה: תאונה, מסמכים נוספים..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddFolderDialogOpen(false);
              setNewFolderName('');
            }}
          >
            ביטול
          </Button>
          <Button
            onClick={addCustomFolder}
            variant="contained"
            disabled={creatingFolders || !newFolderName.trim()}
          >
            {creatingFolders ? 'יוצר...' : 'צור תיקייה'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
