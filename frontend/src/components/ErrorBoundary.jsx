import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            bgcolor: '#f5f5f5',
            p: 3,
          }}
          dir="rtl"
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 80,
                color: 'error.main',
                mb: 2,
              }}
            />

            <Typography variant="h4" gutterBottom fontWeight="bold">
              אופס! משהו השתבש
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              אירעה שגיאה בלתי צפויה במערכת. אנא נסה לרענן את הדף או חזור לדף הבית.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'right' }}>
              <Typography variant="body2" fontWeight="bold">
                פרטי השגיאה:
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                {this.state.error && this.state.error.toString()}
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    overflow: 'auto',
                    textAlign: 'left',
                    fontSize: '0.7rem',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </Typography>
              )}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Refresh />}
                onClick={this.handleReset}
                size="large"
              >
                חזור לדף הבית
              </Button>

              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                size="large"
              >
                רענן דף
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
