import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import { Notifications, Shield, DirectionsCar, Close, Warning as WarningIcon } from '@mui/icons-material';
import api from '../services/api';

const READ_KEY = 'notifications_read_ids';
const DISMISSED_KEY = 'notifications_dismissed'; // { id: isoString }
const AUTO_CLEAR_DAYS = 7; // מחיקה אוטומטית אחרי 7 ימים מקריאה

function getReadIds() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReadIds(ids) {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
}

function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDismissed(map) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
}

// מנקה רשומות ישנות שעברו AUTO_CLEAR_DAYS ימים מאז נקראו
function cleanOldDismissed(dismissed, readIds) {
  const now = Date.now();
  const cutoff = AUTO_CLEAR_DAYS * 24 * 60 * 60 * 1000;
  const cleaned = {};
  for (const [id, iso] of Object.entries(dismissed)) {
    const age = now - new Date(iso).getTime();
    // שמור רק אם עדיין בתוך חלון הניקוי
    if (age < cutoff) {
      cleaned[id] = iso;
    }
  }
  return cleaned;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [readIds, setReadIds] = useState(getReadIds);
  const [dismissed, setDismissed] = useState(() => {
    const raw = getDismissed();
    return cleanOldDismissed(raw, getReadIds());
  });

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/alerts');
      if (data.success) setAlerts(data.alerts);
    } catch {
      // שגיאה שקטה
    }
  }, []);

  // ניקוי אוטומטי: הסרת dismissed ישנים בכל פתיחה
  useEffect(() => {
    const cleaned = cleanOldDismissed(getDismissed(), readIds);
    setDismissed(cleaned);
    saveDismissed(cleaned);
  }, []);

  // טעינה ראשונית + רענון כל 5 דקות
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // התראות שלא נמחקו
  const visibleAlerts = alerts.filter(a => !dismissed[a.id]);
  const unreadCount = visibleAlerts.filter(a => !readIds.includes(a.id)).length;

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    // סימון כולם כנקראו
    const allIds = alerts.map(a => a.id);
    setReadIds(allIds);
    saveReadIds(allIds);
  };

  const handleAlertClick = (alert) => {
    // סמן כנקרא
    if (!readIds.includes(alert.id)) {
      const updated = [...readIds, alert.id];
      setReadIds(updated);
      saveReadIds(updated);
    }
    setAnchorEl(null);
    if (alert.type === 'fault') {
      navigate('/faults');
    } else if (hasPermission('vehicles', 'view')) {
      navigate(`/vehicles/${alert.vehicleId}`);
    } else {
      navigate('/my-vehicle');
    }
  };

  const handleDismiss = (e, alert) => {
    e.stopPropagation();
    const updated = { ...dismissed, [alert.id]: new Date().toISOString() };
    setDismissed(updated);
    saveDismissed(updated);
    // סמן גם כנקרא
    if (!readIds.includes(alert.id)) {
      const updatedRead = [...readIds, alert.id];
      setReadIds(updatedRead);
      saveReadIds(updatedRead);
    }
  };

  const getDaysColor = (daysLeft) => {
    if (daysLeft <= 3) return '#ef4444';
    if (daysLeft <= 7) return '#f97316';
    return '#f59e0b';
  };

  const getAlertIcon = (type) => {
    if (type === 'insurance') return <Shield sx={{ fontSize: 18, color: '#6366f1' }} />;
    if (type === 'fault') return <WarningIcon sx={{ fontSize: 18, color: '#ef4444' }} />;
    return <DirectionsCar sx={{ fontSize: 18, color: '#3b82f6' }} />;
  };

  const getTypeLabel = (alert) => {
    if (alert.type === 'insurance') {
      return 'ביטוח';
    }
    if (alert.type === 'fault') {
      const severityMap = { critical: 'קריטית', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
      const statusMap = { open: 'פתוחה', in_progress: 'בטיפול' };
      return `תקלה ${severityMap[alert.severity] || ''} | ${statusMap[alert.status] || alert.status}${alert.canRide === false ? ' | ⚠️ לא ניתן לרכב' : ''}`;
    }
    return 'טסט / רשיון רכב';
  };

  const getFaultDaysText = (alert) => {
    if (alert.type !== 'fault') return null;
    const created = new Date(alert.createdAt);
    const diffMs = Date.now() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'לפני פחות משעה';
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    const diffDays = Math.floor(diffHours / 24);
    return `לפני ${diffDays} ימים`;
  };

  const isRead = (alert) => readIds.includes(alert.id);

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          bgcolor: 'rgba(255,255,255,0.1)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
          color: 'white',
          position: 'relative',
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              minWidth: 18,
              height: 18,
              fontWeight: 700,
            },
          }}
        >
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            width: 340,
            maxHeight: 480,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            mt: 1,
          },
        }}
      >
        {/* כותרת */}
        <Box sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
            התראות
          </Typography>
          {visibleAlerts.length > 0 && (
            <Chip
              label={`${visibleAlerts.length} פעילות`}
              size="small"
              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* תוכן */}
        <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
          {visibleAlerts.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Notifications sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                אין התראות פעילות
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {visibleAlerts.map((alert, index) => {
                const read = isRead(alert);
                return (
                  <Box key={alert.id}>
                    <ListItem
                      button
                      onClick={() => handleAlertClick(alert)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        gap: 1.5,
                        bgcolor: read ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                        opacity: read ? 0.65 : 1,
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)', opacity: 1 },
                        cursor: 'pointer',
                        alignItems: 'flex-start',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Box sx={{ pt: 0.3 }}>{getAlertIcon(alert.type)}</Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: read ? 400 : 600, color: '#1e293b', lineHeight: 1.3 }}>
                              {alert.type === 'fault' ? alert.title : alert.licensePlate}
                            </Typography>
                            {read && (
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                נקרא
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.3 }}>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {getTypeLabel(alert)}
                            </Typography>
                            {alert.type === 'fault' ? (
                              <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>
                                כלי: {alert.licensePlate} • {getFaultDaysText(alert)}
                              </Typography>
                            ) : (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ fontWeight: 700, color: getDaysColor(alert.daysLeft) }}
                              >
                                פוקע בעוד {alert.daysLeft} ימים •{' '}
                                {new Date(alert.expiryDate).toLocaleDateString('he-IL')}
                              </Typography>
                            )}
                          </Box>
                        }
                      />

                      {/* נקודה כחולה לא-נקרא */}
                      {!read && (
                        <Box sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#6366f1',
                          flexShrink: 0,
                          mt: 0.8,
                        }} />
                      )}

                      {/* כפתור מחיקה */}
                      <Tooltip title={`הסר (יימחק אוטומטית אחרי ${AUTO_CLEAR_DAYS} ימים)`} placement="top">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDismiss(e, alert)}
                          sx={{
                            p: 0.3,
                            color: '#94a3b8',
                            flexShrink: 0,
                            mt: 0.2,
                            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' },
                          }}
                        >
                          <Close sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </ListItem>
                    {index < visibleAlerts.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
