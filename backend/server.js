require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// התחברות למסד הנתונים
connectDB();

const app = express();

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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/riders', require('./routes/riders'));
app.use('/api/vehicles', require('./routes/vehicles'));

// נתיב בדיקת בריאות
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// נתיב ראשי
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'מערכת CRM לניהול יחידת האופנועים - API',
    version: '3.13.0'
  });
});

// Error handler (חייב להיות אחרון)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   🏍️  מערכת CRM - יחידת האופנועים  🏍️           ║
║                                                   ║
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

module.exports = app;
