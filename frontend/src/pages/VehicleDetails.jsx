import { useState, useEffect, useMemo } from 'react';
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
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Refresh,
  CreateNewFolder,
  TwoWheeler,
  Speed,
  CalendarMonth,
  Badge as BadgeIcon,
  Factory,
  DirectionsCar,
  FolderOpen,
} from '@mui/icons-material';
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

  // מפת סטטוסים מודרנית
  const statusMap = useMemo(() => ({
    active: { label: 'פעיל', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    waiting_for_rider: { label: 'ממתין לרוכב', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    faulty: { label: 'תקול', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    unfit: { label: 'לא כשיר', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    stolen_lost: { label: 'גנוב/אבוד', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    decommissioned: { label: 'מושבת', bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' },
  }), []);

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
      const foldersToDelete = [
        folderData.insuranceFolderId,
        folderData.archiveFolderId,
        folderData.extrasFolderId,
        ...(folderData.customFolders || []).map(f => f.id)
      ].filter(Boolean);

      for (const folderId of foldersToDelete) {
        try {
          await vehiclesAPI.deleteFile(folderId, true);
        } catch (err) {
          console.warn('⚠️ Failed to delete folder:', folderId, err.message);
        }
      }

      if (folderData.mainFolderId) {
        try {
          await vehiclesAPI.deleteFile(folderData.mainFolderId, true);
        } catch (err) {
          console.warn('⚠️ Failed to delete main folder:', err.message);
        }
      }

      await vehiclesAPI.update(id, {
        driveFolderData: null,
        insuranceFolderId: null,
        archiveFolderId: null,
        extrasFolderId: null,
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
    const statusInfo = statusMap[status] || { label: status, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
    return (
      <Chip
        label={statusInfo.label}
        sx={{
          bgcolor: statusInfo.bgcolor,
          color: statusInfo.color,
          fontWeight: 600,
          fontSize: '0.85rem',
        }}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (error || !vehicle) {
    return (
      <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
        <Alert
          severity="error"
          sx={{
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            mb: 3,
          }}
        >
          {error || 'לא נמצא כלי'}
        </Alert>
        <Button
          onClick={() => navigate('/vehicles')}
          startIcon={<ArrowBack />}
          sx={{
            borderRadius: '12px',
            fontWeight: 600,
            color: '#6366f1',
            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
          }}
        >
          חזרה לרשימת כלים
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        mb: 3,
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/vehicles')}
          sx={{
            borderRadius: '12px',
            fontWeight: 600,
            color: '#64748b',
            '&:hover': { bgcolor: '#f8fafc' },
            alignSelf: { xs: 'flex-start', md: 'center' },
          }}
        >
          חזרה
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}>
            <TwoWheeler sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {vehicle.licensePlate}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {vehicle.manufacturer} {vehicle.model} • {vehicle.year}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          עריכה
        </Button>
      </Box>

      {/* פרטים כלליים */}
      <Paper sx={{
        p: 3,
        mb: 3,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
          פרטים כלליים
        </Typography>
        <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: 'none',
              height: '100%',
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <BadgeIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר רישוי</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.licensePlate}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: 'none',
              height: '100%',
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <BadgeIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>מספר פנימי</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.internalNumber || '-'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: 'none',
              height: '100%',
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <TwoWheeler sx={{ color: '#059669', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>סוג</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.type === 'scooter' ? 'קטנוע' : 'אופנוע'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: 'none',
              height: '100%',
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Factory sx={{ color: '#d97706', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>יצרן ודגם</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.manufacturer} {vehicle.model}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: 'none',
              height: '100%',
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CalendarMonth sx={{ color: '#2563eb', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>שנת ייצור</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.year}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: 'none',
              height: '100%',
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(236, 72, 153, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Speed sx={{ color: '#db2777', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>קילומטרז נוכחי</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {vehicle.currentKilometers?.toLocaleString('he-IL') || '0'} ק"מ
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>סטטוס:</Typography>
              {getStatusChip(vehicle.status)}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* קבצים ומסמכים */}
      <Paper sx={{
        p: 3,
        mb: 3,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {!folderData ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FolderOpen sx={{ color: '#6366f1', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                קבצים ומסמכים
              </Typography>
            </Box>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              טרם נוצרה מבנה תיקיות עבור כלי זה. לחץ על הכפתור ליצירת תיקיות ב-Google Drive.
            </Alert>
            <Button
              variant="contained"
              onClick={createFolderStructure}
              disabled={creatingFolders}
              startIcon={creatingFolders ? <CircularProgress size={20} color="inherit" /> : <CreateNewFolder />}
              sx={{
                borderRadius: '12px',
                px: 3,
                py: 1.5,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  boxShadow: 'none',
                },
              }}
            >
              {creatingFolders ? 'יוצר תיקיות...' : 'צור מבנה תיקיות'}
            </Button>
          </>
        ) : (
          <>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 3,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FolderOpen sx={{ color: '#6366f1', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  קבצים ומסמכים
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={refreshFolders}
                  disabled={refreshingFolders || creatingFolders}
                  size="small"
                  startIcon={refreshingFolders ? <CircularProgress size={16} sx={{ color: '#6366f1' }} /> : <Refresh />}
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    borderColor: '#e2e8f0',
                    color: '#6366f1',
                    '&:hover': {
                      borderColor: '#6366f1',
                      bgcolor: 'rgba(99, 102, 241, 0.05)',
                    },
                  }}
                >
                  {refreshingFolders ? 'מרענן...' : 'רענן תיקיות'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setAddFolderDialogOpen(true)}
                  disabled={creatingFolders}
                  size="small"
                  startIcon={<CreateNewFolder />}
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    borderColor: '#e2e8f0',
                    color: '#059669',
                    '&:hover': {
                      borderColor: '#059669',
                      bgcolor: 'rgba(16, 185, 129, 0.05)',
                    },
                  }}
                >
                  הוסף תיקייה
                </Button>
                <Button
                  variant="outlined"
                  onClick={deleteFolderStructure}
                  disabled={creatingFolders}
                  size="small"
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    borderColor: '#e2e8f0',
                    color: '#ef4444',
                    '&:hover': {
                      borderColor: '#ef4444',
                      bgcolor: 'rgba(239, 68, 68, 0.05)',
                    },
                  }}
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
          </>
        )}
      </Paper>

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
          sx={{
            borderRadius: '12px',
            fontWeight: 500,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          }}
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
        PaperProps={{
          sx: {
            borderRadius: '20px',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CreateNewFolder sx={{ fontSize: 24, color: '#ffffff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              הוספת תיקייה חדשה
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="שם התיקייה"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="לדוגמה: תאונה, מסמכים נוספים..."
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
          <Button
            onClick={() => {
              setAddFolderDialogOpen(false);
              setNewFolderName('');
            }}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.2,
              fontWeight: 600,
              borderColor: '#e2e8f0',
              color: '#64748b',
              '&:hover': {
                borderColor: '#cbd5e1',
                bgcolor: '#f8fafc',
              },
            }}
          >
            ביטול
          </Button>
          <Button
            onClick={addCustomFolder}
            variant="contained"
            disabled={creatingFolders || !newFolderName.trim()}
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
              '&:disabled': {
                background: '#e2e8f0',
                boxShadow: 'none',
              },
            }}
          >
            {creatingFolders ? 'יוצר...' : 'צור תיקייה'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
