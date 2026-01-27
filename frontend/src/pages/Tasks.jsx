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
  Assignment as AssignmentIcon,
  CalendarToday,
  Flag,
} from '@mui/icons-material';
import { tasksAPI } from '../services/api';
import TaskDialog from '../components/TaskDialog';

export default function Tasks() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAll({ search: searchTerm });
      setTasks(response.data.tasks || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת משימות');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadTasks();
  };

  const handleOpenDialog = (task = null) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, taskData);
        showSnackbar('המשימה עודכנה בהצלחה', 'success');
      } else {
        await tasksAPI.create(taskData);
        showSnackbar('המשימה נוספה בהצלחה', 'success');
      }
      handleCloseDialog();
      loadTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      showSnackbar('שגיאה בשמירת המשימה', 'error');
    }
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    try {
      await tasksAPI.delete(taskToDelete.id);
      showSnackbar('המשימה נמחקה בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      loadTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      showSnackbar('שגיאה במחיקת המשימה', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const statusMap = {
      pending: { label: 'ממתין', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
      in_progress: { label: 'בביצוע', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
      completed: { label: 'הושלם', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
      cancelled: { label: 'בוטל', bgcolor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' },
    };

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
  };

  const getPriorityChip = (priority) => {
    const priorityMap = {
      low: { label: 'נמוך', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
      medium: { label: 'בינוני', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
      high: { label: 'גבוה', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    };

    const { label, bgcolor, color } = priorityMap[priority] || { label: priority, bgcolor: '#f1f5f9', color: '#64748b' };
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
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

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
            <AssignmentIcon sx={{ fontSize: 28, color: '#ffffff' }} />
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
              ניהול משימות
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {tasks.length} משימות במערכת
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
          משימה חדשה
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
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            placeholder="חפש לפי כותרת או תיאור..."
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
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              minWidth: { xs: '100%', sm: 120 },
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
            }}
            fullWidth={isMobile}
          >
            חיפוש
          </Button>
        </Box>
      </Paper>

      {/* תוכן משימות - טבלה למסכים גדולים, כרטיסים למובייל */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#6366f1' }} />
        </Box>
      ) : tasks.length === 0 ? (
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
            <AssignmentIcon sx={{ fontSize: 40, color: '#6366f1' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
            לא נמצאו משימות
          </Typography>
          <Typography sx={{ color: '#64748b' }}>
            הוסף משימה חדשה כדי להתחיל
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile View - Modern Cards
        <Stack spacing={2}>
          {tasks.map((task, index) => (
            <Card
              key={task.id}
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
                    {task.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    {getStatusChip(task.status)}
                    {getPriorityChip(task.priority)}
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {task.description && (
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {task.description}
                    </Typography>
                  )}

                  {task.riderName && (
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      רוכב: <Box component="span" sx={{ fontWeight: 600, color: '#1e293b' }}>{task.riderName}</Box>
                    </Typography>
                  )}

                  {task.vehiclePlate && (
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      כלי: <Box component="span" sx={{ fontWeight: 600, color: '#1e293b' }}>{task.vehiclePlate}</Box>
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday sx={{ fontSize: 16, color: '#94a3b8' }} />
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      תאריך יעד: {formatDate(task.dueDate)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>

              <Divider sx={{ borderColor: '#f1f5f9' }} />

              <CardActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.5 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/tasks/${task.id}`)}
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
                    onClick={() => handleOpenDialog(task)}
                    sx={{
                      color: '#8b5cf6',
                      '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)' },
                    }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(task)}
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
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>כותרת</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>רוכב</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>כלי</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>עדיפות</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>סטטוס</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>תאריך יעד</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', py: 2 }}>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task, index) => (
                <TableRow
                  key={task.id}
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
                      {task.title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{task.riderName || '-'}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{task.vehiclePlate || '-'}</TableCell>
                  <TableCell>{getPriorityChip(task.priority)}</TableCell>
                  <TableCell>{getStatusChip(task.status)}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{formatDate(task.dueDate)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      sx={{
                        color: '#6366f1',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                      }}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(task)}
                      sx={{
                        color: '#8b5cf6',
                        '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)' },
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(task)}
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

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveTask}
        task={editingTask}
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
            האם אתה בטוח שברצונך למחוק את המשימה{' '}
            <Box component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {taskToDelete?.title}
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
