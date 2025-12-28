import { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { ridersAPI, vehiclesAPI, tasksAPI, faultsAPI } from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [stats, setStats] = useState({
    totalRiders: 0,
    activeRiders: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    pendingTasks: 0,
    openFaults: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);

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

      setStats({
        totalRiders: riders.length,
        activeRiders: riders.filter(r => r.riderStatus === 'active').length,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'active').length,
        pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        openFaults: faults.filter(f => f.status === 'open').length,
      });

      // Recent Activity (mock data - replace with real data)
      setRecentActivity([
        { id: 1, type: 'vehicle', text: 'כלי חדש נוסף למערכת', time: 'לפני שעה' },
        { id: 2, type: 'task', text: 'משימה חדשה נוצרה', time: 'לפני שעתיים' },
        { id: 3, type: 'rider', text: 'רוכב חדש נרשם', time: 'לפני 3 שעות' },
        { id: 4, type: 'fault', text: 'תקלה דווחה', time: 'לפני 5 שעות' },
      ]);

      // Alerts
      const newAlerts = [];
      if (faults.filter(f => f.status === 'open' && f.severity === 'critical').length > 0) {
        newAlerts.push({ severity: 'error', message: 'יש תקלות קריטיות הממתינות לטיפול' });
      }
      if (vehicles.filter(v => v.status === 'waiting_for_rider').length > 0) {
        newAlerts.push({ severity: 'warning', message: `${vehicles.filter(v => v.status === 'waiting_for_rider').length} כלים ממתינים לרוכב` });
      }
      if (tasks.filter(t => t.status === 'pending').length > 5) {
        newAlerts.push({ severity: 'info', message: 'יש מספר רב של משימות ממתינות' });
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
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        דשבורד ראשי
      </Typography>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {alerts.map((alert, idx) => (
            <Alert key={idx} severity={alert.severity} sx={{ mb: 1 }}>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title="סה''כ רוכבים"
            value={stats.totalRiders}
            icon={Person}
            color="#3f51b5"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title="רוכבים פעילים"
            value={stats.activeRiders}
            icon={CheckCircle}
            color="#4caf50"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title="סה''כ כלים"
            value={stats.totalVehicles}
            icon={TwoWheeler}
            color="#ff9800"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title="כלים פעילים"
            value={stats.activeVehicles}
            icon={CheckCircle}
            color="#2196f3"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title="משימות פתוחות"
            value={stats.pendingTasks}
            icon={Assignment}
            color="#9c27b0"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title="תקלות פתוחות"
            value={stats.openFaults}
            icon={Warning}
            color="#f44336"
          />
        </Grid>
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

        {/* Quick Actions */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Speed sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                פעולות מהירות
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TwoWheeler sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2">
                      הוסף כלי חדש
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Person sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2">
                      הוסף רוכב חדש
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Assignment sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="body2">
                      צור משימה
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                    <Typography variant="body2">
                      דווח תקלה
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
