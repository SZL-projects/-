import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  History as HistoryIcon,
  FilterList,
} from '@mui/icons-material';
import { auditLogsAPI } from '../services/api';

const actionMap = {
  create: { label: 'יצירה', color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)' },
  update: { label: 'עדכון', color: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.1)' },
  delete: { label: 'מחיקה', color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
  login: { label: 'כניסה', color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' },
  logout: { label: 'יציאה', color: '#64748b', bgcolor: 'rgba(100, 116, 139, 0.1)' },
  status_change: { label: 'שינוי סטטוס', color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' },
  assign: { label: 'הקצאה', color: '#06b6d4', bgcolor: 'rgba(6, 182, 212, 0.1)' },
  unassign: { label: 'ביטול הקצאה', color: '#ec4899', bgcolor: 'rgba(236, 72, 153, 0.1)' },
};

const entityTypeMap = {
  vehicle: 'כלי',
  rider: 'רוכב',
  fault: 'תקלה',
  task: 'משימה',
  maintenance: 'טיפול',
  monthly_check: 'בקרה חודשית',
  insurance_claim: 'תביעת ביטוח',
  user: 'משתמש',
  permission: 'הרשאה',
};

export default function AuditLog() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterUser) params.userId = filterUser;
      if (filterAction) params.action = filterAction;
      if (filterEntity) params.entityType = filterEntity;
      if (filterSearch) params.search = filterSearch;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;
      params.limit = 200;

      const res = await auditLogsAPI.getAll(params);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('שגיאה בטעינת לוג פעילות');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterAction, filterEntity, filterSearch, filterDateFrom, filterDateTo]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await auditLogsAPI.getUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const paperSx = {
    p: 3,
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const selectSx = {
    borderRadius: '12px',
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', borderWidth: 2 },
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}
        >
          <HistoryIcon sx={{ fontSize: 28, color: '#ffffff' }} />
        </Box>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ color: '#1e293b' }}>
            לוג פעילות
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            צפה בכל הפעולות שבוצעו במערכת
          </Typography>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ ...paperSx, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FilterList sx={{ color: '#6366f1', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>סינון</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>משתמש</InputLabel>
              <Select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} label="משתמש" sx={selectSx}>
                <MenuItem value="">הכל</MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>פעולה</InputLabel>
              <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} label="פעולה" sx={selectSx}>
                <MenuItem value="">הכל</MenuItem>
                {Object.entries(actionMap).map(([key, val]) => (
                  <MenuItem key={key} value={key}>{val.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>סוג ישות</InputLabel>
              <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} label="סוג ישות" sx={selectSx}>
                <MenuItem value="">הכל</MenuItem>
                {Object.entries(entityTypeMap).map(([key, val]) => (
                  <MenuItem key={key} value={key}>{val}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="מתאריך"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={textFieldSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="עד תאריך"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={textFieldSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="חיפוש חופשי"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              sx={textFieldSx}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Results count */}
      {!loading && (
        <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
          {logs.length} רשומות נמצאו
        </Typography>
      )}

      {/* Table */}
      <Paper sx={paperSx}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#64748b' }}>
              אין רשומות בלוג
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              פעולות שיבוצעו במערכת יירשמו כאן
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>תאריך ושעה</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>משתמש</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>פעולה</TableCell>
                  {!isMobile && <TableCell sx={{ fontWeight: 600 }}>סוג ישות</TableCell>}
                  {!isMobile && <TableCell sx={{ fontWeight: 600 }}>שם ישות</TableCell>}
                  <TableCell sx={{ fontWeight: 600 }}>תיאור</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => {
                  const actionInfo = actionMap[log.action] || { label: log.action, color: '#64748b', bgcolor: 'rgba(100, 116, 139, 0.1)' };
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {log.userName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={actionInfo.label}
                          size="small"
                          sx={{
                            bgcolor: actionInfo.bgcolor,
                            color: actionInfo.color,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {entityTypeMap[log.entityType] || log.entityType || '-'}
                          </Typography>
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {log.entityName || '-'}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ color: '#475569', maxWidth: 300 }}>
                          {log.description || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
