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
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Security,
  Save,
  RestartAlt,
} from '@mui/icons-material';
import { permissionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// צבעים לרמות הגישה
const accessLevelColors = {
  none: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  view: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  edit: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  self: { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
};

const accessLevelLabels = {
  none: 'ללא',
  view: 'צפייה',
  edit: 'עריכה',
  self: 'עצמי',
};

const Permissions = () => {
  const { hasRole } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const isSuperAdmin = hasRole('super_admin');

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await permissionsAPI.getAll();
      setPermissions(response.data.permissions);
      setMetadata(response.data.metadata);
      setHasChanges(false);
    } catch (err) {
      console.error('שגיאה בטעינת הרשאות:', err);
      setError(err.response?.data?.message || 'שגיאה בטעינת הרשאות');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (role, entity, newLevel) => {
    // super_admin לא ניתן לשינוי
    if (role === 'super_admin') return;

    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [entity]: newLevel,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await permissionsAPI.update(permissions);
      setSuccess('ההרשאות נשמרו בהצלחה!');
      setHasChanges(false);
    } catch (err) {
      console.error('שגיאה בשמירת הרשאות:', err);
      setError(err.response?.data?.message || 'שגיאה בשמירת הרשאות');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetDialogOpen(false);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await permissionsAPI.reset();
      setPermissions(response.data.permissions);
      setSuccess('ההרשאות אופסו לברירת מחדל');
      setHasChanges(false);
    } catch (err) {
      console.error('שגיאה באיפוס הרשאות:', err);
      setError(err.response?.data?.message || 'שגיאה באיפוס הרשאות');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!permissions || !metadata) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'שגיאה בטעינת הרשאות'}</Alert>
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* כותרת */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}>
            <Security sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              ניהול הרשאות
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              הגדר מה כל תפקיד יכול לעשות במערכת
            </Typography>
          </Box>
        </Box>

        {isSuperAdmin && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAlt />}
              onClick={() => setResetDialogOpen(true)}
              disabled={saving}
              sx={{ borderRadius: '10px' }}
            >
              איפוס לברירת מחדל
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
              sx={{
                borderRadius: '10px',
                background: hasChanges
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : undefined,
              }}
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </Box>
        )}
      </Box>

      {/* מקרא */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#475569' }}>
          מקרא רמות גישה:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {metadata.accessLevels.map(level => (
            <Chip
              key={level.key}
              label={level.label}
              size="small"
              sx={{
                bgcolor: accessLevelColors[level.key].bg,
                color: accessLevelColors[level.key].color,
                border: `1px solid ${accessLevelColors[level.key].border}`,
                fontWeight: 600,
              }}
            />
          ))}
        </Box>
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#94a3b8' }}>
          ללא = לא רואה בכלל &nbsp;|&nbsp; צפייה = רואה בלבד &nbsp;|&nbsp; עריכה = רואה + יוצר + מעדכן + מוחק &nbsp;|&nbsp; עצמי = רואה/מעדכן רק את מה ששייך אליו
        </Typography>
      </Paper>

      {/* טבלת הרשאות */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'auto',
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell
                sx={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: '#1e293b',
                  position: 'sticky',
                  right: 0,
                  bgcolor: '#f8fafc',
                  zIndex: 1,
                  minWidth: 140,
                }}
              >
                ישות
              </TableCell>
              {metadata.roles.map(role => (
                <TableCell
                  key={role.key}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: '#1e293b',
                    minWidth: 130,
                  }}
                >
                  {role.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {metadata.entities.map(entity => (
              <TableRow
                key={entity.key}
                sx={{
                  '&:hover': { bgcolor: '#fafafe' },
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: '#334155',
                    fontSize: '0.9rem',
                    position: 'sticky',
                    right: 0,
                    bgcolor: '#ffffff',
                    zIndex: 1,
                  }}
                >
                  {entity.label}
                </TableCell>
                {metadata.roles.map(role => {
                  const currentLevel = permissions[role.key]?.[entity.key] || 'none';
                  const isDisabled = !isSuperAdmin || role.key === 'super_admin';

                  return (
                    <TableCell key={role.key} align="center" sx={{ py: 1 }}>
                      {isDisabled ? (
                        <Chip
                          label={accessLevelLabels[currentLevel]}
                          size="small"
                          sx={{
                            bgcolor: accessLevelColors[currentLevel].bg,
                            color: accessLevelColors[currentLevel].color,
                            border: `1px solid ${accessLevelColors[currentLevel].border}`,
                            fontWeight: 600,
                            minWidth: 70,
                          }}
                        />
                      ) : (
                        <Select
                          value={currentLevel}
                          onChange={(e) => handlePermissionChange(role.key, entity.key, e.target.value)}
                          size="small"
                          sx={{
                            minWidth: 100,
                            borderRadius: '8px',
                            bgcolor: accessLevelColors[currentLevel].bg,
                            '& .MuiSelect-select': {
                              py: 0.75,
                              fontWeight: 600,
                              color: accessLevelColors[currentLevel].color,
                              fontSize: '0.85rem',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: accessLevelColors[currentLevel].border,
                            },
                          }}
                        >
                          <MenuItem value="none">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#dc2626' }} />
                              ללא
                            </Box>
                          </MenuItem>
                          <MenuItem value="view">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2563eb' }} />
                              צפייה
                            </Box>
                          </MenuItem>
                          <MenuItem value="edit">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                              עריכה
                            </Box>
                          </MenuItem>
                          <MenuItem value="self">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ca8a04' }} />
                              עצמי
                            </Box>
                          </MenuItem>
                        </Select>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* דיאלוג אישור איפוס */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        dir="rtl"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>איפוס הרשאות</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך לאפס את כל ההרשאות לברירת מחדל?
            פעולה זו תמחק את כל השינויים שביצעת.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetDialogOpen(false)} sx={{ borderRadius: '8px' }}>
            ביטול
          </Button>
          <Button
            onClick={handleReset}
            color="warning"
            variant="contained"
            sx={{ borderRadius: '8px' }}
          >
            אפס הרשאות
          </Button>
        </DialogActions>
      </Dialog>

      {/* הודעות */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ borderRadius: '10px' }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Permissions;
