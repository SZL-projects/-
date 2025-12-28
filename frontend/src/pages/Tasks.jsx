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
      pending: { label: 'ממתין', color: 'warning' },
      in_progress: { label: 'בביצוע', color: 'info' },
      completed: { label: 'הושלם', color: 'success' },
      cancelled: { label: 'בוטל', color: 'default' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getPriorityChip = (priority) => {
    const priorityMap = {
      low: { label: 'נמוך', color: 'success' },
      medium: { label: 'בינוני', color: 'warning' },
      high: { label: 'גבוה', color: 'error' },
    };

    const { label, color } = priorityMap[priority] || { label: priority, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
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
          ניהול משימות
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size={isMobile ? 'medium' : 'large'}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
        >
          משימה חדשה
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
            placeholder="חפש לפי כותרת או תיאור..."
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

      {/* תוכן משימות - טבלה למסכים גדולים, כרטיסים למובייל */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : tasks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography color="textSecondary">
            לא נמצאו משימות
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile View - Cards
        <Stack spacing={2}>
          {tasks.map((task) => (
            <Card key={task.id} sx={{ dir: 'rtl' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {task.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    {getStatusChip(task.status)}
                    {getPriorityChip(task.priority)}
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                  )}

                  {task.riderName && (
                    <Typography variant="body2">
                      רוכב: <strong>{task.riderName}</strong>
                    </Typography>
                  )}

                  {task.vehiclePlate && (
                    <Typography variant="body2">
                      כלי: <strong>{task.vehiclePlate}</strong>
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      תאריך יעד: {formatDate(task.dueDate)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  צפייה
                </Button>
                <Box>
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => handleOpenDialog(task)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick(task)}
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
                <TableCell>כותרת</TableCell>
                <TableCell>רוכב</TableCell>
                <TableCell>כלי</TableCell>
                <TableCell>עדיפות</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>תאריך יעד</TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {task.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{task.riderName || '-'}</TableCell>
                  <TableCell>{task.vehiclePlate || '-'}</TableCell>
                  <TableCell>{getPriorityChip(task.priority)}</TableCell>
                  <TableCell>{getStatusChip(task.status)}</TableCell>
                  <TableCell>{formatDate(task.dueDate)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenDialog(task)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(task)}
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
      {!loading && tasks.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {tasks.length} משימות
          </Typography>
        </Box>
      )}

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveTask}
        task={editingTask}
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
            האם אתה בטוח שברצונך למחוק את המשימה{' '}
            <strong>{taskToDelete?.title}</strong>?
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
