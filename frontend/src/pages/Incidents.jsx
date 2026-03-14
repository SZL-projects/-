import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, TextField, InputAdornment, Chip,
  IconButton, CircularProgress, Alert, Tooltip, useMediaQuery, useTheme,
  Card, CardContent, Stack,
} from '@mui/material';
import {
  Search, Visibility, ReportProblem, VisibilityOff, Add, Edit,
} from '@mui/icons-material';
import { incidentsAPI } from '../services/api';

const STATUS_MAP = {
  new: { label: 'חדש', color: '#3b82f6', bgcolor: 'rgba(59,130,246,0.1)' },
  in_progress: { label: 'בטיפול', color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.1)' },
  closed: { label: 'סגור', color: '#10b981', bgcolor: 'rgba(16,185,129,0.1)' },
};

export default function Incidents() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const res = await incidentsAPI.getAll();
      setIncidents(res.data.incidents || []);
    } catch {
      setError('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const toggleHide = async (incident) => {
    setTogglingId(incident.id);
    try {
      await incidentsAPI.update(incident.id, {
        hiddenFromRider: !incident.hiddenFromRider,
      });
      setIncidents(prev =>
        prev.map(inc =>
          inc.id === incident.id
            ? { ...inc, hiddenFromRider: !inc.hiddenFromRider }
            : inc
        )
      );
    } catch {
      setError('שגיאה בעדכון');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = incidents.filter(inc => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      inc.incidentNumber?.toLowerCase().includes(s) ||
      inc.riderFirstName?.toLowerCase().includes(s) ||
      inc.riderLastName?.toLowerCase().includes(s) ||
      inc.createdByName?.toLowerCase().includes(s) ||
      inc.eventType?.toLowerCase().includes(s) ||
      inc.city?.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)', flexShrink: 0,
          }}>
            <ReportProblem sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              דיווחי אירועים
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {incidents.length} דיווחים סה"כ
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/incident-report/new')}
          sx={{
            borderRadius: '10px', fontWeight: 600,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
          }}
        >
          דיווח חדש
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: '14px' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="חיפוש לפי מספר, רוכב, אירוע, עיר..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment>,
            sx: { borderRadius: '10px' },
          }}
        />
      </Paper>

      {/* Table */}
      {isMobile ? (
        <Stack spacing={1.5}>
          {filtered.map(inc => (
            <Card key={inc.id} sx={{ borderRadius: '14px', opacity: inc.hiddenFromRider ? 0.6 : 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{inc.incidentNumber}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {inc.createdByName || `${inc.riderFirstName} ${inc.riderLastName}`}
                    </Typography>
                  </Box>
                  <StatusChip status={inc.status} />
                </Box>
                <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                  {inc.eventType} • {inc.incidentDate}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Tooltip title="צפייה">
                    <IconButton size="small" onClick={() => navigate(`/incident-view/${inc.id}`)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="עריכה">
                    <IconButton size="small" onClick={() => navigate(`/incident-report/${inc.id}`)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={inc.hiddenFromRider ? 'הצג לרוכב' : 'הסתר מרוכב'}>
                    <IconButton
                      size="small"
                      onClick={() => toggleHide(inc)}
                      disabled={togglingId === inc.id}
                      sx={{ color: inc.hiddenFromRider ? '#ef4444' : '#94a3b8' }}
                    >
                      {togglingId === inc.id
                        ? <CircularProgress size={16} />
                        : inc.hiddenFromRider ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />
                      }
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '14px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>מספר אירוע</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>רוכב</TableCell>
                <TableCell>סוג אירוע</TableCell>
                <TableCell>עיר</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>גלוי לרוכב</TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    לא נמצאו דיווחים
                  </TableCell>
                </TableRow>
              ) : filtered.map(inc => (
                <TableRow
                  key={inc.id}
                  sx={{ opacity: inc.hiddenFromRider ? 0.55 : 1, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <TableCell sx={{ fontWeight: 600, color: '#ef4444', fontFamily: 'monospace' }}>
                    {inc.incidentNumber}
                  </TableCell>
                  <TableCell>{inc.incidentDate || formatDate(inc.createdAt)}</TableCell>
                  <TableCell>{inc.createdByName || `${inc.riderFirstName || ''} ${inc.riderLastName || ''}`.trim()}</TableCell>
                  <TableCell>{inc.eventType || '-'}</TableCell>
                  <TableCell>{inc.city || '-'}</TableCell>
                  <TableCell><StatusChip status={inc.status} /></TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={inc.hiddenFromRider ? 'מוסתר' : 'גלוי'}
                      sx={{
                        bgcolor: inc.hiddenFromRider ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: inc.hiddenFromRider ? '#ef4444' : '#10b981',
                        fontWeight: 600, fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="צפה / ערוך">
                        <IconButton size="small" onClick={() => navigate(`/incident-report/${inc.id}`)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={inc.hiddenFromRider ? 'הצג לרוכב' : 'הסתר מרוכב'}>
                        <IconButton
                          size="small"
                          onClick={() => toggleHide(inc)}
                          disabled={togglingId === inc.id}
                          sx={{ color: inc.hiddenFromRider ? '#ef4444' : '#94a3b8' }}
                        >
                          {togglingId === inc.id
                            ? <CircularProgress size={16} />
                            : inc.hiddenFromRider
                              ? <VisibilityOff fontSize="small" />
                              : <Visibility fontSize="small" />
                          }
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function StatusChip({ status }) {
  const s = STATUS_MAP[status] || { label: status || 'חדש', color: '#64748b', bgcolor: 'rgba(100,116,139,0.1)' };
  return (
    <Chip
      size="small"
      label={s.label}
      sx={{ bgcolor: s.bgcolor, color: s.color, fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
}

function formatDate(val) {
  if (!val) return '-';
  const d = val.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString('he-IL');
}
