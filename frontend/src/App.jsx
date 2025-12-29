import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Riders from './pages/Riders';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import Tasks from './pages/Tasks';
import MonthlyChecks from './pages/MonthlyChecks';
import Users from './pages/Users';
import Faults from './pages/Faults';
import FormBuilder from './pages/FormBuilder';
import Reports from './pages/Reports';
import FaultReport from './pages/FaultReport';
import MonthlyCheckForm from './pages/MonthlyCheckForm';
import ErrorBoundary from './components/ErrorBoundary';

// Theme עם תמיכה בעברית (RTL)
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>טוען...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
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
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="vehicles/:id" element={<VehicleDetails />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="monthly-checks" element={<MonthlyChecks />} />
        <Route path="faults" element={<Faults />} />
        <Route path="fault-report" element={<FaultReport />} />
        <Route path="monthly-check-form" element={<MonthlyCheckForm />} />
        <Route path="reports" element={<Reports />} />
        <Route path="form-builder" element={<FormBuilder />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
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
