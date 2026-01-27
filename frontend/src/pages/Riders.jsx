import { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
        // עדכון רוכב קיים - ה-backend מטפל אוטומטית בשינויי השיוך לכלים
        await ridersAPI.update(editingRider.id, riderData);
        showSnackbar('הרוכב עודכן בהצלחה', 'success');
      } else {
        // יצירת רוכב חדש - ה-backend מטפל אוטומטית בשיוך לכלים
        await ridersAPI.create(riderData);
        showSnackbar('הרוכב נוסף בהצלחה', 'success');
      }
      handleCloseDialog();
      loadRiders();
    } catch (err) {
      console.error('Error saving rider:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בשמירת הרוכב', 'error');
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

  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // מיפוי סטטוסים - עם צבעים מודרניים
  const statusMap = useMemo(() => ({
    active: { label: 'פעיל', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    inactive: { label: 'לא פעיל', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' },
    frozen: { label: 'מוקפא', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
  }), []);

  const assignmentMap = useMemo(() => ({
    assigned: { label: 'משויך', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
    unassigned: { label: 'לא משויך', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' },
  }), []);

  const getStatusChip = useCallback((status) => {
    const { label, bgcolor, color } = statusMap[status] || { label: status, bgcolor: '#f1f5f9', color: '#64748b' };
    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor,
          color,
          fontWeight: 600,
          fontSize: '0.75rem',
          border: 'none',
          '& .MuiChip-label': { px: 1.5 },
        }}
      />
    );
  }, [statusMap]);

  const getAssignmentChip = useCallback((status) => {
    const { label, bgcolor, color } = assignmentMap[status] || { label: status, bgcolor: '#f1f5f9', color: '#64748b' };
    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor,
          color,
          fontWeight: 600,
          fontSize: '0.75rem',
          border: 'none',
          '& .MuiChip-label': { px: 1.5 },
        }}
      />
    );
  }, [assignmentMap]);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Modern Page Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 4,
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <Person sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              ניהול רוכבים
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {riders.length} רוכבים במערכת
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          size={isMobile ? 'medium' : 'large'}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          רוכב חדש
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {error}
        </Alert>
      )}

      {/* Modern Search Box */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <TextField
          fullWidth
          placeholder="חפש לפי שם, ת''ז או טלפון..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          dir="rtl"
          size={isMobile ? 'small' : 'medium'}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: '#f8fafc',
              '&:hover': { bgcolor: '#f1f5f9' },
              '&.Mui-focused': { bgcolor: '#ffffff' },
            },
          }}
        />
      </Paper>

      {/* תוכן רוכבים - טבלה למסכים גדולים, כרטיסים למובייל */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#6366f1' }} />
        </Box>
      ) : riders.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          }}
        >
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            mb: 3,
          }}>
            <Person sx={{ fontSize: 40, color: '#6366f1' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
            לא נמצאו רוכבים
          </Typography>
          <Typography sx={{ color: '#64748b' }}>
            הוסף רוכב חדש כדי להתחיל
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile View - Modern Cards
        <Stack spacing={2}>
          {riders.map((rider, index) => (
            <Card
              key={rider.id}
              elevation={0}
              sx={{
                dir: 'rtl',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                transition: 'all 0.2s ease-in-out',
                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                '&:hover': {
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {rider.firstName} {rider.lastName}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    {getStatusChip(rider.riderStatus)}
                    {getAssignmentChip(rider.assignmentStatus)}
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BadgeIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      ת"ז: {rider.idNumber}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }} dir="ltr">
                      {rider.phone}
                    </Typography>
                  </Box>

                  {rider.region?.district && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        מחוז: {rider.region.district}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>

              <Divider sx={{ borderColor: '#f1f5f9' }} />

              <CardActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.5 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/riders/${rider.id}`)}
                  sx={{
                    color: '#6366f1',
                    fontWeight: 600,
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                  }}
                >
                  צפייה
                </Button>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(rider)}
                    sx={{
                      color: '#8b5cf6',
                      '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)' },
                    }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(rider)}
                    sx={{
                      color: '#ef4444',
                      '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop View - Modern Table
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>שם מלא</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>ת"ז</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>טלפון</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>מחוז</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>סטטוס רוכב</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>סטטוס שיוך</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', py: 2 }}>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {riders.map((rider, index) => (
                <TableRow
                  key={rider.id}
                  sx={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.03}s both`,
                    '&:hover': {
                      bgcolor: 'rgba(99, 102, 241, 0.04)',
                    },
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {rider.firstName} {rider.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{rider.idNumber}</TableCell>
                  <TableCell dir="ltr" sx={{ color: '#64748b', textAlign: 'right' }}>
                    {rider.phone}
                  </TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{rider.region?.district || '-'}</TableCell>
                  <TableCell>{getStatusChip(rider.riderStatus)}</TableCell>
                  <TableCell>{getAssignmentChip(rider.assignmentStatus)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/riders/${rider.id}`)}
                      sx={{
                        color: '#6366f1',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                      }}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(rider)}
                      sx={{
                        color: '#8b5cf6',
                        '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)' },
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(rider)}
                      sx={{
                        color: '#ef4444',
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
                      }}
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

      {/* Rider Dialog */}
      <RiderDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveRider}
        rider={editingRider}
      />

      {/* Modern Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            maxWidth: '400px',
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
          אישור מחיקה
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#64748b', lineHeight: 1.7 }}>
            האם אתה בטוח שברצונך למחוק את הרוכב{' '}
            <Box component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {riderToDelete?.firstName} {riderToDelete?.lastName}
            </Box>?
            <br />
            פעולה זו אינה הפיכה.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              color: '#64748b',
              fontWeight: 600,
              borderRadius: '10px',
              px: 3,
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              bgcolor: '#ef4444',
              fontWeight: 600,
              borderRadius: '10px',
              px: 3,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              '&:hover': {
                bgcolor: '#dc2626',
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)',
              },
            }}
          >
            מחק
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Snackbar */}
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
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
