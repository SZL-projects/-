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

  // הפעלת הטיימרים
  monthlyCheckScheduler.start();
  dailyReminderScheduler.start();
}

// Middleware בסיסי
app.use(helmet()); // אבטחה
app.use(cors()); // CORS
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

// נתיבים להרצה ידנית של משימות (למנהלי על בלבד)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/admin/trigger-monthly-checks', async (req, res) => {
    try {
      const monthlyCheckScheduler = require('./schedulers/monthlyCheckScheduler');
      await monthlyCheckScheduler.runNow();
      res.json({
        success: true,
        message: 'בקרות חודשיות נפתחו בהצלחה'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  app.post('/api/admin/trigger-daily-reminders', async (req, res) => {
    try {
      const dailyReminderScheduler = require('./schedulers/dailyReminderScheduler');
      await dailyReminderScheduler.runNow();
      res.json({
        success: true,
        message: 'תזכורות יומיות נשלחו בהצלחה'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
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
