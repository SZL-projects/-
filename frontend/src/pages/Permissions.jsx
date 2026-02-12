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
  Divider,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Grid,
  Fade,
  Avatar,
  IconButton,
  alpha,
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
  Lock,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { permissionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// אייקונים לישויות
const entityConfig = {
  riders: { icon: SportsMotorsports, label: 'רוכבים', emoji: '🏍️' },
  vehicles: { icon: TwoWheeler, label: 'כלי רכב', emoji: '🚗' },
  tasks: { icon: Assignment, label: 'משימות', emoji: '📋' },
  faults: { icon: Warning, label: 'תקלות', emoji: '⚠️' },
  monthly_checks: { icon: Build, label: 'בדיקות חודשיות', emoji: '🔧' },
  maintenance: { icon: HomeRepairService, label: 'טיפולים', emoji: '🔩' },
  garages: { icon: HomeRepairService, label: 'מוסכים', emoji: '🏭' },
  insurance_claims: { icon: Gavel, label: 'תביעות ביטוח', emoji: '📑' },
  users: { icon: People, label: 'משתמשים', emoji: '👥' },
  reports: { icon: Assessment, label: 'דוחות', emoji: '📊' },
  settings: { icon: Settings, label: 'הגדרות', emoji: '⚙️' },
  audit_logs: { icon: History, label: 'לוג פעולות', emoji: '📝' },
};

// אייקונים לתפקידים
const roleConfig = {
  super_admin: { icon: AdminPanelSettings, emoji: '👑', color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
  manager: { icon: SupervisorAccount, emoji: '👔', color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)' },
  secretary: { icon: Badge, emoji: '📎', color: '#c026d3', gradient: 'linear-gradient(135deg, #c026d3 0%, #e879f9 100%)' },
  logistics: { icon: LocalShipping, emoji: '🚚', color: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)' },
  rider: { icon: SportsMotorsports, emoji: '🏍️', color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)' },
  regional_manager: { icon: ManageAccounts, emoji: '🗺️', color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)' },
};

// הגדרות רמות גישה
const accessLevels = [
  { key: 'none', label: 'ללא', emoji: '🚫', color: '#ef4444', description: 'אין גישה כלל' },
  { key: 'self', label: 'עצמי', emoji: '👤', color: '#f59e0b', description: 'רק מה ששייך אליו' },
  { key: 'view', label: 'צפייה', emoji: '👁️', color: '#3b82f6', description: 'רואה הכל, לא משנה' },
  { key: 'edit', label: 'מלא', emoji: '✏️', color: '#22c55e', description: 'גישה מלאה' },
];

const Permissions = () => {
  const { hasRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      setSuccess('ההרשאות נשמרו בהצלחה! ✅');
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
      setSuccess('ההרשאות אופסו לברירת מחדל ✅');
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" flexDirection="column" gap={2}>
        <CircularProgress size={48} sx={{ color: '#6366f1' }} />
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>טוען הרשאות...</Typography>
      </Box>
    );
  }

  if (!permissions || !metadata) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ borderRadius: '16px' }}>{error || 'שגיאה בטעינת הרשאות'}</Alert>
      </Box>
    );
  }

  const currentRole = metadata.roles[activeTab];
  const isRoleLocked = !isSuperAdmin || currentRole?.key === 'super_admin';
  const currentRoleConfig = roleConfig[currentRole?.key] || {};

  return (
    <Box dir="rtl" sx={{ pb: hasChanges ? 10 : 2 }}>
      {/* Header */}
      <Box sx={{
        mb: 4,
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background pattern */}
        <Box sx={{
          position: 'absolute',
          top: -50,
          left: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <Box sx={{
          position: 'absolute',
          bottom: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ fontSize: { xs: '2.5rem', sm: '3rem' } }}>🔐</Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2rem' }, textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                ניהול הרשאות
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                הגדר מה כל תפקיד יכול לראות ולעשות במערכת
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
                  borderRadius: '14px',
                  fontWeight: 700,
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: '#fff',
                  px: 2.5,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
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
                  borderRadius: '14px',
                  fontWeight: 700,
                  px: 2.5,
                  bgcolor: hasChanges ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: hasChanges ? '#6366f1' : 'rgba(255,255,255,0.5)',
                  boxShadow: hasChanges ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
                  '&:hover': hasChanges ? { bgcolor: '#f8fafc' } : {},
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.4)',
                  },
                }}
              >
                {saving ? 'שומר...' : hasChanges ? 'שמור שינויים' : 'אין שינויים'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* מקרא רמות גישה */}
      <Box sx={{
        mb: 3,
        display: 'flex',
        gap: { xs: 1, sm: 1.5 },
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {accessLevels.map(level => (
          <Tooltip key={level.key} title={level.description} arrow placement="top">
            <Paper sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: { xs: 1.5, sm: 2.5 },
              py: 1,
              borderRadius: '14px',
              border: `2px solid ${alpha(level.color, 0.2)}`,
              bgcolor: alpha(level.color, 0.04),
              cursor: 'default',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(level.color, 0.08),
                borderColor: alpha(level.color, 0.4),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(level.color, 0.15)}`,
              },
            }}>
              <Box sx={{ fontSize: '1.2rem' }}>{level.emoji}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: level.color, lineHeight: 1.2, fontSize: '0.85rem' }}>
                  {level.label}
                </Typography>
                {!isMobile && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', lineHeight: 1 }}>
                    {level.description}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Tooltip>
        ))}
      </Box>

      {/* טאבים לתפקידים */}
      <Paper sx={{
        borderRadius: '24px',
        border: '1px solid',
        borderColor: alpha(currentRoleConfig.color || '#6366f1', 0.15),
        boxShadow: `0 4px 24px ${alpha(currentRoleConfig.color || '#6366f1', 0.08)}`,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}>
        <Box sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: `linear-gradient(180deg, ${alpha(currentRoleConfig.color || '#6366f1', 0.03)} 0%, transparent 100%)`,
        }}>
          <Tabs
            value={activeTab}
            onChange={(_, newVal) => setActiveTab(newVal)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: { xs: '0.8rem', sm: '0.95rem' },
                minHeight: 72,
                textTransform: 'none',
                color: '#94a3b8',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#64748b',
                  bgcolor: 'rgba(0,0,0,0.02)',
                },
                '&.Mui-selected': {
                  color: currentRoleConfig.color || '#6366f1',
                },
              },
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: '4px 4px 0 0',
                background: currentRoleConfig.gradient || '#6366f1',
              },
            }}
          >
            {metadata.roles.map((role) => {
              const config = roleConfig[role.key] || {};
              return (
                <Tab
                  key={role.key}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                        {config.emoji || '👤'}
                      </Box>
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {role.label}
                      </Box>
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>

        {/* תוכן הטאב - הרשאות לתפקיד הנבחר */}
        {currentRole && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* כותרת תפקיד */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
              p: 2.5,
              borderRadius: '18px',
              background: `linear-gradient(135deg, ${alpha(currentRoleConfig.color || '#6366f1', 0.06)} 0%, ${alpha(currentRoleConfig.color || '#6366f1', 0.02)} 100%)`,
              border: `1px solid ${alpha(currentRoleConfig.color || '#6366f1', 0.1)}`,
            }}>
              <Box sx={{ fontSize: '2.5rem' }}>
                {currentRoleConfig.emoji || '👤'}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>
                  {currentRole.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.3 }}>
                  {isRoleLocked ? '🔒 הרשאות קבועות - לא ניתן לשנות' : '👇 לחץ על רמת הגישה הרצויה לשינוי'}
                </Typography>
              </Box>
              {isRoleLocked && (
                <Chip
                  icon={<Lock sx={{ fontSize: 16 }} />}
                  label="נעול"
                  size="small"
                  sx={{
                    bgcolor: alpha('#64748b', 0.1),
                    color: '#64748b',
                    fontWeight: 700,
                    borderRadius: '10px',
                    '& .MuiChip-icon': { color: '#64748b' },
                  }}
                />
              )}
            </Box>

            {/* רשימת ישויות */}
            <Grid container spacing={2}>
              {metadata.entities.map((entity) => {
                const currentLevel = permissions[currentRole.key]?.[entity.key] || 'none';
                const levelConfig = accessLevels.find(l => l.key === currentLevel);
                const eConfig = entityConfig[entity.key] || {};

                return (
                  <Grid item xs={12} sm={6} lg={4} key={entity.key}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: '18px',
                        border: `2px solid ${alpha(levelConfig?.color || '#e2e8f0', 0.2)}`,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden',
                        bgcolor: alpha(levelConfig?.color || '#64748b', 0.02),
                        '&:hover': {
                          borderColor: alpha(levelConfig?.color || '#94a3b8', 0.4),
                          boxShadow: `0 8px 24px ${alpha(levelConfig?.color || '#000', 0.1)}`,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      {/* Entity header with colored accent bar */}
                      <Box sx={{
                        height: 4,
                        background: levelConfig ? `linear-gradient(90deg, ${levelConfig.color}, ${alpha(levelConfig.color, 0.3)})` : '#e2e8f0',
                      }} />

                      <Box sx={{ p: 2.5 }}>
                        {/* שם הישות */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ fontSize: '1.5rem' }}>
                              {eConfig.emoji || '📁'}
                            </Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                              {entity.label}
                            </Typography>
                          </Box>
                          <Chip
                            label={levelConfig?.label || currentLevel}
                            size="small"
                            sx={{
                              bgcolor: alpha(levelConfig?.color || '#64748b', 0.1),
                              color: levelConfig?.color || '#64748b',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              height: 26,
                              borderRadius: '8px',
                            }}
                          />
                        </Box>

                        {/* בחירת רמת גישה - כפתורים עגולים */}
                        <Box sx={{
                          display: 'flex',
                          gap: 0.8,
                          justifyContent: 'space-between',
                        }}>
                          {accessLevels.map(level => {
                            const isSelected = currentLevel === level.key;
                            return (
                              <Tooltip
                                key={level.key}
                                title={`${level.emoji} ${level.label} - ${level.description}`}
                                arrow
                                placement="top"
                              >
                                <Box
                                  onClick={() => {
                                    if (!isRoleLocked) {
                                      handlePermissionChange(currentRole.key, entity.key, level.key);
                                    }
                                  }}
                                  sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    py: 1.2,
                                    px: 0.5,
                                    borderRadius: '14px',
                                    cursor: isRoleLocked ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    bgcolor: isSelected ? alpha(level.color, 0.12) : 'transparent',
                                    border: `2px solid ${isSelected ? level.color : 'transparent'}`,
                                    boxShadow: isSelected ? `0 2px 8px ${alpha(level.color, 0.25)}` : 'none',
                                    opacity: isRoleLocked && !isSelected ? 0.4 : 1,
                                    '&:hover': !isRoleLocked ? {
                                      bgcolor: isSelected ? alpha(level.color, 0.15) : alpha(level.color, 0.06),
                                      transform: 'scale(1.05)',
                                    } : {},
                                  }}
                                >
                                  <Box sx={{
                                    fontSize: { xs: '1.2rem', sm: '1.4rem' },
                                    filter: isSelected ? 'none' : 'grayscale(0.5)',
                                    transition: 'all 0.2s ease',
                                  }}>
                                    {level.emoji}
                                  </Box>
                                  <Typography variant="caption" sx={{
                                    fontWeight: isSelected ? 800 : 600,
                                    color: isSelected ? level.color : '#94a3b8',
                                    fontSize: '0.7rem',
                                    lineHeight: 1,
                                  }}>
                                    {level.label}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* אינדיקטור שינויים צף */}
      {hasChanges && (
        <Fade in>
          <Paper sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 4,
            py: 2,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <Box sx={{ fontSize: '1.4rem' }}>💾</Box>
            <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
              יש שינויים שלא נשמרו
            </Typography>
            <Button
              variant="contained"
              size="medium"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                borderRadius: '14px',
                fontWeight: 800,
                px: 3,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
              }}
            >
              {saving ? 'שומר...' : '💾 שמור'}
            </Button>
          </Paper>
        </Fade>
      )}

      {/* דיאלוג אישור איפוס */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1.5,
            maxWidth: 420,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ fontSize: '1.5rem' }}>⚠️</Box>
          איפוס הרשאות
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569', lineHeight: 1.8 }}>
            האם אתה בטוח שברצונך לאפס את כל ההרשאות לברירת מחדל?
            <br />
            <strong>פעולה זו תמחק את כל השינויים שביצעת.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setResetDialogOpen(false)}
            sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleReset}
            variant="contained"
            sx={{
              borderRadius: '12px',
              fontWeight: 700,
              px: 3,
              bgcolor: '#f59e0b',
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            ⚠️ אפס הרשאות
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
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem' }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Permissions;
