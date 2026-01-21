import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loading - טעינה עצלה של דפים לשיפור ביצועים
// דפים קריטיים לטעינה מהירה
import Login from './pages/Login';

// דפים משניים בטעינה עצלה
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Riders = lazy(() => import('./pages/Riders'));
const RiderDetail = lazy(() => import('./pages/RiderDetail'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const VehicleDetails = lazy(() => import('./pages/VehicleDetails'));
const Tasks = lazy(() => import('./pages/Tasks'));
const MonthlyChecks = lazy(() => import('./pages/MonthlyChecks'));
const Users = lazy(() => import('./pages/Users'));
const Faults = lazy(() => import('./pages/Faults'));
const FormBuilder = lazy(() => import('./pages/FormBuilder'));
const Reports = lazy(() => import('./pages/Reports'));
const FaultReport = lazy(() => import('./pages/FaultReport'));
const MonthlyCheckForm = lazy(() => import('./pages/MonthlyCheckForm'));
const MyVehicle = lazy(() => import('./pages/MyVehicle'));
const MyFaults = lazy(() => import('./pages/MyFaults'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component לטעינה עצלה
const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

// Theme עם תמיכה בעברית (RTL) ומובייל
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          overflowX: 'hidden',
          minHeight: '100vh',
          minHeight: '100dvh',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          '@media (max-width: 600px)': {
            minHeight: 48,
            fontSize: '0.95rem',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: 12,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '8px 6px',
            fontSize: '0.85rem',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 600px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            '& .MuiInputBase-input': {
              fontSize: '16px',
            },
          },
        },
      },
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>טוען...</div>;
  }

  if (!isAuthenticated) {
    // שמור את הנתיב המבוקש כדי להעביר אליו אחרי login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="riders" element={<Riders />} />
          <Route path="riders/:id" element={<RiderDetail />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/:id" element={<VehicleDetails />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="monthly-checks" element={<MonthlyChecks />} />
          <Route path="monthly-check/:id" element={<MonthlyCheckForm />} />
          <Route path="faults" element={<Faults />} />
          <Route path="fault-report" element={<FaultReport />} />
          <Route path="monthly-check-form" element={<MonthlyCheckForm />} />
          <Route path="reports" element={<Reports />} />
          <Route path="form-builder" element={<FormBuilder />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="my-vehicle" element={<MyVehicle />} />
          <Route path="my-faults" element={<MyFaults />} />
          <Route path="my-profile" element={<MyProfile />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
