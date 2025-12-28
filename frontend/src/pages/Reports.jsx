import { useState } from 'react';
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
  TextField,
  useMediaQuery,
  useTheme,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TwoWheeler,
  Person,
  Warning,
  Assignment,
  Download,
  Print,
  FilterList,
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Reports() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [reportType, setReportType] = useState('summary');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Sample data - in real app, this would come from API
  const summaryStats = [
    { title: 'סה"כ כלים', value: 156, icon: <TwoWheeler />, color: 'primary' },
    { title: 'כלים פעילים', value: 142, icon: <TwoWheeler />, color: 'success' },
    { title: 'סה"כ רוכבים', value: 145, icon: <Person />, color: 'info' },
    { title: 'תקלות פתוחות', value: 12, icon: <Warning />, color: 'error' },
    { title: 'משימות פעילות', value: 34, icon: <Assignment />, color: 'warning' },
    { title: 'בקרות חודש זה', value: 89, icon: <Assignment />, color: 'secondary' },
  ];

  const vehiclesByType = [
    { name: 'אופנועים', value: 95 },
    { name: 'קטנועים', value: 61 },
  ];

  const vehiclesByStatus = [
    { name: 'פעיל', value: 142 },
    { name: 'ממתין לרוכב', value: 8 },
    { name: 'תקול', value: 4 },
    { name: 'לא כשיר', value: 2 },
  ];

  const monthlyData = [
    { month: 'ינואר', tasks: 65, faults: 8, checks: 120 },
    { month: 'פברואר', tasks: 59, faults: 12, checks: 115 },
    { month: 'מרץ', tasks: 80, faults: 15, checks: 125 },
    { month: 'אפריל', tasks: 81, faults: 10, checks: 130 },
    { month: 'מאי', tasks: 56, faults: 7, checks: 128 },
    { month: 'יוני', tasks: 55, faults: 9, checks: 122 },
  ];

  const faultsBySeverity = [
    { name: 'קריטית', value: 3 },
    { name: 'גבוהה', value: 5 },
    { name: 'בינונית', value: 8 },
    { name: 'נמוכה', value: 12 },
  ];

  const handleExport = (format) => {
    console.log(`Exporting report as ${format}`);
    // Implementation for export
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          דוחות וסטטיסטיקות
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('excel')}
            size={isMobile ? 'medium' : 'large'}
          >
            ייצוא Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
            size={isMobile ? 'medium' : 'large'}
          >
            הדפסה
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList />
          <Typography variant="h6">סינון</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>סוג דוח</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="סוג דוח"
              >
                <MenuItem value="summary">סיכום כללי</MenuItem>
                <MenuItem value="vehicles">כלים</MenuItem>
                <MenuItem value="riders">רוכבים</MenuItem>
                <MenuItem value="faults">תקלות</MenuItem>
                <MenuItem value="tasks">משימות</MenuItem>
                <MenuItem value="maintenance">תחזוקה</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="מתאריך"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="עד תאריך"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryStats.map((stat, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: `${stat.color}.main`, mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" fontWeight="bold" color={`${stat.color}.main`}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Trends */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              מגמות חודשיות
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tasks" stroke="#8884d8" name="משימות" />
                <Line type="monotone" dataKey="faults" stroke="#FF8042" name="תקלות" />
                <Line type="monotone" dataKey="checks" stroke="#00C49F" name="בקרות" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Vehicle Types */}
        <Grid item xs={12} sm={6} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              כלים לפי סוג
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vehiclesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehiclesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Vehicle Status */}
        <Grid item xs={12} sm={6} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              סטטוס כלים
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehiclesByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {vehiclesByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Faults by Severity */}
        <Grid item xs={12} sm={6} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              תקלות לפי חומרה
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={faultsBySeverity}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {faultsBySeverity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Quick Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              תובנות מהירות
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AssessmentIcon />}
                  label="91% מהכלים בסטטוס פעיל"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<Warning />}
                  label="12 תקלות ממתינות לטיפול"
                  color="error"
                  variant="outlined"
                />
                <Chip
                  icon={<Assignment />}
                  label="89 בקרות חודשיות בוצעו החודש"
                  color="info"
                  variant="outlined"
                />
                <Chip
                  icon={<TwoWheeler />}
                  label="8 כלים ממתינים להקצאת רוכב"
                  color="warning"
                  variant="outlined"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                * הנתונים מתעדכנים בזמן אמת ומבוססים על הטווח הנבחר
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
