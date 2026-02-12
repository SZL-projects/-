import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Fade,
} from '@mui/material';
import {
  Security,
  Save,
  RestartAlt,
  Person,
  TwoWheeler,
  Assignment,
  Warning,
  Build,
  People,
  Assessment,
  Settings,
  History,
  Gavel,
  HomeRepairService,
  AdminPanelSettings,
  Visibility,
  Edit,
  Block,
  PersonOutline,
  SupervisorAccount,
  Badge,
  LocalShipping,
  SportsMotorsports,
  ManageAccounts,
} from '@mui/icons-material';
import { permissionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// אייקונים לישויות
const entityIcons = {
  riders: <SportsMotorsports sx={{ fontSize: 20 }} />,
  vehicles: <TwoWheeler sx={{ fontSize: 20 }} />,
  tasks: <Assignment sx={{ fontSize: 20 }} />,
  faults: <Warning sx={{ fontSize: 20 }} />,
  monthly_checks: <Build sx={{ fontSize: 20 }} />,
  maintenance: <HomeRepairService sx={{ fontSize: 20 }} />,
  garages: <HomeRepairService sx={{ fontSize: 20 }} />,
  insurance_claims: <Gavel sx={{ fontSize: 20 }} />,
  users: <People sx={{ fontSize: 20 }} />,
  reports: <Assessment sx={{ fontSize: 20 }} />,
  settings: <Settings sx={{ fontSize: 20 }} />,
  audit_logs: <History sx={{ fontSize: 20 }} />,
};

// אייקונים לתפקידים
const roleIcons = {
  super_admin: <AdminPanelSettings />,
  manager: <SupervisorAccount />,
  secretary: <Badge />,
  logistics: <LocalShipping />,
  rider: <SportsMotorsports />,
  regional_manager: <ManageAccounts />,
};

// צבעי תפקידים
const roleColors = {
  super_admin: { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  manager: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  secretary: { bg: '#fdf4ff', color: '#c026d3', border: '#f0abfc', gradient: 'linear-gradient(135deg, #c026d3, #e879f9)' },
  logistics: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', gradient: 'linear-gradient(135deg, #ea580c, #fb923c)' },
  rider: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', gradient: 'linear-gradient(135deg, #16a34a, #4ade80)' },
  regional_manager: { bg: '#ecfeff', color: '#0891b2', border: '#a5f3fc', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
};

// הגדרות רמות גישה
const accessLevels = [
  { key: 'none', label: 'ללא', icon: <Block sx={{ fontSize: 16 }} />, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { key: 'self', label: 'עצמי', icon: <PersonOutline sx={{ fontSize: 16 }} />, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { key: 'view', label: 'צפייה', icon: <Visibility sx={{ fontSize: 16 }} />, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'edit', label: 'עריכה', icon: <Edit sx={{ fontSize: 16 }} />, color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
];

const Permissions = () => {
  const { hasRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [permissions, setPermissions] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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
    if (role === 'super_admin' || !newLevel) return;
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
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (!permissions || !metadata) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error || 'שגיאה בטעינת הרשאות'}</Alert>
      </Box>
    );
  }

  const currentRole = metadata.roles[activeTab];
  const isRoleLocked = !isSuperAdmin || currentRole?.key === 'super_admin';

  return (
    <Box dir="rtl" sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
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
              <Security sx={{ fontSize: 28, color: '#ffffff' }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
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
                startIcon={<RestartAlt />}
                onClick={() => setResetDialogOpen(true)}
                disabled={saving}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 600,
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  '&:hover': { borderColor: '#f59e0b', color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.05)' },
                }}
              >
                איפוס
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                onClick={handleSave}
                disabled={!hasChanges || saving}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: hasChanges
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : undefined,
                  boxShadow: hasChanges ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  '&:hover': hasChanges ? {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  } : {},
                }}
              >
                {saving ? 'שומר...' : hasChanges ? 'שמור שינויים' : 'אין שינויים'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* מקרא */}
      <Paper sx={{
        p: 2.5,
        mb: 3,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
          רמות גישה
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {accessLevels.map(level => (
            <Box key={level.key} sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: '10px',
              bgcolor: level.bg,
              border: `1px solid ${level.border}`,
            }}>
              <Box sx={{ color: level.color, display: 'flex' }}>{level.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: level.color, lineHeight: 1.2 }}>
                  {level.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                  {level.key === 'none' && 'לא רואה בכלל'}
                  {level.key === 'self' && 'רק מה ששייך לו'}
                  {level.key === 'view' && 'צפייה בלבד'}
                  {level.key === 'edit' && 'גישה מלאה'}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* טאבים לתפקידים */}
      <Paper sx={{
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <Box sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newVal) => setActiveTab(newVal)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '0.9rem',
                minHeight: 64,
                textTransform: 'none',
                color: '#64748b',
                '&.Mui-selected': {
                  color: currentRole ? roleColors[currentRole.key]?.color : '#6366f1',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundColor: currentRole ? roleColors[currentRole.key]?.color : '#6366f1',
              },
            }}
          >
            {metadata.roles.map((role) => (
              <Tab
                key={role.key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: roleColors[role.key]?.gradient || '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      '& svg': { fontSize: 18 },
                    }}>
                      {roleIcons[role.key] || <Person />}
                    </Box>
                    {role.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* תוכן הטאב - הרשאות לתפקיד הנבחר */}
        {currentRole && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* כותרת תפקיד */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: roleColors[currentRole.key]?.gradient || '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: `0 4px 12px ${roleColors[currentRole.key]?.color}33`,
              }}>
                {roleIcons[currentRole.key] || <Person />}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {currentRole.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {isRoleLocked ? 'הרשאות קבועות - לא ניתן לשנות' : 'לחץ על רמת הגישה לשינוי'}
                </Typography>
              </Box>
              {isRoleLocked && (
                <Chip
                  label="נעול"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(100,116,139,0.1)',
                    color: '#64748b',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </Box>

            {/* רשימת ישויות */}
            <Grid container spacing={2}>
              {metadata.entities.map((entity) => {
                const currentLevel = permissions[currentRole.key]?.[entity.key] || 'none';
                const levelConfig = accessLevels.find(l => l.key === currentLevel);

                return (
                  <Grid item xs={12} sm={6} lg={4} key={entity.key}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#cbd5e1',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        {/* שם הישות */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                          <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: levelConfig ? `${levelConfig.color}10` : 'rgba(100,116,139,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: levelConfig?.color || '#64748b',
                          }}>
                            {entityIcons[entity.key] || <Settings sx={{ fontSize: 20 }} />}
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                            {entity.label}
                          </Typography>
                        </Box>

                        {/* בחירת רמת גישה */}
                        <ToggleButtonGroup
                          value={currentLevel}
                          exclusive
                          onChange={(_, newVal) => {
                            if (newVal !== null) {
                              handlePermissionChange(currentRole.key, entity.key, newVal);
                            }
                          }}
                          disabled={isRoleLocked}
                          fullWidth
                          size="small"
                          sx={{
                            '& .MuiToggleButtonGroup-grouped': {
                              border: '1px solid #e2e8f0 !important',
                              borderRadius: '10px !important',
                              mx: 0.3,
                              py: 0.8,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              transition: 'all 0.2s ease',
                              '&:first-of-type': { mr: 0 },
                              '&:last-of-type': { ml: 0 },
                            },
                          }}
                        >
                          {accessLevels.map(level => (
                            <ToggleButton
                              key={level.key}
                              value={level.key}
                              sx={{
                                color: currentLevel === level.key ? '#fff !important' : '#94a3b8',
                                bgcolor: currentLevel === level.key ? `${level.color} !important` : 'transparent',
                                borderColor: currentLevel === level.key ? `${level.color} !important` : '#e2e8f0',
                                boxShadow: currentLevel === level.key ? `0 2px 8px ${level.color}40` : 'none',
                                '&:hover': {
                                  bgcolor: currentLevel === level.key ? level.color : `${level.color}10 !important`,
                                  color: currentLevel === level.key ? '#fff' : level.color,
                                },
                                '&.Mui-disabled': {
                                  color: currentLevel === level.key ? '#fff !important' : '#cbd5e1',
                                  bgcolor: currentLevel === level.key ? `${level.color} !important` : 'transparent',
                                  opacity: currentLevel === level.key ? 0.8 : 0.5,
                                },
                              }}
                            >
                              <Tooltip title={
                                level.key === 'none' ? 'לא רואה בכלל' :
                                level.key === 'self' ? 'רואה/מעדכן רק את מה ששייך אליו' :
                                level.key === 'view' ? 'רואה הכל, לא יכול לשנות' :
                                'גישה מלאה - צפייה, יצירה, עריכה, מחיקה'
                              } arrow>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {level.icon}
                                  {!isMobile && level.label}
                                </Box>
                              </Tooltip>
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* אינדיקטור שינויים */}
      {hasChanges && (
        <Fade in>
          <Paper sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 3,
            py: 1.5,
            borderRadius: '16px',
            bgcolor: '#1e293b',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 1000,
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              יש שינויים שלא נשמרו
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
              }}
            >
              שמור
            </Button>
          </Paper>
        </Fade>
      )}

      {/* דיאלוג אישור איפוס */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        dir="rtl"
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem' }}>
          איפוס הרשאות
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569' }}>
            האם אתה בטוח שברצונך לאפס את כל ההרשאות לברירת מחדל?
            פעולה זו תמחק את כל השינויים שביצעת.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setResetDialogOpen(false)}
            sx={{ borderRadius: '10px', fontWeight: 600 }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleReset}
            variant="contained"
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              bgcolor: '#f59e0b',
              '&:hover': { bgcolor: '#d97706' },
            }}
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
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ borderRadius: '12px', fontWeight: 600 }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '12px', fontWeight: 600 }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Permissions;
