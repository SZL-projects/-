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
  InputAdornment,
} from '@mui/material';
import {
  TwoWheeler,
  ArrowBack,
  Email,
  CheckCircle,
  Send,
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
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'fadeIn 0.5s ease-out',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                mx: 'auto',
                mb: 3,
              }}
            >
              <TwoWheeler sx={{ fontSize: 44, color: '#ffffff' }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight="bold"
              sx={{ color: '#1e293b' }}
            >
              שכחתי סיסמה
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס סיסמה
            </Typography>
          </Box>

          {/* Success Alert */}
          {success && (
            <Alert
              severity="success"
              icon={<CheckCircle sx={{ color: '#059669' }} />}
              sx={{
                mb: 3,
                borderRadius: '12px',
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                '& .MuiAlert-message': { color: '#059669' },
              }}
            >
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, color: '#059669' }}>
                נשלח בהצלחה!
              </Typography>
              <Typography variant="body2" sx={{ color: '#059669' }}>
                אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.
                הקישור יפוג בעוד 10 דקות.
              </Typography>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '12px',
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '& .MuiAlert-message': { color: '#dc2626' },
              }}
            >
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
                autoFocus
                dir="rtl"
                placeholder="example@domain.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: '#f8fafc',
                    '&:hover fieldset': { borderColor: '#6366f1' },
                    '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={!loading && <Send />}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 12px 24px rgba(99, 102, 241, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {loading ? 'שולח...' : 'שלח קישור לאיפוס סיסמה'}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6366f1',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#4f46e5';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#6366f1';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              <ArrowBack sx={{ fontSize: 18 }} />
              חזור למסך התחברות
            </Link>
          </Box>

          {/* Footer */}
          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 4, color: '#94a3b8' }}
          >
            © {new Date().getFullYear()} צי לוג ידידים
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
