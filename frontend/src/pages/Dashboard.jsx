import { useState, useEffect, useMemo } from 'react';
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
  WhatsApp,
} from '@mui/icons-material';
import api, { ridersAPI, vehiclesAPI, tasksAPI, faultsAPI } from '../services/api';
import { toHebrewDate } from '../utils/hebrewDate';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// המרת מספר לגמטריה עברית
const toHebrewNumeral = (num) => {
  const letters = [
    [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
    [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
    [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
    [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'],
    [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א'],
  ];
  if (num === 15) return 'ט"ו';
  if (num === 16) return 'ט"ז';
  let result = '';
  let remaining = num;
  for (const [value, letter] of letters) {
    while (remaining >= value) { result += letter; remaining -= value; }
  }
  if (result.length === 1) return result + '\u05F3';
  return result.slice(0, -1) + '\u05F4' + result.slice(-1);
};

// עיצוב תאריך עברי באותיות (ו׳ אדר תשפ"ו)
const formatHebrewDate = (date) => {
  const { year, day, monthName } = toHebrewDate(date);
  return `${toHebrewNumeral(day)} ${monthName} ${toHebrewNumeral(year % 1000)}`;
};

// פונקציה להמרת תאריך לזמן יחסי (לפני שעה, לפני יום וכו')
const formatTimeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours === 1 ? 'שעה' : diffHours + ' שעות'}`;
  if (diffDays < 7) return `לפני ${diffDays === 1 ? 'יום' : diffDays + ' ימים'}`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  return date.toLocaleDateString('he-IL');
};

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasRole, user } = useAuth();

  // רוכבים עוברים אוטומטית לדף "הכלי שלי"
  useEffect(() => {
    if (user) {
      // בדיקה אם למשתמש יש רק תפקיד רוכב (ללא תפקידים ניהוליים)
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isOnlyRider = userRoles.length === 1 && userRoles[0] === 'rider';

      if (isOnlyRider) {
        navigate('/my-vehicle', { replace: true });
      }
    }
  }, [user, navigate]);

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
    expiringLicense: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [criticalFaultsList, setCriticalFaultsList] = useState([]);
  const [vehicleStatusData, setVehicleStatusData] = useState([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState([]);
  const [expiringLicenseVehicles, setExpiringLicenseVehicles] = useState([]);
  const [expiringInsuranceVehicles, setExpiringInsuranceVehicles] = useState([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // סנכרון שעה עם השרת (פעם אחת)
  useEffect(() => {
    api.get('/reports/server-time').then(res => {
      if (res.data?.timestamp) {
        setServerOffset(res.data.timestamp - Date.now());
      }
    }).catch(() => {});
  }, []);

  // עדיכון שעה כל שניה לפי offset של השרת
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverOffset));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffset]);

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

      // אופטימיזציה: חישובים בלולאה אחת במקום filter מרובים
      const now = new Date();
      const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // חישוב כל הסטטיסטיקות במעבר אחד
      let activeRiders = 0;
      let activeVehicles = 0;
      let vehiclesWaitingForRider = 0;
      let expiringInsurance = 0;
      let expiringLicense = 0;
      let pendingTasks = 0;
      let openFaults = 0;
      const criticalFaults = [];
      const licenseExpiringList = [];
      const insuranceExpiringList = [];

      // מפת רוכבים לפי הכלי המשויך (הקשר נשמר על הרוכב)
      const riderByVehicleMap = {};
      riders.forEach(r => {
        if (r.assignedVehicleId) riderByVehicleMap[r.assignedVehicleId] = r;
      });

      // ספירת סטטוסי כלים לגרף
      const vehicleStatusCounts = {
        active: 0,
        waiting_for_rider: 0,
        in_maintenance: 0,
        inactive: 0,
        other: 0
      };

      riders.forEach(r => {
        // המודל משתמש ב-riderStatus
        if (r.riderStatus === 'active') activeRiders++;
      });

      vehicles.forEach(v => {
        // ספירה לפי סטטוס
        if (v.status === 'active') {
          activeVehicles++;
          vehicleStatusCounts.active++;
        } else if (v.status === 'waiting_for_rider' || v.status === 'available') {
          vehiclesWaitingForRider++;
          vehicleStatusCounts.waiting_for_rider++;
        } else if (v.status === 'in_maintenance') {
          vehicleStatusCounts.in_maintenance++;
        } else if (v.status === 'inactive') {
          vehicleStatusCounts.inactive++;
        } else {
          vehicleStatusCounts.other++;
        }

        // בדיקת ביטוח - 14 יום
        const mandatoryExpiry = v.insurance?.mandatory?.expiryDate;

        const rider = riderByVehicleMap[v.id];
        const riderName = rider ? `${rider.firstName || ''} ${rider.lastName || ''}`.trim() : '';
        const vehicleModel = [v.manufacturer, v.model].filter(Boolean).join(' ');

        const mandatoryDate = mandatoryExpiry ? (mandatoryExpiry.toDate ? mandatoryExpiry.toDate() : new Date(mandatoryExpiry)) : null;
        const mandatoryExpiring = mandatoryDate && mandatoryDate >= now && mandatoryDate <= fourteenDaysFromNow;

        if (mandatoryExpiring) {
          expiringInsurance++;
          const expiryDate = mandatoryDate;
          insuranceExpiringList.push({
            id: v.id,
            licensePlate: v.licensePlate,
            internalNumber: v.internalNumber,
            expiryDate,
            riderName,
          });
        }

        // בדיקת רשיון רכב - 30 יום
        const licenseExpiry = v.vehicleLicense?.expiryDate;
        if (licenseExpiry) {
          const expiryDate = licenseExpiry.toDate ? licenseExpiry.toDate() : new Date(licenseExpiry);
          if (expiryDate >= now && expiryDate <= thirtyDaysFromNow) {
            expiringLicense++;
            licenseExpiringList.push({
              id: v.id,
              licensePlate: v.licensePlate,
              internalNumber: v.internalNumber,
              vehicleModel,
              expiryDate,
              riderName,
              riderIdNumber: rider?.idNumber || '',
            });
          }
        }
      });

      tasks.forEach(t => {
        if (t.status === 'pending' || t.status === 'in_progress') pendingTasks++;
      });

      faults.forEach(f => {
        if (f.status === 'open' || f.status === 'in_progress') {
          openFaults++;
          // תקלות קריטיות = critical או high או canRide=false
          if (f.severity === 'critical' || f.severity === 'high' || f.canRide === false) {
            criticalFaults.push(f);
          }
        }
      });

      setStats({
        totalRiders: riders.length,
        activeRiders,
        totalVehicles: vehicles.length,
        activeVehicles,
        vehiclesWaitingForRider,
        pendingTasks,
        openFaults,
        criticalFaults: criticalFaults.length,
        ridersWithoutMonthlyCheck: 0, // TODO: יצטרך חישוב מול API בקרה חודשית
        expiringInsurance,
        expiringLicense,
      });

      setCriticalFaultsList(criticalFaults.slice(0, 5));
      setExpiringLicenseVehicles(licenseExpiringList);
      setExpiringInsuranceVehicles(insuranceExpiringList);

      // נתונים אמיתיים לגרף סטטוס כלים
      setVehicleStatusData([
        { name: 'פעיל', value: vehicleStatusCounts.active },
        { name: 'ממתין לרוכב', value: vehicleStatusCounts.waiting_for_rider },
        { name: 'בתחזוקה', value: vehicleStatusCounts.in_maintenance },
        { name: 'לא פעיל', value: vehicleStatusCounts.inactive },
        ...(vehicleStatusCounts.other > 0 ? [{ name: 'אחר', value: vehicleStatusCounts.other }] : [])
      ].filter(item => item.value > 0));

      // חישוב מגמות חודשיות אמיתיות מהתקלות והמשימות
      const monthlyStats = {};
      const now6MonthsAgo = new Date();
      now6MonthsAgo.setMonth(now6MonthsAgo.getMonth() - 5);

      // אתחול 6 חודשים אחרונים
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        monthlyStats[monthKey] = { month: monthNames[date.getMonth()], משימות: 0, תקלות: 0 };
      }

      // ספירת משימות לפי חודש
      tasks.forEach(t => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        if (createdAt >= now6MonthsAgo) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].משימות++;
          }
        }
      });

      // ספירת תקלות לפי חודש
      faults.forEach(f => {
        const reportedDate = f.reportedDate?.toDate ? f.reportedDate.toDate() :
                            f.createdAt?.toDate ? f.createdAt.toDate() : new Date(f.reportedDate || f.createdAt);
        if (reportedDate >= now6MonthsAgo) {
          const monthKey = `${reportedDate.getFullYear()}-${String(reportedDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].תקלות++;
          }
        }
      });

      setMonthlyTrendData(Object.values(monthlyStats));

      // פעילות אחרונה - נתונים אמיתיים מהמערכת
      const allActivities = [];

      // פונקציה לפרסור תאריך מ-Firestore או מחרוזת
      const parseDate = (timestamp) => {
        if (!timestamp) return null;
        if (timestamp.toDate) return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        const d = new Date(timestamp);
        return isNaN(d.getTime()) ? null : d;
      };

      // הוספת כל הכלים
      vehicles.forEach(v => {
        const createdAt = parseDate(v.createdAt);
        if (createdAt) {
          allActivities.push({
            id: `vehicle-${v.id}`,
            type: 'vehicle',
            text: `כלי ${v.licensePlate || v.internalNumber || 'חדש'} נוסף למערכת`,
            date: createdAt,
          });
        }
      });

      // הוספת כל הרוכבים
      riders.forEach(r => {
        const createdAt = parseDate(r.createdAt);
        if (createdAt) {
          allActivities.push({
            id: `rider-${r.id}`,
            type: 'rider',
            text: `רוכב ${r.firstName || ''} ${r.lastName || ''} נרשם`.trim(),
            date: createdAt,
          });
        }
      });

      // הוספת כל המשימות
      tasks.forEach(t => {
        const createdAt = parseDate(t.createdAt);
        if (createdAt) {
          allActivities.push({
            id: `task-${t.id}`,
            type: 'task',
            text: `משימה: ${t.title || t.description?.substring(0, 30) || 'משימה חדשה'}`,
            date: createdAt,
          });
        }
      });

      // הוספת כל התקלות
      faults.forEach(f => {
        const reportedDate = parseDate(f.reportedDate) || parseDate(f.createdAt);
        if (reportedDate) {
          allActivities.push({
            id: `fault-${f.id}`,
            type: 'fault',
            text: `תקלה: ${f.title || f.description?.substring(0, 30) || 'תקלה חדשה'}`,
            date: reportedDate,
          });
        }
      });

      // מיון לפי תאריך (החדש ביותר קודם) ולקיחת 10 האחרונים
      allActivities.sort((a, b) => b.date - a.date);
      const recentActivitiesWithTime = allActivities.slice(0, 10).map(activity => ({
        ...activity,
        time: formatTimeAgo(activity.date),
      }));

      setRecentActivity(recentActivitiesWithTime);

      // Alerts - משתמש בערכים שכבר חישבנו
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
          message: `📋 ${expiringInsurance} ביטוחים שפוקעים ב-14 הימים הקרובים`,
          action: 'vehicles?filter=expiringInsurance'
        });
      }
      if (expiringLicense > 0) {
        newAlerts.push({
          severity: 'warning',
          message: `🚗 ${expiringLicense} רשיונות רכב שפוקעים ב-30 הימים הקרובים`,
          action: 'vehicles?filter=expiringLicense'
        });
      }
      if (vehiclesWaitingForRider > 0) {
        newAlerts.push({
          severity: 'info',
          message: `🏍️ ${vehiclesWaitingForRider} כלים זמינים ללא רוכב משויך`,
          action: 'vehicles'
        });
      }
      if (pendingTasks > 5) {
        newAlerts.push({
          severity: 'info',
          message: `✅ ${pendingTasks} משימות ממתינות לביצוע`,
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

  const StatCard = ({ title, value, icon: Icon, color, trend, onClick }) => (
    <Card onClick={onClick} sx={{
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      border: 'none',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.15s, box-shadow 0.15s',
      ...(onClick && { '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }),
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%',
        height: '4px',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      },
    }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: '#64748b', fontWeight: 500, fontSize: '0.85rem', mb: 1 }}>
              {title}
            </Typography>
            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              component="div"
              sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1 }}
            >
              {loading ? <CircularProgress size={30} /> : value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  px: 1,
                  py: 0.5,
                  borderRadius: '6px',
                }}>
                  <TrendingUp sx={{ fontSize: 14, color: '#10b981', mr: 0.5 }} />
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                    {trend}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          <Box sx={{
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${color}15, ${color}25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: { xs: 24, sm: 28 }, color }} />
          </Box>
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
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header with Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              mb: 0.5,
            }}
          >
            דשבורד ראשי
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {formatHebrewDate(currentTime)}
            {' | '}
            {new Intl.DateTimeFormat('he-IL', {
              timeZone: 'Asia/Jerusalem',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(currentTime)}
            {' | '}
            {new Intl.DateTimeFormat('he-IL', {
              timeZone: 'Asia/Jerusalem',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).format(currentTime)}
          </Typography>
        </Box>
        <MuiTooltip title="רענן נתונים">
          <IconButton
            onClick={loadDashboardData}
            disabled={loading}
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)', transform: 'rotate(180deg)' },
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Refresh sx={{ color: '#6366f1' }} />
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
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="סה''כ רוכבים"
            value={stats.totalRiders}
            icon={Person}
            color="#6366f1"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="רוכבים פעילים"
            value={stats.activeRiders}
            icon={CheckCircle}
            color="#10b981"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="סה''כ כלים"
            value={stats.totalVehicles}
            icon={TwoWheeler}
            color="#f59e0b"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="כלים פעילים"
            value={stats.activeVehicles}
            icon={Speed}
            color="#3b82f6"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="כלים ללא רוכב"
            value={stats.vehiclesWaitingForRider}
            icon={TwoWheeler}
            color="#64748b"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="תקלות פתוחות"
            value={stats.openFaults}
            icon={Warning}
            color="#f59e0b"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="תקלות קריטיות"
            value={stats.criticalFaults}
            icon={ErrorOutline}
            color="#ef4444"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3}>
          <StatCard
            title="משימות פתוחות"
            value={stats.pendingTasks}
            icon={Assignment}
            color="#8b5cf6"
          />
        </Grid>

        {stats.expiringInsurance > 0 && (
          <Grid item xs={6} sm={6} md={4} lg={3}>
            <StatCard
              title="ביטוחים שפוקעים (14 יום)"
              value={stats.expiringInsurance}
              icon={EventAvailable}
              color="#ec4899"
              onClick={() => navigate('/vehicles?filter=expiringInsurance')}
            />
          </Grid>
        )}

        {stats.expiringLicense > 0 && (
          <Grid item xs={6} sm={6} md={4} lg={3}>
            <StatCard
              title="רשיונות רכב שפוקעים (30 יום)"
              value={stats.expiringLicense}
              icon={EventAvailable}
              color="#f97316"
              onClick={() => navigate('/vehicles?filter=expiringLicense')}
            />
          </Grid>
        )}
      </Grid>

      {/* סיכום ביטוחים שפוקעים - כמו תבנית המייל */}
      {expiringInsuranceVehicles.length > 0 && (
        <Paper sx={{ mb: 4, borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            px: 3, py: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                📋 התראת ביטוח
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', mt: 0.5 }}>
                {expiringInsuranceVehicles.length} ביטוחים שפוקעים בתוך 14 יום הקרובים
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<WhatsApp />}
                onClick={() => {
                  const lines = expiringInsuranceVehicles.map((v, i) =>
                    `${i + 1}. *רוכב:* ${v.riderName || 'לא משויך'}` +
                    `\n   *מספר רכב:* ${v.licensePlate || v.internalNumber || 'לא ידוע'}` +
                    `\n   *תוקף ביטוח:* ${v.expiryDate.toLocaleDateString('he-IL')}`
                  ).join('\n\n');
                  const text = `📋 *התראת ביטוח*\n${expiringInsuranceVehicles.length} כלים שביטוחם פוקע בתוך 14 יום:\n\n${lines}\n\nאנא טפל בחידוש הביטוחים בהקדם האפשרי.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                שלח בוואטסאפ
              </Button>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/vehicles?filter=expiringInsurance')}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                לרשימה המלאה
              </Button>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {expiringInsuranceVehicles.map((v) => (
                <Grid item xs={12} sm={6} md={4} key={v.id}>
                  <Box sx={{
                    border: '1px solid #e2e8f0',
                    borderRight: '4px solid #f59e0b',
                    borderRadius: '8px',
                    p: 2,
                    bgcolor: '#fff',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#fffbf0' },
                  }}
                    onClick={() => navigate('/vehicles?filter=expiringInsurance')}
                  >
                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>שם הרוכב</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>{v.riderName || 'לא משויך'}</Typography>

                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>מספר רכב</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>{v.licensePlate || v.internalNumber || 'לא ידוע'}</Typography>

                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>תוקף ביטוח</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#dc2626' }}>
                      {v.expiryDate.toLocaleDateString('he-IL')}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Typography sx={{ mt: 2, color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
              אנא טפל בחידוש הביטוחים בהקדם האפשרי.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* סיכום רשיונות שפוקעים - כמו תבנית המייל */}
      {expiringLicenseVehicles.length > 0 && (
        <Paper sx={{ mb: 4, borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {/* כותרת */}
          <Box sx={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            px: 3, py: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                🚗 התראת טסט / רשיון רכב
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', mt: 0.5 }}>
                {expiringLicenseVehicles.length} כלים שרשיונם פוקע בתוך 30 יום הקרובים
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<WhatsApp />}
                onClick={() => {
                  const lines = expiringLicenseVehicles.map((v, i) =>
                    `${i + 1}. *מספר רכב:* ${v.licensePlate || v.internalNumber || 'לא ידוע'}` +
                    `\n   *רוכב:* ${v.riderName || 'לא משויך'}` +
                    (v.riderIdNumber ? `\n   *ת"ז:* ${v.riderIdNumber}` : '') +
                    `\n   *פוקע:* ${v.expiryDate.toLocaleDateString('he-IL')}`
                  ).join('\n\n');
                  const text = `🚗 *התראת טסט / רשיון רכב*\n${expiringLicenseVehicles.length} כלים שרשיונם פוקע בתוך 30 יום:\n\n${lines}\n\nאנא דאג לחידוש בהקדם האפשרי.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                שלח בוואטסאפ
              </Button>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/vehicles?filter=expiringLicense')}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                לרשימה המלאה
              </Button>
            </Box>
          </Box>
          {/* כרטיסיות כלים */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {expiringLicenseVehicles.map((v) => (
                <Grid item xs={12} sm={6} md={4} key={v.id}>
                  <Box sx={{
                    border: '1px solid #e2e8f0',
                    borderRight: '4px solid #3b82f6',
                    borderRadius: '8px',
                    p: 2,
                    bgcolor: '#fff',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8faff' },
                  }}
                    onClick={() => navigate('/vehicles?filter=expiringLicense')}
                  >
                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>מספר רכב</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>{v.licensePlate || v.internalNumber || 'לא ידוע'}</Typography>

                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>שם הרוכב</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>{v.riderName || 'לא משויך'}</Typography>

                    {v.riderIdNumber && (
                      <>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>תעודת זהות</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>{v.riderIdNumber}</Typography>
                      </>
                    )}

                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', mb: 0.3 }}>תאריך תפוגת הרישיון</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#dc2626' }}>
                      {v.expiryDate.toLocaleDateString('he-IL')}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Typography sx={{ mt: 2, color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
              אנא דאג לחידוש הטסט / רשיון הרכב בהקדם האפשרי.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Charts and Activity */}
      <Grid container spacing={3}>
        {/* Monthly Trend */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
              מגמות חודשיות
            </Typography>
            <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
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
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
              סטטוס כלים
            </Typography>
            <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
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
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
              }}>
                <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                פעילות אחרונה
              </Typography>
            </Box>
            <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
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
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
              }}>
                <Speed sx={{ color: '#8b5cf6', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                פעולות מהירות
              </Typography>
            </Box>
            <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#6366f1',
                      boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)',
                      transform: 'translateY(-4px)',
                      '& .action-icon': { transform: 'scale(1.1)' },
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                  onClick={() => navigate('/vehicles')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 1.5,
                    }}>
                      <TwoWheeler className="action-icon" sx={{ fontSize: 28, color: '#6366f1', transition: 'transform 0.3s' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      ניהול כלים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#10b981',
                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)',
                      transform: 'translateY(-4px)',
                      '& .action-icon': { transform: 'scale(1.1)' },
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                  onClick={() => navigate('/riders')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 1.5,
                    }}>
                      <Person className="action-icon" sx={{ fontSize: 28, color: '#10b981', transition: 'transform 0.3s' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      ניהול רוכבים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#f59e0b',
                      boxShadow: '0 8px 25px rgba(245, 158, 11, 0.15)',
                      transform: 'translateY(-4px)',
                      '& .action-icon': { transform: 'scale(1.1)' },
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                  onClick={() => navigate('/tasks')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      bgcolor: 'rgba(245, 158, 11, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 1.5,
                    }}>
                      <Assignment className="action-icon" sx={{ fontSize: 28, color: '#f59e0b', transition: 'transform 0.3s' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      משימות
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={6} lg={3}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)',
                      transform: 'translateY(-4px)',
                      '& .action-icon': { transform: 'scale(1.1)' },
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                  onClick={() => navigate('/monthly-checks')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 1.5,
                    }}>
                      <Build className="action-icon" sx={{ fontSize: 28, color: '#3b82f6', transition: 'transform 0.3s' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
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
