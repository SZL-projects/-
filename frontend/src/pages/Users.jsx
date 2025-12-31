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
  People as PeopleIcon,
  Email,
  AdminPanelSettings,
  Send as SendIcon,
} from '@mui/icons-material';
import { authAPI } from '../services/api';
import UserDialog from '../components/UserDialog';

export default function Users() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // This would be a new API endpoint
      const response = await authAPI.getAllUsers({ search: searchTerm });
      setUsers(response.data.users || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת משתמשים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        await authAPI.updateUser(editingUser.id, userData);
        showSnackbar('המשתמש עודכן בהצלחה', 'success');
      } else {
        await authAPI.createUser(userData);
        showSnackbar('המשתמש נוסף בהצלחה', 'success');
      }
      handleCloseDialog();
      loadUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בשמירת המשתמש', 'error');
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await authAPI.deleteUser(userToDelete.id);
      showSnackbar('המשתמש נמחק בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showSnackbar('שגיאה במחיקת המשתמש', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSendCredentials = async (user) => {
    // בדיקה שלמשתמש יש מייל
    if (!user.email) {
      showSnackbar('למשתמש אין כתובת אימייל במערכת', 'warning');
      return;
    }

    try {
      await authAPI.sendCredentials(user.id);
      showSnackbar('פרטי ההתחברות נשלחו בהצלחה למייל', 'success');
    } catch (err) {
      console.error('Error sending credentials:', err);
      showSnackbar(err.response?.data?.message || 'שגיאה בשליחת פרטי ההתחברות', 'error');
    }
  };

  const getRoleChip = (role) => {
    const roleMap = {
      super_admin: { label: 'מנהל על', color: 'error' },
      admin: { label: 'מנהל', color: 'warning' },
      user: { label: 'משתמש', color: 'primary' },
      viewer: { label: 'צופה', color: 'default' },
    };

    const { label, color } = roleMap[role] || { label: role, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getStatusChip = (isActive) => {
    return isActive ?
      <Chip label="פעיל" color="success" size="small" /> :
      <Chip label="לא פעיל" color="default" size="small" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול משתמשים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => handleOpenDialog()}
        >
          משתמש חדש
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
            placeholder="חפש לפי שם, אימייל או תפקיד..."
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

      {/* טבלת משתמשים */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם מלא</TableCell>
              <TableCell>אימייל</TableCell>
              <TableCell>תפקיד</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell>תאריך יצירה</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box sx={{ py: 4 }}>
                    <PeopleIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="textSecondary">
                      לא נמצאו משתמשים
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {user.firstName} {user.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{getStatusChip(user.isActive)}</TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('he-IL') : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleSendCredentials(user)}
                      title="שלח פרטי התחברות למייל"
                    >
                      <SendIcon />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenDialog(user)}
                      title="ערוך משתמש"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(user)}
                      disabled={user.role === 'super_admin'}
                      title="מחק משתמש"
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
      {!loading && users.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {users.length} משתמשים
          </Typography>
        </Box>
      )}

      {/* User Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveUser}
        user={editingUser}
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
            האם אתה בטוח שברצונך למחוק את המשתמש{' '}
            <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
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
