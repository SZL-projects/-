import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  TwoWheeler,
  Person,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { ridersAPI, vehiclesAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRiders: 0,
    activeRiders: 0,
    totalVehicles: 0,
    activeVehicles: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [ridersRes, vehiclesRes] = await Promise.all([
        ridersAPI.getAll(),
        vehiclesAPI.getAll(),
      ]);

      const riders = ridersRes.data.riders || [];
      const vehicles = vehiclesRes.data.vehicles || [];

      setStats({
        totalRiders: riders.length,
        activeRiders: riders.filter(r => r.riderStatus === 'active').length,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'active').length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h3" component="div">
              {loading ? <CircularProgress size={30} /> : value}
            </Typography>
          </Box>
          <Icon sx={{ fontSize: 60, color, opacity: 0.3 }} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        דשבורד ראשי
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="סה''כ רוכבים"
            value={stats.totalRiders}
            icon={Person}
            color="#3f51b5"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="רוכבים פעילים"
            value={stats.activeRiders}
            icon={CheckCircle}
            color="#4caf50"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="סה''כ כלים"
            value={stats.totalVehicles}
            icon={TwoWheeler}
            color="#ff9800"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="כלים פעילים"
            value={stats.activeVehicles}
            icon={CheckCircle}
            color="#2196f3"
          />
        </Grid>
      </Grid>

      {/* תוכן נוסף */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              פעילות אחרונה
            </Typography>
            <Typography color="textSecondary">
              בקרוב - היסטוריית פעולות אחרונות במערכת
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              התראות
            </Typography>
            <Typography color="textSecondary">
              בקרוב - התראות על תוקפי ביטוח, בקרות חודשיות ועוד
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
