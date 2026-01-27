import { useState, useEffect, useMemo } from 'react';
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
  Warning as WarningIcon,
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

  // מפת תפקידים מודרנית
  const roleMap = useMemo(() => ({
    super_admin: { label: 'מנהל על', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    manager: { label: 'מנהל', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
    secretary: { label: 'מזכירה', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
    logistics: { label: 'לוגיסטיקה', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
    rider: { label: 'רוכב', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    regional_manager: { label: 'מנהל אזורי', bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
  }), []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
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

  const getRoleChips = (user) => {
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'rider'];

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {userRoles.map((role, index) => {
          const roleInfo = roleMap[role] || { label: role, bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
          return (
            <Chip
              key={index}
              label={roleInfo.label}
              size="small"
              sx={{
                bgcolor: roleInfo.bgcolor,
                color: roleInfo.color,
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          );
        })}
      </Box>
    );
  };

  const getStatusChip = (isActive) => {
    return isActive ? (
      <Chip
        label="פעיל"
        size="small"
        sx={{
          bgcolor: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    ) : (
      <Chip
        label="לא פעיל"
        size="small"
        sx={{
          bgcolor: 'rgba(148, 163, 184, 0.1)',
          color: '#64748b',
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  };

  // Mobile card view
  const renderMobileCard = (user) => (
    <Card
      key={user.id}
      sx={{
        mb: 2,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            {user.firstName} {user.lastName}
          </Typography>
          {getStatusChip(user.isActive)}
        </Box>

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email sx={{ fontSize: 18, color: '#94a3b8' }} />
            <Typography variant="body2" color="text.secondary">
              {user.email || 'ללא אימייל'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminPanelSettings sx={{ fontSize: 18, color: '#94a3b8' }} />
            {getRoleChips(user)}
          </Box>

          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            נוצר: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('he-IL') : '-'}
          </Typography>
        </Stack>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1.5, gap: 1 }}>
        <IconButton
          size="small"
          onClick={() => handleSendCredentials(user)}
          title="שלח פרטי התחברות למייל"
          sx={{
            color: '#6366f1',
            bgcolor: 'rgba(99, 102, 241, 0.1)',
            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleOpenDialog(user)}
          disabled={user.email === 'b0583639333@gmail.com'}
          title={user.email === 'b0583639333@gmail.com' ? 'לא ניתן לערוך משתמש ראשי' : 'ערוך משתמש'}
          sx={{
            color: '#8b5cf6',
            bgcolor: 'rgba(139, 92, 246, 0.1)',
            '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' },
            '&.Mui-disabled': { color: '#cbd5e1', bgcolor: '#f1f5f9' },
          }}
        >
          <Edit fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleDeleteClick(user)}
          disabled={user.email === 'b0583639333@gmail.com'}
          title={user.email === 'b0583639333@gmail.com' ? 'לא ניתן למחוק משתמש ראשי' : 'מחק משתמש'}
          sx={{
            color: '#ef4444',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' },
            '&.Mui-disabled': { color: '#cbd5e1', bgcolor: '#f1f5f9' },
          }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
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
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}>
            <PeopleIcon sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              ניהול משתמשים
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              ניהול משתמשי המערכת והרשאות
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
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
          משתמש חדש
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

      {/* Search */}
      <Paper sx={{
        p: 2,
        mb: 3,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
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
                  <Search sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            dir="rtl"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                bgcolor: '#f8fafc',
                '&:hover': { bgcolor: '#f1f5f9' },
                '&.Mui-focused': { bgcolor: '#ffffff' },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              minWidth: 120,
              borderRadius: '12px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
            }}
          >
            חיפוש
          </Button>
        </Box>
      </Paper>

      {/* Users Table / Cards */}
      {isMobile ? (
        // Mobile view - Cards
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#6366f1' }} />
            </Box>
          ) : users.length === 0 ? (
            <Paper sx={{
              py: 6,
              px: 3,
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <PeopleIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
              <Typography sx={{ color: '#64748b', fontSize: '1rem' }}>
                לא נמצאו משתמשים
              </Typography>
            </Paper>
          ) : (
            users.map(renderMobileCard)
          )}
        </Box>
      ) : (
        // Desktop view - Table
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  שם מלא
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  אימייל
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  תפקיד
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  סטטוס
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  תאריך יצירה
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  פעולות
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress sx={{ color: '#6366f1' }} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <PeopleIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                    <Typography sx={{ color: '#64748b' }}>
                      לא נמצאו משתמשים
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      '&:hover': { bgcolor: '#f8fafc' },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                      <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {user.firstName} {user.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                      {user.email || '-'}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                      {getRoleChips(user)}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                      {getStatusChip(user.isActive)}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('he-IL') : '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid #f1f5f9' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSendCredentials(user)}
                          title="שלח פרטי התחברות למייל"
                          sx={{
                            color: '#6366f1',
                            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                          }}
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(user)}
                          disabled={user.email === 'b0583639333@gmail.com'}
                          title={user.email === 'b0583639333@gmail.com' ? 'לא ניתן לערוך משתמש ראשי' : 'ערוך משתמש'}
                          sx={{
                            color: '#8b5cf6',
                            '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.1)' },
                            '&.Mui-disabled': { color: '#cbd5e1' },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.email === 'b0583639333@gmail.com'}
                          title={user.email === 'b0583639333@gmail.com' ? 'לא ניתן למחוק משתמש ראשי' : 'מחק משתמש'}
                          sx={{
                            color: '#ef4444',
                            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                            '&.Mui-disabled': { color: '#cbd5e1' },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Statistics */}
      {!loading && users.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
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
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            minWidth: { xs: '90%', sm: 400 },
          },
        }}
      >
        <DialogTitle sx={{
          textAlign: 'center',
          pb: 1,
        }}>
          <Box sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            mb: 2,
          }}>
            <WarningIcon sx={{ fontSize: 32, color: '#ef4444' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            אישור מחיקה
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <DialogContentText sx={{ color: '#64748b' }}>
            האם אתה בטוח שברצונך למחוק את המשתמש
            <br />
            <strong style={{ color: '#1e293b' }}>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
            <br />
            <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
              פעולה זו אינה הפיכה.
            </span>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3, px: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
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
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.2,
              fontWeight: 600,
              bgcolor: '#ef4444',
              '&:hover': {
                bgcolor: '#dc2626',
              },
            }}
          >
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
          sx={{
            borderRadius: '12px',
            fontWeight: 500,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
