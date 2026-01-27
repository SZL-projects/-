import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  TwoWheeler,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Lock,
  LockReset,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password.length < 6) {
      setError('הסיסמה חייבת להיות לפחות 6 תווים');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      setLoading(false);
      return;
    }

    try {
      await axios.put(`${API_URL}/auth/reset-password/${token}`, {
        password: formData.password,
      });
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה באיפוס סיסמה. הטוקן אינו תקין או שפג תוקפו.');
    } finally {
      setLoading(false);
    }
  };

  const textFieldSx = {
    mb: 2,
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: '#f8fafc',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
    '& .MuiFormHelperText-root': { color: '#64748b' },
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
              איפוס סיסמה
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              הזן סיסמה חדשה לחשבון שלך
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
                הסיסמה אופסה בהצלחה!
              </Typography>
              <Typography variant="body2" sx={{ color: '#059669' }}>
                מעביר אותך למסך התחברות...
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
                label="סיסמה חדשה"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                autoFocus
                dir="rtl"
                helperText="לפחות 6 תווים"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#64748b' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={textFieldSx}
              />

              <TextField
                fullWidth
                label="אימות סיסמה"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                dir="rtl"
                helperText="הזן את הסיסמה שוב לאימות"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: '#64748b' }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={textFieldSx}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={!loading && <LockReset />}
                sx={{
                  mt: 2,
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
                {loading ? 'מאפס סיסמה...' : 'אפס סיסמה'}
              </Button>
            </form>
          )}

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
