import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Divider,
  Stack,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TwoWheeler,
  Person,
  Warning,
  Assignment,
  Print,
  FilterList,
  Build,
  Gavel,
  CheckCircle,
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { reportsAPI } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function Reports() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [summary, setSummary] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [vehiclesData, setVehiclesData] = useState(null);
  const [faultsData, setFaultsData] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [tasksData, setTasksData] = useState(null);
  const [insuranceData, setInsuranceData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, trendsRes, vehiclesRes, faultsRes, maintenanceRes, tasksRes, insuranceRes] = await Promise.all([
        reportsAPI.getSummary(),
        reportsAPI.getMonthlyTrends(6),
        reportsAPI.getVehicles(),
        reportsAPI.getFaults(),
        reportsAPI.getMaintenance(),
        reportsAPI.getTasks(),
        reportsAPI.getInsurance(),
      ]);

      setSummary(summaryRes.data.summary);
      setMonthlyTrends(trendsRes.data.trends || []);
      setVehiclesData(vehiclesRes.data);
      setFaultsData(faultsRes.data);
      setMaintenanceData(maintenanceRes.data);
      setTasksData(tasksRes.data);
      setInsuranceData(insuranceRes.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('שגיאה בטעינת נתוני הדוחות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summaryStats = summary ? [
    { title: 'סה"כ כלים', value: summary.totalVehicles, icon: <TwoWheeler sx={{ fontSize: 24 }} />, color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.1)' },
    { title: 'כלים פעילים', value: summary.activeVehicles, icon: <TwoWheeler sx={{ fontSize: 24 }} />, color: '#059669', bgcolor: 'rgba(16, 185, 129, 0.1)' },
    { title: 'סה"כ רוכבים', value: summary.totalRiders, icon: <Person sx={{ fontSize: 24 }} />, color: '#0891b2', bgcolor: 'rgba(6, 182, 212, 0.1)' },
    { title: 'תקלות פתוחות', value: summary.openFaults, icon: <Warning sx={{ fontSize: 24 }} />, color: '#dc2626', bgcolor: 'rgba(239, 68, 68, 0.1)' },
    { title: 'משימות פעילות', value: summary.activeTasks, icon: <Assignment sx={{ fontSize: 24 }} />, color: '#d97706', bgcolor: 'rgba(245, 158, 11, 0.1)' },
    { title: 'בקרות חודש זה', value: summary.monthlyChecksThisMonth, icon: <CheckCircle sx={{ fontSize: 24 }} />, color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' },
  ] : [];

  const insights = [];
  if (summary) {
    const activePercent = summary.totalVehicles > 0
      ? Math.round((summary.activeVehicles / summary.totalVehicles) * 100)
      : 0;
    insights.push({
      icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
      label: `${activePercent}% מהכלים בסטטוס פעיל`,
      color: '#059669',
      bgcolor: 'rgba(16, 185, 129, 0.1)',
    });

    if (summary.openFaults > 0) {
      insights.push({
        icon: <Warning sx={{ fontSize: 18 }} />,
        label: `${summary.openFaults} תקלות ממתינות לטיפול`,
        color: '#dc2626',
        bgcolor: 'rgba(239, 68, 68, 0.1)',
      });
    }

    if (summary.monthlyChecksThisMonth > 0) {
      insights.push({
        icon: <CheckCircle sx={{ fontSize: 18 }} />,
        label: `${summary.monthlyChecksThisMonth} בקרות חודשיות בוצעו החודש`,
        color: '#6366f1',
        bgcolor: 'rgba(99, 102, 241, 0.1)',
      });
    }

    if (summary.totalMaintenanceCost > 0) {
      insights.push({
        icon: <Build sx={{ fontSize: 18 }} />,
        label: `עלות טיפולים כוללת: ${summary.totalMaintenanceCost.toLocaleString()} \u20AA`,
        color: '#d97706',
        bgcolor: 'rgba(245, 158, 11, 0.1)',
      });
    }

    if (summary.pendingClaims > 0) {
      insights.push({
        icon: <Gavel sx={{ fontSize: 18 }} />,
        label: `${summary.pendingClaims} תביעות ביטוח פתוחות`,
        color: '#8b5cf6',
        bgcolor: 'rgba(139, 92, 246, 0.1)',
      });
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const paperSx = {
    p: 3,
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
  };

  const hebrewLabels = {
    // Vehicle types
    motorcycle: 'אופנוע',
    scooter: 'קטנוע',
    // Vehicle statuses
    active: 'פעיל',
    inactive: 'לא פעיל',
    waiting_for_rider: 'ממתין לרוכב',
    faulty: 'תקול',
    unfit: 'לא כשיר',
    // Fault severity
    critical: 'קריטית',
    high: 'גבוהה',
    medium: 'בינונית',
    low: 'נמוכה',
    // Fault/task statuses
    open: 'פתוחה',
    in_progress: 'בטיפול',
    completed: 'הושלם',
    closed: 'סגור',
    cancelled: 'בוטל',
    pending: 'ממתין',
    // Task priorities
    urgent: 'דחופה',
    normal: 'רגילה',
    // Maintenance types
    preventive: 'מונע',
    corrective: 'מתקן',
    annual_test: 'טסט שנתי',
    other: 'אחר',
    // Insurance
    draft: 'טיוטה',
    submitted: 'הוגש',
    under_review: 'בבדיקה',
    approved: 'אושר',
    rejected: 'נדחה',
    accident: 'תאונה',
    theft: 'גניבה',
    vandalism: 'ונדליזם',
    natural_disaster: 'אסון טבע',
    unknown: 'לא ידוע',
  };

  const translateData = (data) => {
    if (!data) return [];
    return data.map(item => ({
      ...item,
      name: hebrewLabels[item.name] || item.name,
    }));
  };

  // Charts based on report type
  const renderCharts = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress />
        </Box>
      );
    }

    switch (reportType) {
      case 'vehicles':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  כלים לפי סוג
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(vehiclesData?.byType)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(vehiclesData?.byType || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  סטטוס כלים
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translateData(vehiclesData?.byStatus)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" name="כלים" radius={[4, 4, 0, 0]}>
                      {(vehiclesData?.byStatus || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'faults':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  תקלות לפי חומרה
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(faultsData?.bySeverity)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(faultsData?.bySeverity || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  תקלות לפי סטטוס
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translateData(faultsData?.byStatus)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" name="תקלות" radius={[4, 4, 0, 0]}>
                      {(faultsData?.byStatus || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'tasks':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  משימות לפי סטטוס
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(tasksData?.byStatus)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(tasksData?.byStatus || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  משימות לפי עדיפות
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translateData(tasksData?.byPriority)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" name="משימות" radius={[4, 4, 0, 0]}>
                      {(tasksData?.byPriority || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'maintenance':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  טיפולים לפי סוג
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(maintenanceData?.byType)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(maintenanceData?.byType || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  עלויות לפי חודש
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={maintenanceData?.costByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} formatter={(value) => `${value.toLocaleString()} \u20AA`} />
                    <Bar dataKey="cost" name="עלות" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            {maintenanceData?.totalCost > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ ...paperSx, textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>עלות טיפולים כוללת</Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#6366f1' }}>
                    {maintenanceData.totalCost.toLocaleString()} {'\u20AA'}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        );

      case 'insurance':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  תביעות לפי סטטוס
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(insuranceData?.byStatus)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(insuranceData?.byStatus || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  תביעות לפי סוג אירוע
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translateData(insuranceData?.byEventType)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" name="תביעות" radius={[4, 4, 0, 0]}>
                      {(insuranceData?.byEventType || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  סיכום סכומים
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <Grid container spacing={2}>
                  {[
                    { label: 'סה"כ נתבע', value: insuranceData?.totalClaimAmount || 0, color: '#6366f1' },
                    { label: 'סה"כ אושר', value: insuranceData?.totalApprovedAmount || 0, color: '#10b981' },
                    { label: 'סה"כ שולם', value: insuranceData?.totalPaidAmount || 0, color: '#f59e0b' },
                  ].map((item, i) => (
                    <Grid item xs={12} sm={4} key={i}>
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>{item.label}</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: item.color }}>
                          {item.value.toLocaleString()} {'\u20AA'}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        );

      // summary (default)
      default:
        return (
          <Grid container spacing={3}>
            {/* Monthly Trends */}
            <Grid item xs={12} lg={8}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  מגמות חודשיות
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="tasks" stroke="#6366f1" strokeWidth={2} name="משימות" dot={{ fill: '#6366f1' }} />
                    <Line type="monotone" dataKey="faults" stroke="#ef4444" strokeWidth={2} name="תקלות" dot={{ fill: '#ef4444' }} />
                    <Line type="monotone" dataKey="checks" stroke="#10b981" strokeWidth={2} name="בקרות" dot={{ fill: '#10b981' }} />
                    <Line type="monotone" dataKey="maintenance" stroke="#f59e0b" strokeWidth={2} name="טיפולים" dot={{ fill: '#f59e0b' }} />
                    <Line type="monotone" dataKey="claims" stroke="#8b5cf6" strokeWidth={2} name="תביעות" dot={{ fill: '#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Vehicle Types */}
            <Grid item xs={12} sm={6} lg={4}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  כלים לפי סוג
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(vehiclesData?.byType)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(vehiclesData?.byType || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Vehicle Status */}
            <Grid item xs={12} sm={6} lg={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  סטטוס כלים
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translateData(vehiclesData?.byStatus)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" name="כלים" radius={[4, 4, 0, 0]}>
                      {(vehiclesData?.byStatus || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Faults by Severity */}
            <Grid item xs={12} sm={6} lg={6}>
              <Paper sx={paperSx}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  תקלות לפי חומרה
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={translateData(faultsData?.bySeverity)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(faultsData?.bySeverity || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        mb: 4,
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            }}
          >
            <AssessmentIcon sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ color: '#1e293b' }}>
              דוחות וסטטיסטיקות
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              צפה בסטטיסטיקות ונתונים על הצי
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: '#64748b',
              color: '#64748b',
              '&:hover': {
                borderColor: '#475569',
                bgcolor: 'rgba(100, 116, 139, 0.04)',
              },
            }}
          >
            הדפסה
          </Button>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ ...paperSx, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FilterList sx={{ color: '#6366f1', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>סינון</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>סוג דוח</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="סוג דוח"
                sx={{
                  borderRadius: '12px',
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', borderWidth: 2 },
                }}
              >
                <MenuItem value="summary">סיכום כללי</MenuItem>
                <MenuItem value="vehicles">כלים</MenuItem>
                <MenuItem value="faults">תקלות</MenuItem>
                <MenuItem value="tasks">משימות</MenuItem>
                <MenuItem value="maintenance">תחזוקה</MenuItem>
                <MenuItem value="insurance">תביעות ביטוח</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards - show on summary view */}
      {reportType === 'summary' && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {loading ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : (
            summaryStats.map((stat, index) => (
              <Grid item xs={6} sm={4} md={2} key={index}>
                <Card
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2.5, px: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        bgcolor: stat.bgcolor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1.5,
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      {stat.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Charts */}
      {renderCharts()}

      {/* Quick Insights - show on summary view */}
      {reportType === 'summary' && !loading && insights.length > 0 && (
        <Paper sx={{ ...paperSx, mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
            תובנות מהירות
          </Typography>
          <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
              {insights.map((insight, i) => (
                <Chip
                  key={i}
                  icon={insight.icon}
                  label={insight.label}
                  sx={{
                    bgcolor: insight.bgcolor,
                    color: insight.color,
                    fontWeight: 500,
                    borderRadius: '10px',
                    py: 2,
                    '& .MuiChip-icon': { color: insight.color },
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" sx={{ mt: 2, color: '#94a3b8' }}>
              * הנתונים מתעדכנים בזמן אמת ומבוססים על הנתונים בפועל
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
