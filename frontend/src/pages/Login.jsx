import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  TwoWheeler,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // בדיקה אם יש redirect URL שמור
  const from = location.state?.from?.pathname || sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🔐 Login form submitted');
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Calling login with:', { username: formData.username, rememberMe });
      const result = await login(formData, rememberMe);
      console.log('🔐 Login result:', result);

      if (result.success) {
        console.log('🔐 Login successful, navigating to:', from);
        sessionStorage.removeItem('redirectAfterLogin'); // נקה את ה-redirect
        navigate(from, { replace: true });
      } else {
        console.log('🔐 Login failed:', result.message);
        setError(result.message);
      }
    } catch (err) {
      console.error('🔐 Login error:', err);
      setError('שגיאה בהתחברות: ' + (err.message || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        position: 'relative',
        p: { xs: 2, sm: 3 },
        overflow: 'auto',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ my: 'auto', position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: '24px',
            maxWidth: '100%',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: { xs: 4, sm: 5 } }}>
            <Box sx={{
              width: { xs: 80, sm: 100 },
              height: { xs: 80, sm: 100 },
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 3,
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)',
            }}>
              <TwoWheeler sx={{ fontSize: { xs: 40, sm: 50 }, color: '#ffffff' }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2rem' },
                color: '#1e293b',
                mb: 1,
              }}
            >
              צי לוג ידידים
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#64748b',
                fontSize: { xs: '0.9rem', sm: '1rem' },
              }}
            >
              מערכת ניהול צי רכב
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} action="javascript:void(0);">
            <TextField
              fullWidth
              label="שם משתמש"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              margin="normal"
              autoFocus
              dir="rtl"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: '#f8fafc',
                  '&:hover': { bgcolor: '#f1f5f9' },
                  '&.Mui-focused': { bgcolor: '#ffffff' },
                },
              }}
            />

            <TextField
              fullWidth
              label="סיסמה"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              margin="normal"
              dir="rtl"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: '#f8fafc',
                  '&:hover': { bgcolor: '#f1f5f9' },
                  '&.Mui-focused': { bgcolor: '#ffffff' },
                },
              }}
              InputProps={{
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
            />

            {/* Remember Me & Forgot Password */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: '#6366f1',
                      '&.Mui-checked': { color: '#6366f1' },
                    }}
                  />
                }
                label={<Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>זכור אותי</Typography>}
              />
              <Link
                to="/forgot-password"
                style={{
                  color: '#6366f1',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                שכחתי סיסמה
              </Link>
            </Box>

            <Button
              type="button"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              onClick={handleSubmit}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.75,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  boxShadow: 'none',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>

          {/* Footer */}
          <Typography
            variant="body2"
            align="center"
            sx={{
              mt: 4,
              color: '#94a3b8',
              fontSize: '0.8rem',
            }}
          >
            גרסה 3.23.0
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
