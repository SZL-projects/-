import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { Notifications, Shield, DirectionsCar } from '@mui/icons-material';
import axios from 'axios';

const STORAGE_KEY = 'notifications_read_ids';

function getReadIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [readIds, setReadIds] = useState(getReadIds);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/notifications/alerts');
      if (data.success) setAlerts(data.alerts);
    } catch {
      // שגיאה שקטה - לא להראות ניפוי שגיאות למשתמש
    }
  }, []);

  // טעינה ראשונית + רענון כל 5 דקות
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const unreadAlerts = alerts.filter(a => !readIds.includes(a.id));
  const unreadCount = unreadAlerts.length;

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
    handleClose();
    navigate(`/vehicles/${alert.vehicleId}`);
  };

  const getDaysColor = (daysLeft) => {
    if (daysLeft <= 3) return '#ef4444';
    if (daysLeft <= 7) return '#f97316';
    return '#f59e0b';
  };

  const getAlertIcon = (type) => {
    if (type === 'insurance') return <Shield sx={{ fontSize: 18, color: '#6366f1' }} />;
    return <DirectionsCar sx={{ fontSize: 18, color: '#3b82f6' }} />;
  };

  const getTypeLabel = (alert) => {
    if (alert.type === 'insurance') {
      return alert.subType === 'mandatory' ? 'ביטוח חובה' : 'ביטוח מקיף';
    }
    return 'טסט / רשיון רכב';
  };

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
          {alerts.length > 0 && (
            <Chip
              label={`${alerts.length} פעילות`}
              size="small"
              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* תוכן */}
        <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
          {alerts.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Notifications sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                אין התראות פעילות
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {alerts.map((alert, index) => (
                <Box key={alert.id}>
                  <ListItem
                    button
                    onClick={() => handleAlertClick(alert)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      gap: 1.5,
                      bgcolor: readIds.includes(alert.id) ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                      cursor: 'pointer',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ pt: 0.3 }}>{getAlertIcon(alert.type)}</Box>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>
                          {alert.licensePlate}
                        </Typography>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.3 }}>
                          <Typography component="span" variant="caption" color="text.secondary">
                            {getTypeLabel(alert)}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ fontWeight: 700, color: getDaysColor(alert.daysLeft) }}
                          >
                            פוקע בעוד {alert.daysLeft} ימים •{' '}
                            {new Date(alert.expiryDate).toLocaleDateString('he-IL')}
                          </Typography>
                        </Box>
                      }
                    />
                    {!readIds.includes(alert.id) && (
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#6366f1',
                        flexShrink: 0,
                        mt: 0.8,
                      }} />
                    )}
                  </ListItem>
                  {index < alerts.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
