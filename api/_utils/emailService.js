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
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    family: 4,
    logger: true,
    debug: true
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

// שליחת התראה למנהל על בעיות בבקרה חודשית
exports.sendCheckIssuesAlert = async ({ managerEmail, riderName, vehiclePlate, issues, checkId }) => {
  const checkUrl = `${process.env.FRONTEND_URL}/monthly-checks`;

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
          color: #f44336;
          text-align: center;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
        }
        .alert-box {
          background-color: #ffebee;
          border-right: 4px solid #f44336;
          padding: 15px;
          margin: 20px 0;
        }
        .issues-list {
          background-color: #fff3e0;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .issue-item {
          padding: 5px 0;
          border-bottom: 1px solid #ffe0b2;
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
        <h1>⚠️ התראה: בעיות בבקרה חודשית</h1>
        <p>שלום,</p>
        <p>התקבלה בקרה חודשית עם בעיות שדורשות טיפול:</p>

        <div class="alert-box">
          <strong>פרטי הבקרה:</strong><br/>
          רוכב: ${riderName}<br/>
          מספר רישוי: ${vehiclePlate || 'לא צוין'}
        </div>

        <div class="issues-list">
          <strong>בעיות שנמצאו:</strong>
          ${issues.map(issue => `<div class="issue-item">• ${issue}</div>`).join('')}
        </div>

        <p>אנא בדוק את הבקרה ונקוט פעולה בהתאם.</p>

        <center>
          <a href="${checkUrl}" class="button">צפה בבקרות</a>
        </center>

        <div class="footer">
          <p>© ${new Date().getFullYear()} מערכת CRM צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: managerEmail,
    subject: `⚠️ התראה: בעיות בבקרה חודשית - ${riderName}`,
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

// שליחת התראה על ביטוחים שפוקעים בעוד 14 יום
exports.buildInsuranceEmailHtml = (insuranceItems) => {
  const today = new Date().toLocaleDateString('he-IL');
  const expiryDateStr = new Date(insuranceItems[0].expiryDate).toLocaleDateString('he-IL');

  const rowsHtml = insuranceItems.map((item, i) => `
    <div style="background:#fff; border:1px solid #e2e8f0; border-right:4px solid #f59e0b; border-radius:8px; padding:12px 16px; margin-bottom:10px; text-align:right; direction:rtl;">
      <span style="color:#f59e0b; font-weight:bold; font-size:15px;">${i + 1}.</span>
      <strong style="font-size:15px; color:#1f2937;"> ${item.riderName}</strong>
      <span style="color:#6b7280; font-size:14px;"> | ${item.licensePlate} | ${item.vehicleModel || ''} | תוקף: <strong style="color:#dc2626;">${new Date(item.expiryDate).toLocaleDateString('he-IL')}</strong></span>
    </div>
  `).join('');

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right; }
      .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
      .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 30px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
      .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
      .body { padding: 24px 30px; }
      .footer { padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>📋 התראת ביטוח</h1>
        <p>${insuranceItems.length} כלים שביטוחם פוקע בתאריך ${expiryDateStr} (עוד 14 יום)</p>
      </div>
      <div class="body">${rowsHtml}
        <p style="margin-top:20px; color:#64748b; font-size:14px; text-align:center;">אנא טפל בחידוש הביטוחים בהקדם האפשרי.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} צי לוג ידידים | תאריך שליחה: ${today}</p>
        <p>התראה זו נשלחת אוטומטית 14 יום לפני פקיעת הביטוח</p>
      </div>
    </div></body></html>`;
};

exports.sendInsuranceExpiryEmail = async (insuranceItems) => {
  if (!insuranceItems || insuranceItems.length === 0) return;
  const expiryDateStr = new Date(insuranceItems[0].expiryDate).toLocaleDateString('he-IL');
  const html = exports.buildInsuranceEmailHtml(insuranceItems);
  const systemEmail = process.env.FROM_EMAIL;
  if (systemEmail) {
    await exports.sendEmail({
      email: systemEmail,
      subject: `⚠️ התראת ביטוח: ${insuranceItems.length} כלים - פוקע ב-${expiryDateStr}`,
      html,
    });
  }
};

// שליחת התראה על רשיון רכב/טסט שפוקע בעוד 30 יום
exports.buildLicenseEmailHtml = (licenseItems) => {
  const today = new Date().toLocaleDateString('he-IL');
  const expiryDateStr = new Date(licenseItems[0].expiryDate).toLocaleDateString('he-IL');

  const rowsHtml = licenseItems.map((item, i) => `
    <div style="background:#fff; border:1px solid #e2e8f0; border-right:4px solid #3b82f6; border-radius:8px; padding:12px 16px; margin-bottom:10px; text-align:right; direction:rtl;">
      <span style="color:#3b82f6; font-weight:bold; font-size:15px;">${i + 1}.</span>
      <strong style="font-size:15px; color:#1f2937;"> ${item.riderName}</strong>
      <span style="color:#6b7280; font-size:14px;"> | ${item.licensePlate} | ${item.vehicleModel || ''} | תוקף: <strong style="color:#dc2626;">${new Date(item.expiryDate).toLocaleDateString('he-IL')}</strong></span>
    </div>
  `).join('');

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right; }
      .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
      .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 28px 30px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
      .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
      .body { padding: 24px 30px; }
      .footer { padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>🚗 התראת טסט / רשיון רכב</h1>
        <p>${licenseItems.length} כלים שרשיונם פוקע בתאריך ${expiryDateStr} (עוד 30 יום)</p>
      </div>
      <div class="body">${rowsHtml}
        <p style="margin-top:20px; color:#64748b; font-size:14px; text-align:center;">אנא דאג לחידוש הטסט / רשיון הרכב בהקדם האפשרי.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} צי לוג ידידים | תאריך שליחה: ${today}</p>
        <p>התראה זו נשלחת אוטומטית 30 יום לפני פקיעת רשיון הרכב</p>
      </div>
    </div></body></html>`;
};

exports.sendLicenseExpiryEmail = async (licenseItems) => {
  if (!licenseItems || licenseItems.length === 0) return;
  const expiryDateStr = new Date(licenseItems[0].expiryDate).toLocaleDateString('he-IL');
  const html = exports.buildLicenseEmailHtml(licenseItems);
  const systemEmail = process.env.FROM_EMAIL;
  if (systemEmail) {
    await exports.sendEmail({
      email: systemEmail,
      subject: `⚠️ התראת טסט/רשיון: ${licenseItems.length} כלים - פוקע ב-${expiryDateStr}`,
      html,
    });
  }
};
