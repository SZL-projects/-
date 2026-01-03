import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import {
  TwoWheeler,
  ArrowBack,
  Email,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בשליחת מייל לאיפוס סיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: 4,
            borderRadius: 3,
          }}
        >
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <TwoWheeler
              sx={{
                fontSize: 80,
                color: 'primary.main',
                mb: 2,
              }}
            />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              שכחתי סיסמה
            </Typography>
            <Typography variant="body1" color="text.secondary">
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס סיסמה
            </Typography>
          </Box>

          {/* Success Alert */}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>נשלח בהצלחה!</strong>
              </Typography>
              <Typography variant="body2">
                אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.
                הקישור יפוג בעוד 10 דקות.
              </Typography>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="כתובת אימייל"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                margin="normal"
                autoFocus
                dir="rtl"
                placeholder="example@domain.com"
                InputProps={{
                  startAdornment: (
                    <Email sx={{ color: 'action.active', mr: 1 }} />
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  fontSize: '1.1rem',
                }}
              >
                {loading ? 'שולח...' : 'שלח קישור לאיפוס סיסמה'}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1976d2',
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              <ArrowBack sx={{ fontSize: 18 }} />
              חזור למסך התחברות
            </Link>
          </Box>

          {/* Footer */}
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 4 }}
          >
            © {new Date().getFullYear()} צי לוג ידידים
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
