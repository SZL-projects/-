import { useState, useEffect } from 'react';
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
  Warning as WarningIcon,
  Build as BuildIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { faultsAPI } from '../services/api';
import FaultDialog from '../components/FaultDialog';

export default function Faults() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFault, setEditingFault] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faultToDelete, setFaultToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadFaults();
  }, []);

  const loadFaults = async () => {
    try {
      setLoading(true);
      const response = await faultsAPI.getAll({ search: searchTerm });
      setFaults(response.data.faults || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת תקלות');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadFaults();
  };

  const handleOpenDialog = (fault = null) => {
    setEditingFault(fault);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFault(null);
  };

  const handleSaveFault = async (faultData) => {
    try {
      if (editingFault) {
        await faultsAPI.update(editingFault.id, faultData);
        showSnackbar('התקלה עודכנה בהצלחה', 'success');
      } else {
        await faultsAPI.create(faultData);
        showSnackbar('התקלה נוספה בהצלחה', 'success');
      }
      handleCloseDialog();
      loadFaults();
    } catch (err) {
      console.error('Error saving fault:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בשמירת התקלה', 'error');
    }
  };

  const handleDeleteClick = (fault) => {
    setFaultToDelete(fault);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!faultToDelete) return;

    try {
      await faultsAPI.delete(faultToDelete.id);
      showSnackbar('התקלה נמחקה בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setFaultToDelete(null);
      loadFaults();
    } catch (err) {
      console.error('Error deleting fault:', err);
      showSnackbar('שגיאה במחיקת התקלה', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const statusMap = {
      open: { label: 'פתוחה', color: 'error', icon: <WarningIcon sx={{ fontSize: 16 }} /> },
      in_progress: { label: 'בטיפול', color: 'warning', icon: <BuildIcon sx={{ fontSize: 16 }} /> },
      resolved: { label: 'נפתרה', color: 'success', icon: <CheckIcon sx={{ fontSize: 16 }} /> },
    };

    const { label, color, icon } = statusMap[status] || { label: status, color: 'default', icon: null };
    return <Chip label={label} color={color} size="small" icon={icon} />;
  };

  const getSeverityChip = (severity) => {
    const severityMap = {
      critical: { label: 'קריטית', color: 'error' },
      high: { label: 'גבוהה', color: 'warning' },
      medium: { label: 'בינונית', color: 'info' },
      low: { label: 'נמוכה', color: 'default' },
    };

    const { label, color } = severityMap[severity] || { label: severity, color: 'default' };
    return <Chip label={label} color={color} size="small" variant="outlined" />;
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
          ניהול תקלות
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size={isMobile ? 'medium' : 'large'}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
        >
          תקלה חדשה
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* חיפוש */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            placeholder="חפש לפי כלי, רוכב או תיאור..."
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
            size={isMobile ? 'small' : 'medium'}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ minWidth: { xs: '100%', sm: 120 } }}
            fullWidth={isMobile}
          >
            חיפוש
          </Button>
        </Box>
      </Paper>

      {/* תוכן תקלות - טבלה למסכים גדולים, כרטיסים למובייל */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : faults.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <WarningIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography color="textSecondary">
            לא נמצאו תקלות
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile View - Cards
        <Stack spacing={2}>
          {faults.map((fault) => (
            <Card key={fault.id} sx={{ dir: 'rtl' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {fault.vehicle?.licensePlate || 'כלי לא ידוע'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    {getStatusChip(fault.status)}
                    {getSeverityChip(fault.severity)}
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="500">
                    {fault.description}
                  </Typography>

                  {fault.rider && (
                    <Typography variant="body2" color="text.secondary">
                      רוכב: {fault.rider.firstName} {fault.rider.lastName}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    דווח: {fault.reportedDate ? new Date(fault.reportedDate).toLocaleDateString('he-IL') : '-'}
                  </Typography>

                  {fault.resolvedDate && (
                    <Typography variant="caption" color="success.main">
                      נפתר: {new Date(fault.resolvedDate).toLocaleDateString('he-IL')}
                    </Typography>
                  )}
                </Stack>
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => handleOpenDialog(fault)}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteClick(fault)}
                >
                  <Delete />
                </IconButton>
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
                <TableCell>כלי</TableCell>
                <TableCell>רוכב</TableCell>
                <TableCell>תיאור</TableCell>
                <TableCell>חומרה</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>תאריך דיווח</TableCell>
                <TableCell>תאריך פתרון</TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faults.map((fault) => (
                <TableRow key={fault.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {fault.vehicle?.licensePlate || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {fault.rider ? `${fault.rider.firstName} ${fault.rider.lastName}` : '-'}
                  </TableCell>
                  <TableCell>{fault.description}</TableCell>
                  <TableCell>{getSeverityChip(fault.severity)}</TableCell>
                  <TableCell>{getStatusChip(fault.status)}</TableCell>
                  <TableCell>
                    {fault.reportedDate ? new Date(fault.reportedDate).toLocaleDateString('he-IL') : '-'}
                  </TableCell>
                  <TableCell>
                    {fault.resolvedDate ? new Date(fault.resolvedDate).toLocaleDateString('he-IL') : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenDialog(fault)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(fault)}
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
      {!loading && faults.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {faults.length} תקלות
          </Typography>
        </Box>
      )}

      {/* Fault Dialog */}
      <FaultDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveFault}
        fault={editingFault}
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
            האם אתה בטוח שברצונך למחוק תקלה זו?
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
