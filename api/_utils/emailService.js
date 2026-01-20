// Try different import methods for Vercel compatibility
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.error('Failed to require nodemailer:', e);
}

// יצירת transporter
const createTransporter = () => {
  const transportConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // הגדרות נוספות עבור Vercel Serverless
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
      ciphers: 'SSLv3'
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    dnsTimeout: 10000,
    // Try to use IPv4 first
    family: 4,
    logger: true, // Enable logging
    debug: process.env.NODE_ENV === 'development'
  };

  // Try direct require of nodemailer's createTransport
  try {
    const { createTransport } = require('nodemailer');
    if (typeof createTransport === 'function') {
      console.log('✅ Using createTransport from direct destructure');
      return createTransport(transportConfig);
    }
  } catch (e) {
    console.log('❌ Direct destructure failed:', e.message);
  }

  // Try nodemailer.createTransport (note: createTransport, not createTransporter)
  if (nodemailer && typeof nodemailer.createTransport === 'function') {
    console.log('✅ Using nodemailer.createTransport');
    return nodemailer.createTransport(transportConfig);
  }

  // Try nodemailer.default.createTransport
  if (nodemailer?.default && typeof nodemailer.default.createTransport === 'function') {
    console.log('✅ Using nodemailer.default.createTransport');
    return nodemailer.default.createTransport(transportConfig);
  }

  throw new Error('❌ Cannot find createTransport in nodemailer module. Available keys: ' + Object.keys(nodemailer || {}).join(', '));
};

// שליחת מייל כללי
exports.sendEmail = async (options) => {
  const transporter = createTransporter();

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// שליחת מייל לאיפוס סיסמה
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #1976d2;
          text-align: center;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
        }
        .button {
          display: inline-block;
          background-color: #1976d2;
          color: #ffffff !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ איפוס סיסמה - מערכת CRM צי לוג ידידים</h1>
        <p>שלום ${user.firstName} ${user.lastName},</p>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת.</p>
        <p>לאיפוס הסיסמה, לחץ על הכפתור הבא:</p>
        <center>
          <a href="${resetUrl}" class="button">אפס סיסמה</a>
        </center>
        <p><strong>שים לב:</strong> קישור זה יפוג בעוד 10 דקות.</p>
        <p>אם לא ביקשת איפוס סיסמה, התעלם ממייל זה.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} מערכת CRM צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'איפוס סיסמה - מערכת CRM צי לוג ידידים',
    html,
  });
};

// שליחת תזכורת בקרה חודשית לרוכב
exports.sendMonthlyCheckReminder = async ({ to, riderName, vehiclePlate, monthName, year, checkId }) => {
  // קישור ישיר לבקרה הספציפית
  const checkUrl = `${process.env.FRONTEND_URL}/monthly-check/${checkId}`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #ff9800;
          text-align: center;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
        }
        .info-box {
          background-color: #fff3e0;
          border-right: 4px solid #ff9800;
          padding: 15px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background-color: #ff9800;
          color: #ffffff !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ תזכורת: בקרה חודשית</h1>
        <p>שלום ${riderName},</p>
        <p>זוהי תזכורת למילוי הבקרה החודשית עבור הכלי שלך.</p>

        <div class="info-box">
          <strong>פרטי הבקרה:</strong><br/>
          חודש: ${monthName} ${year}<br/>
          מספר רישוי: ${vehiclePlate || 'לא צוין'}
        </div>

        <p>אנא היכנס למערכת ומלא את הבקרה בהקדם האפשרי.</p>

        <center>
          <a href="${checkUrl}" class="button">מלא בקרה חודשית</a>
        </center>

        <div class="footer">
          <p>© ${new Date().getFullYear()} מערכת CRM צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: to,
    subject: `תזכורת: בקרה חודשית לחודש ${monthName} ${year}`,
    html,
  });
};

// שליחת פרטי התחברות למשתמש
exports.sendLoginCredentials = async (user, temporaryPassword) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #1976d2;
          text-align: center;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
        }
        .credentials {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 10px 0;
          font-size: 16px;
        }
        .credential-label {
          font-weight: bold;
          color: #666;
        }
        .credential-value {
          color: #1976d2;
          font-size: 18px;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #1976d2;
          color: #ffffff !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .warning {
          background-color: #fff3cd;
          border-right: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ ברוך הבא למערכת CRM צי לוג ידידים</h1>
        <p>שלום ${user.firstName} ${user.lastName},</p>
        <p>נוצר עבורך חשבון במערכת CRM לניהול צי לוג ידידים.</p>

        <div class="credentials">
          <h3 style="margin-top: 0;">פרטי ההתחברות שלך:</h3>
          <div class="credential-item">
            <span class="credential-label">שם משתמש:</span><br/>
            <span class="credential-value">${user.username}</span>
          </div>
          <div class="credential-item">
            <span class="credential-label">סיסמה זמנית:</span><br/>
            <span class="credential-value">${temporaryPassword}</span>
          </div>
          <div class="credential-item">
            <span class="credential-label">כתובת המערכת:</span><br/>
            <a href="${loginUrl}" style="color: #1976d2;">${loginUrl}</a>
          </div>
        </div>

        <div class="warning">
          <strong>⚠️ חשוב:</strong> מומלץ לשנות את הסיסמה הזמנית לאחר ההתחברות הראשונה.
          תוכל לעשות זאת דרך תפריט הפרופיל במערכת.
        </div>

        <center>
          <a href="${loginUrl}" class="button">התחבר למערכת</a>
        </center>

        <div class="footer">
          <p>© ${new Date().getFullYear()} מערכת CRM צי לוג ידידים</p>
          <p>אם לא ביקשת הרשמה למערכת, אנא התעלם ממייל זה</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'פרטי התחברות למערכת CRM צי לוג ידידים',
    html,
  });
};
