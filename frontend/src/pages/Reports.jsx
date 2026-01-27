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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [reportType, setReportType] = useState('summary');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const summaryStats = [
    { title: 'סה"כ כלים', value: 156, icon: <TwoWheeler sx={{ fontSize: 24 }} />, color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.1)' },
    { title: 'כלים פעילים', value: 142, icon: <TwoWheeler sx={{ fontSize: 24 }} />, color: '#059669', bgcolor: 'rgba(16, 185, 129, 0.1)' },
    { title: 'סה"כ רוכבים', value: 145, icon: <Person sx={{ fontSize: 24 }} />, color: '#0891b2', bgcolor: 'rgba(6, 182, 212, 0.1)' },
    { title: 'תקלות פתוחות', value: 12, icon: <Warning sx={{ fontSize: 24 }} />, color: '#dc2626', bgcolor: 'rgba(239, 68, 68, 0.1)' },
    { title: 'משימות פעילות', value: 34, icon: <Assignment sx={{ fontSize: 24 }} />, color: '#d97706', bgcolor: 'rgba(245, 158, 11, 0.1)' },
    { title: 'בקרות חודש זה', value: 89, icon: <Assignment sx={{ fontSize: 24 }} />, color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' },
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
  };

  const handlePrint = () => {
    window.print();
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
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
            startIcon={<Download />}
            onClick={() => handleExport('excel')}
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': {
                borderColor: '#4f46e5',
                bgcolor: 'rgba(99, 102, 241, 0.04)',
              },
            }}
          >
            ייצוא Excel
          </Button>
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

      {/* Filters */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
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
              sx={textFieldSx}
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
              sx={textFieldSx}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryStats.map((stat, index) => (
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
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Trends */}
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
              מגמות חודשיות
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
                <YAxis tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="tasks" stroke="#6366f1" strokeWidth={2} name="משימות" dot={{ fill: '#6366f1' }} />
                <Line type="monotone" dataKey="faults" stroke="#ef4444" strokeWidth={2} name="תקלות" dot={{ fill: '#ef4444' }} />
                <Line type="monotone" dataKey="checks" stroke="#10b981" strokeWidth={2} name="בקרות" dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Vehicle Types */}
        <Grid item xs={12} sm={6} lg={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
              כלים לפי סוג
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Vehicle Status */}
        <Grid item xs={12} sm={6} lg={6}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
              סטטוס כלים
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehiclesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                <YAxis tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
              תקלות לפי חומרה
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Quick Insights */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
              תובנות מהירות
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AssessmentIcon sx={{ fontSize: 18 }} />}
                  label="91% מהכלים בסטטוס פעיל"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    fontWeight: 500,
                    borderRadius: '10px',
                    py: 2,
                    '& .MuiChip-icon': { color: '#059669' },
                  }}
                />
                <Chip
                  icon={<Warning sx={{ fontSize: 18 }} />}
                  label="12 תקלות ממתינות לטיפול"
                  sx={{
                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                    fontWeight: 500,
                    borderRadius: '10px',
                    py: 2,
                    '& .MuiChip-icon': { color: '#dc2626' },
                  }}
                />
                <Chip
                  icon={<Assignment sx={{ fontSize: 18 }} />}
                  label="89 בקרות חודשיות בוצעו החודש"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    fontWeight: 500,
                    borderRadius: '10px',
                    py: 2,
                    '& .MuiChip-icon': { color: '#6366f1' },
                  }}
                />
                <Chip
                  icon={<TwoWheeler sx={{ fontSize: 18 }} />}
                  label="8 כלים ממתינים להקצאת רוכב"
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    color: '#d97706',
                    fontWeight: 500,
                    borderRadius: '10px',
                    py: 2,
                    '& .MuiChip-icon': { color: '#d97706' },
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ mt: 2, color: '#94a3b8' }}>
                * הנתונים מתעדכנים בזמן אמת ומבוססים על הטווח הנבחר
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
