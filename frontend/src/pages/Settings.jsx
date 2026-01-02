import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  CloudDone,
  CloudOff,
  Refresh,
  Link as LinkIcon
} from '@mui/icons-material';
import api from '../services/api';

const Settings = () => {
  const [driveStatus, setDriveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // בדיקת סטטוס Google Drive
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

  // התחלת תהליך אימות
  const handleAuthorize = async () => {
    setAuthorizing(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.get('/drive/authorize');
      const { authUrl } = response.data;

      // פתיחת חלון OAuth
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authUrl,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // המתנה לסגירת החלון
      const checkWindow = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkWindow);
          setAuthorizing(false);
          setSuccess('Google Drive מחובר בהצלחה!');

          // רענון סטטוס אחרי 2 שניות
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

  // ניתוק Google Drive
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          הגדרות מערכת
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {loading ? (
                <CircularProgress size={24} sx={{ mr: 2 }} />
              ) : driveStatus?.authorized ? (
                <CloudDone color="success" sx={{ mr: 2, fontSize: 40 }} />
              ) : (
                <CloudOff color="error" sx={{ mr: 2, fontSize: 40 }} />
              )}
              <Typography variant="h6">
                Google Drive
              </Typography>
            </Box>

            {!loading && driveStatus && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={driveStatus.authorized ? 'מחובר' : 'לא מחובר'}
                    color={driveStatus.authorized ? 'success' : 'error'}
                    sx={{ mr: 1 }}
                  />
                  {driveStatus.authorized && driveStatus.expired && (
                    <Chip
                      label="הטוקן פג תוקף"
                      color="warning"
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {driveStatus.message}
                </Typography>

                {driveStatus.lastUpdated && (
                  <Typography variant="caption" color="text.secondary">
                    עדכון אחרון: {new Date(driveStatus.lastUpdated.seconds * 1000).toLocaleString('he-IL')}
                  </Typography>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  {!driveStatus.authorized || driveStatus.expired ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={authorizing ? <CircularProgress size={20} /> : <LinkIcon />}
                      onClick={handleAuthorize}
                      disabled={authorizing}
                    >
                      {authorizing ? 'מתחבר...' : 'התחבר ל-Google Drive'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<Refresh />}
                        onClick={checkDriveStatus}
                      >
                        רענן סטטוס
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleRevoke}
                      >
                        נתק
                      </Button>
                    </>
                  )}
                </Box>
              </>
            )}

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                מידע על חיבור Google Drive:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • החיבור מאפשר העלאת קבצים לתיקיית Google Drive שלך
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • כל כלי יקבל תיקייה נפרדת עם תיקיות משנה לביטוחים ותמונות
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • הקבצים יהיו זמינים לכולם עם הקישור
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default Settings;
