import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
  Divider,
  Button,
  IconButton,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  TwoWheeler,
  Person,
  Warning,
  CheckCircle,
  Assignment,
  Build,
  TrendingUp,
  Notifications,
  CalendarToday,
  Speed,
  Refresh,
  ArrowForward,
  EventAvailable,
  MoneyOff,
  ErrorOutline,
} from '@mui/icons-material';
import { ridersAPI, vehiclesAPI, tasksAPI, faultsAPI } from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasRole } = useAuth();

  const [stats, setStats] = useState({
    totalRiders: 0,
    activeRiders: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    vehiclesWaitingForRider: 0,
    pendingTasks: 0,
    openFaults: 0,
    criticalFaults: 0,
    ridersWithoutMonthlyCheck: 0,
    expiringInsurance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [criticalFaultsList, setCriticalFaultsList] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ridersRes, vehiclesRes, tasksRes, faultsRes] = await Promise.all([
        ridersAPI.getAll().catch(() => ({ data: { riders: [] } })),
        vehiclesAPI.getAll().catch(() => ({ data: { vehicles: [] } })),
        tasksAPI.getAll().catch(() => ({ data: { tasks: [] } })),
        faultsAPI.getAll().catch(() => ({ data: { faults: [] } })),
      ]);

      const riders = ridersRes.data.riders || [];
      const vehicles = vehiclesRes.data.vehicles || [];
      const tasks = tasksRes.data.tasks || [];
      const faults = faultsRes.data.faults || [];

      // חישוב תוקפי ביטוח שמסתיימים בחודש הקרוב
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      const expiringInsurance = vehicles.filter(v => {
        if (!v.insuranceExpiry) return false;
        const expiryDate = new Date(v.insuranceExpiry);
        return expiryDate >= now && expiryDate <= oneMonthFromNow;
      }).length;

      // תקלות קריטיות
      const criticalFaults = faults.filter(f =>
        (f.status === 'open' || f.status === 'in_progress') &&
        (f.severity === 'critical' || f.canRide === false)
      );

      setStats({
        totalRiders: riders.length,
        activeRiders: riders.filter(r => r.riderStatus === 'active' || r.status === 'active').length,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'active').length,
        vehiclesWaitingForRider: vehicles.filter(v => v.status === 'waiting_for_rider' || v.status === 'available').length,
        pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        openFaults: faults.filter(f => f.status === 'open' || f.status === 'in_progress').length,
        criticalFaults: criticalFaults.length,
        ridersWithoutMonthlyCheck: 0, // TODO: יצטרך חישוב מול API בקרה חודשית
        expiringInsurance,
      });

      setCriticalFaultsList(criticalFaults.slice(0, 5));

      // Recent Activity (mock data - replace with real data)
      setRecentActivity([
        { id: 1, type: 'vehicle', text: 'כלי חדש נוסף למערכת', time: 'לפני שעה' },
        { id: 2, type: 'task', text: 'משימה חדשה נוצרה', time: 'לפני שעתיים' },
        { id: 3, type: 'rider', text: 'רוכב חדש נרשם', time: 'לפני 3 שעות' },
        { id: 4, type: 'fault', text: 'תקלה דווחה', time: 'לפני 5 שעות' },
      ]);

      // Alerts
      const newAlerts = [];
      if (criticalFaults.length > 0) {
        newAlerts.push({
          severity: 'error',
          message: `⚠️ ${criticalFaults.length} תקלות קריטיות הממתינות לטיפול!`,
          action: 'faults'
        });
      }
      if (expiringInsurance > 0) {
        newAlerts.push({
          severity: 'warning',
          message: `📋 ${expiringInsurance} כלים עם ביטוח שפוקע בחודש הקרוב`,
          action: 'vehicles'
        });
      }
      const waitingVehicles = vehicles.filter(v => v.status === 'waiting_for_rider' || v.status === 'available').length;
      if (waitingVehicles > 0) {
        newAlerts.push({
          severity: 'info',
          message: `🏍️ ${waitingVehicles} כלים זמינים ללא רוכב משויך`,
          action: 'vehicles'
        });
      }
      if (tasks.filter(t => t.status === 'pending').length > 5) {
        newAlerts.push({
          severity: 'info',
          message: `✅ ${tasks.filter(t => t.status === 'pending').length} משימות ממתינות לביצוע`,
          action: 'tasks'
        });
      }
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const vehicleStatusData = [
    { name: 'פעיל', value: stats.activeVehicles },
    { name: 'ממתין לרוכב', value: Math.max(0, stats.totalVehicles - stats.activeVehicles - 2) },
    { name: 'אחר', value: 2 },
  ];

  const monthlyTrend = [
    { month: 'ינואר', משימות: 12, תקלות: 3 },
    { month: 'פברואר', משימות: 19, תקלות: 5 },
    { month: 'מרץ', משימות: 15, תקלות: 2 },
    { month: 'אפריל', משימות: 22, תקלות: 4 },
    { month: 'מאי', משימות: 18, תקלות: 6 },
    { month: 'יוני', משימות: stats.pendingTasks, תקלות: stats.openFaults },
  ];

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant={isMobile ? 'h4' : 'h3'} component="div" sx={{ fontWeight: 'bold' }}>
              {loading ? <CircularProgress size={30} /> : value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="caption" color="success.main">
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          <Icon sx={{ fontSize: { xs: 40, sm: 60 }, color, opacity: 0.3 }} />
        </Box>
      </CardContent>
    </Card>
  );

  const getActivityIcon = (type) => {
    switch (type) {
      case 'vehicle': return <TwoWheeler />;
      case 'task': return <Assignment />;
      case 'rider': return <Person />;
      case 'fault': return <Warning />;
      default: return <CheckCircle />;
    }
  };

  return (
    <Box>
      {/* Header with Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom fontWeight="bold">
            דשבורד ראשי
          </Typography>
          <Typography variant="body2" color="textSecondary">
            עדכון אחרון: {new Date().toLocaleTimeString('he-IL')}
          </Typography>
        </Box>
        <MuiTooltip title="רענן נתונים">
          <IconButton onClick={loadDashboardData} disabled={loading}>
            <Refresh />
          </IconButton>
        </MuiTooltip>
      </Box>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {alerts.map((alert, idx) => (
            <Alert
              key={idx}
              severity={alert.severity}
              sx={{ mb: 1, cursor: alert.action ? 'pointer' : 'default' }}
              onClick={() => alert.action && navigate(`/${alert.action}`)}
              action={
                alert.action && (
                  <Button color="inherit" size="small" endIcon={<ArrowForward />}>
                    מעבר
                  </Button>
                )
              }
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="סה''כ רוכבים"
            value={stats.totalRiders}
            icon={Person}
            color="#3f51b5"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="רוכבים פעילים"
            value={stats.activeRiders}
            icon={CheckCircle}
            color="#4caf50"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="סה''כ כלים"
            value={stats.totalVehicles}
            icon={TwoWheeler}
            color="#ff9800"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="כלים פעילים"
            value={stats.activeVehicles}
            icon={Speed}
            color="#2196f3"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="כלים ללא רוכב"
            value={stats.vehiclesWaitingForRider}
            icon={TwoWheeler}
            color="#607d8b"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="תקלות פתוחות"
            value={stats.openFaults}
            icon={Warning}
            color="#ff9800"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="תקלות קריטיות"
            value={stats.criticalFaults}
            icon={ErrorOutline}
            color="#f44336"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="משימות פתוחות"
            value={stats.pendingTasks}
            icon={Assignment}
            color="#9c27b0"
          />
        </Grid>

        {stats.expiringInsurance > 0 && (
          <Grid item xs={6} sm={6} md={4} lg={3}>
            <StatCard
              title="ביטוחים שפוקעים"
              value={stats.expiringInsurance}
              icon={EventAvailable}
              color="#ff5722"
            />
          </Grid>
        )}
      </Grid>

      {/* Charts and Activity */}
      <Grid container spacing={3}>
        {/* Monthly Trend */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              מגמות חודשיות
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="משימות" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="תקלות" stroke="#FF8042" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Vehicle Status */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              סטטוס כלים
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vehicleStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                פעילות אחרונה
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.text}
                    secondary={activity.time}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Critical Faults */}
        {criticalFaultsList.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorOutline /> תקלות קריטיות
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/faults')}
                  endIcon={<ArrowForward />}
                >
                  כל התקלות
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                {criticalFaultsList.map((fault, idx) => (
                  <ListItem
                    key={fault._id || idx}
                    sx={{
                      bgcolor: 'error.light',
                      color: 'error.contrastText',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'error.main' }
                    }}
                    onClick={() => navigate(`/faults`)}
                  >
                    <ListItemIcon>
                      <Warning sx={{ color: 'error.contrastText' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={fault.description || 'תקלה ללא תיאור'}
                      secondary={
                        <Typography variant="caption" sx={{ color: 'error.contrastText', opacity: 0.9 }}>
                          {fault.vehicleNumber || 'כלי לא ידוע'} •
                          {fault.canRide === false ? ' לא ניתן לרכב' : ' קריטי'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Quick Actions */}
        <Grid item xs={12} md={6} lg={criticalFaultsList.length > 0 ? 6 : 12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Speed sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                פעולות מהירות
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-4px)' }, transition: 'all 0.2s' }}
                  onClick={() => navigate('/vehicles')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <TwoWheeler sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" fontWeight="500">
                      ניהול כלים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-4px)' }, transition: 'all 0.2s' }}
                  onClick={() => navigate('/riders')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Person sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2" fontWeight="500">
                      ניהול רוכבים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-4px)' }, transition: 'all 0.2s' }}
                  onClick={() => navigate('/tasks')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Assignment sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                    <Typography variant="body2" fontWeight="500">
                      משימות
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-4px)' }, transition: 'all 0.2s' }}
                  onClick={() => navigate('/monthly-checks')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Build sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                    <Typography variant="body2" fontWeight="500">
                      בקרה חודשית
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
