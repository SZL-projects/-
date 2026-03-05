require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const errorHandler = require('./middleware/errorHandler');

// אתחול Firebase
try {
  require('./config/firebase');
  console.log('✅ Firebase initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  // Don't exit in production (Vercel) - let the app start anyway
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

const app = express();

// אתחול Schedulers (רק אם לא ב-Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  const monthlyCheckScheduler = require('./schedulers/monthlyCheckScheduler');
  const dailyReminderScheduler = require('./schedulers/dailyReminderScheduler');
  const expiryReminderScheduler = require('./schedulers/expiryReminderScheduler');

  // הפעלת הטיימרים
  monthlyCheckScheduler.start();
  dailyReminderScheduler.start();
  expiryReminderScheduler.start();
}

// Middleware בסיסי
app.use(helmet()); // אבטחה

// CORS - רק origins מורשים
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // אפשר בקשות ללא origin (כמו Postman בפיתוח)
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
}));
app.use(compression()); // דחיסה
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));

// Logging (רק ב-development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes - Firebase version
app.use('/api/auth', require('./routes/auth-firebase'));
app.use('/api/riders', require('./routes/riders-firebase'));
app.use('/api/vehicles', require('./routes/vehicles-firebase'));
app.use('/api/tasks', require('./routes/tasks-firebase'));
app.use('/api/faults', require('./routes/faults-firebase'));
app.use('/api/monthly-checks', require('./routes/monthly-checks-firebase'));
app.use('/api/maintenance', require('./routes/maintenance-firebase'));
app.use('/api/garages', require('./routes/garages-firebase'));
app.use('/api/permissions', require('./routes/permissions-firebase'));
app.use('/api/search', require('./routes/search-firebase'));
app.use('/api/insurance-claims', require('./routes/insurance-claims-firebase'));
app.use('/api/reports', require('./routes/reports-firebase'));
app.use('/api/audit-logs', require('./routes/audit-log-firebase'));
app.use('/api/donations', require('./routes/donations-firebase'));
app.use('/api/notifications', require('./routes/notifications-firebase'));
app.use('/api/maintenance-types', require('./routes/maintenance-types-firebase'));

// נתיבים להרצה ידנית של משימות (למנהלי על בלבד - דורש אימות)
if (process.env.NODE_ENV !== 'production') {
  const { protect } = require('./middleware/auth-firebase');

  const requireSuperAdmin = (req, res, next) => {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    if (!userRoles.includes('super_admin')) {
      return res.status(403).json({ success: false, message: 'נדרשת הרשאת מנהל-על' });
    }
    next();
  };

  app.post('/api/admin/trigger-monthly-checks', protect, requireSuperAdmin, async (req, res) => {
    try {
      const monthlyCheckScheduler = require('./schedulers/monthlyCheckScheduler');
      await monthlyCheckScheduler.runNow();
      res.json({ success: true, message: 'בקרות חודשיות נפתחו בהצלחה' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/admin/trigger-daily-reminders', protect, requireSuperAdmin, async (req, res) => {
    try {
      const dailyReminderScheduler = require('./schedulers/dailyReminderScheduler');
      await dailyReminderScheduler.runNow();
      res.json({ success: true, message: 'תזכורות יומיות נשלחו בהצלחה' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/admin/trigger-expiry-reminders', protect, requireSuperAdmin, async (req, res) => {
    try {
      const expiryReminderScheduler = require('./schedulers/expiryReminderScheduler');
      await expiryReminderScheduler.runNow();
      res.json({ success: true, message: 'התראות תוקף ביטוח ורשיון נשלחו בהצלחה' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
}

// נתיב בדיקת בריאות
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running with Firebase',
    database: 'Firestore',
    timestamp: new Date().toISOString()
  });
});

// נתיב ראשי
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'מערכת CRM צי לוג ידידים - API (Firebase)',
    version: '3.13.0',
    database: 'Firebase Firestore',
    features: [
      'Firebase Firestore Database',
      'Firebase Storage for files',
      'JWT Authentication',
      'Role-based access control',
      'Real-time capabilities'
    ]
  });
});

// Error handler (חייב להיות אחרון)
app.use(errorHandler);

// Export for Vercel
module.exports = app;

// רק אם לא רצים ב-Vercel (local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   🏍️  מערכת CRM - צי לוג ידידים  🏍️              ║
║                                                   ║
║   🔥 Database: Firebase Firestore                ║
║   Server running in ${process.env.NODE_ENV || 'development'} mode             ║
║   Port: ${PORT}                                      ║
║   Time: ${new Date().toLocaleString('he-IL')}      ║
╚═══════════════════════════════════════════════════╝
    `);
  });

  // טיפול בסגירה נאותה
  process.on('unhandledRejection', (err) => {
    console.error(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}
