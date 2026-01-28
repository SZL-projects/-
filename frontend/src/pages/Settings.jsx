import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../utils/dateUtils';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  CloudDone,
  CloudOff,
  Refresh,
  Link as LinkIcon,
  Settings as SettingsIcon,
  Sync,
} from '@mui/icons-material';
import api from '../services/api';

const Settings = () => {
  const [driveStatus, setDriveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [refreshingFolders, setRefreshingFolders] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checkDriveStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/drive/status');
      setDriveStatus(response.data);
    } catch (err) {
      console.error('Error checking drive status:', err);
      setError(err.response?.data?.message || 'שגיאה בבדיקת סטטוס Google Drive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const handleAuthorize = async () => {
    setAuthorizing(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.get('/drive/authorize');
      const { authUrl } = response.data;

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authUrl,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkWindow = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkWindow);
          setAuthorizing(false);
          setSuccess('Google Drive מחובר בהצלחה!');

          setTimeout(() => {
            checkDriveStatus();
          }, 2000);
        }
      }, 500);

    } catch (err) {
      console.error('Authorization error:', err);
      setError(err.response?.data?.message || 'שגיאה בתהליך האימות');
      setAuthorizing(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לנתק את Google Drive?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/drive/revoke');
      setSuccess('Google Drive נותק בהצלחה');
      checkDriveStatus();
    } catch (err) {
      console.error('Revoke error:', err);
      setError(err.response?.data?.message || 'שגיאה בניתוק Google Drive');
      setLoading(false);
    }
  };

  const handleRefreshFolders = async () => {
    if (!window.confirm('האם לרענן את מבנה התיקיות בדרייב? פעולה זו תיצור תיקיות חסרות ותסדר את המבנה.')) {
      return;
    }

    setRefreshingFolders(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/vehicles/refresh-drive-folders');
      const { data } = response.data;

      let message = 'ריענון התיקיות הושלם בהצלחה!';
      if (data) {
        const details = [];
        if (data.vehiclesCreated > 0) details.push(`נוצרו ${data.vehiclesCreated} תיקיות כלים`);
        if (data.ridersCreated > 0) details.push(`נוצרו ${data.ridersCreated} תיקיות רוכבים`);
        if (data.vehiclesMoved > 0) details.push(`הועברו ${data.vehiclesMoved} תיקיות כלים`);
        if (data.ridersMoved > 0) details.push(`הועברו ${data.ridersMoved} תיקיות רוכבים`);
        if (details.length > 0) {
          message += ' ' + details.join(', ');
        }
      }

      setSuccess(message);
    } catch (err) {
      console.error('Refresh folders error:', err);
      setError(err.response?.data?.message || 'שגיאה בריענון תיקיות הדרייב');
    } finally {
      setRefreshingFolders(false);
    }
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
          <SettingsIcon sx={{ fontSize: 28, color: '#ffffff' }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
            הגדרות מערכת
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            נהל את הגדרות המערכת והחיבורים שלך
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: '12px',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
            borderRadius: '12px',
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      <Card
        sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {loading ? (
              <CircularProgress size={40} sx={{ color: '#6366f1', ml: 2 }} />
            ) : driveStatus?.authorized ? (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ml: 2,
                }}
              >
                <CloudDone sx={{ color: '#059669', fontSize: 28 }} />
              </Box>
            ) : (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ml: 2,
                }}
              >
                <CloudOff sx={{ color: '#dc2626', fontSize: 28 }} />
              </Box>
            )}
            <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
              חשבון Google
            </Typography>
          </Box>

          {!loading && driveStatus && (
            <>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={driveStatus.authorized ? 'מחובר' : 'לא מחובר'}
                  sx={{
                    bgcolor: driveStatus.authorized ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: driveStatus.authorized ? '#059669' : '#dc2626',
                    fontWeight: 500,
                  }}
                />
                {driveStatus.authorized && driveStatus.expired && (
                  <Chip
                    label="הטוקן פג תוקף"
                    sx={{
                      bgcolor: 'rgba(245, 158, 11, 0.1)',
                      color: '#d97706',
                      fontWeight: 500,
                    }}
                  />
                )}
              </Box>

              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                {driveStatus.message}
              </Typography>

              {driveStatus.lastUpdated && (
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 3 }}>
                  עדכון אחרון: {formatDateTime(driveStatus.lastUpdated)}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {!driveStatus.authorized || driveStatus.expired ? (
                  <Button
                    variant="contained"
                    startIcon={authorizing ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <LinkIcon />}
                    onClick={handleAuthorize}
                    disabled={authorizing}
                    sx={{
                      borderRadius: '10px',
                      px: 3,
                      fontWeight: 600,
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      },
                      '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
                    }}
                  >
                    {authorizing ? 'מתחבר...' : 'התחבר לחשבון Google'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={checkDriveStatus}
                      sx={{
                        borderRadius: '10px',
                        px: 3,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: '#6366f1',
                        color: '#6366f1',
                        '&:hover': {
                          borderColor: '#4f46e5',
                          bgcolor: 'rgba(99, 102, 241, 0.04)',
                        },
                      }}
                    >
                      רענן סטטוס
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={refreshingFolders ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Sync />}
                      onClick={handleRefreshFolders}
                      disabled={refreshingFolders}
                      sx={{
                        borderRadius: '10px',
                        px: 3,
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        },
                        '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
                      }}
                    >
                      {refreshingFolders ? 'מרענן תיקיות...' : 'רענן תיקיות דרייב'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleRevoke}
                      sx={{
                        borderRadius: '10px',
                        px: 3,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: '#dc2626',
                        color: '#dc2626',
                        '&:hover': {
                          borderColor: '#b91c1c',
                          bgcolor: 'rgba(239, 68, 68, 0.04)',
                        },
                      }}
                    >
                      נתק
                    </Button>
                  </>
                )}
              </Box>
            </>
          )}

          <Box
            sx={{
              mt: 4,
              p: 3,
              bgcolor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
              מידע על חיבור חשבון Google:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                • Google Drive - העלאת קבצים ומסמכים לכלים ורוכבים
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                • מבנה תיקיות: תיקיית "כלים" (לפי מספר פנימי) ותיקיית "רוכבים" (לפי שם)
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                • Gmail - שליחת מיילים אוטומטיים לרוכבים והתראות
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                • לחצן "רענן תיקיות דרייב" - יוצר תיקיות חסרות ומסדר את המבנה
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
