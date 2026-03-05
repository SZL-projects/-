// Try different import methods for Vercel compatibility
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.error('Failed to require nodemailer:', e);
}

// Singleton transporter - נוצר פעם אחת בלבד
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const transportConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    family: 4,
  };

  try {
    const { createTransport } = require('nodemailer');
    if (typeof createTransport === 'function') {
      _transporter = createTransport(transportConfig);
      return _transporter;
    }
  } catch (e) { /* fallthrough */ }

  if (nodemailer && typeof nodemailer.createTransport === 'function') {
    _transporter = nodemailer.createTransport(transportConfig);
    return _transporter;
  }

  if (nodemailer?.default && typeof nodemailer.default.createTransport === 'function') {
    _transporter = nodemailer.default.createTransport(transportConfig);
    return _transporter;
  }

  throw new Error('Cannot find createTransport in nodemailer module. Available keys: ' + Object.keys(nodemailer || {}).join(', '));
};

// שליחת מייל כללי
exports.sendEmail = async (options) => {
  const transporter = getTransporter();

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(message);

    // רישום שליחת מייל בלוג (fire-and-forget)
    try {
      const { initFirebase } = require('./firebase');
      const { writeSystemAuditLog } = require('./auditLog');
      const { db } = initFirebase();
      writeSystemAuditLog(db, {
        action: 'email_sent',
        entityType: 'email',
        entityName: options.email,
        description: `מייל נשלח ל: ${options.email} | נושא: ${options.subject}`,
        metadata: { messageId: info.messageId, to: options.email, subject: options.subject },
      });
    } catch (logErr) {
      console.error('Email audit log error:', logErr.message);
    }

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
exports.sendCheckIssuesAlert = async ({ managerEmail, riderName, vehiclePlate, issues, checkId, checkResults, currentKm, notes }) => {
  const checkUrl = `${process.env.FRONTEND_URL}/monthly-checks`;

  const conditionLabel = (val) => val === 'good' ? 'תקין' : val === 'fair' ? 'בינוני' : val === 'poor' ? 'לא תקין' : val === 'bad' ? 'לא תקין' : val || '-';
  const checkLabel = (val) => val === 'ok' ? 'תקין' : val === 'low' ? 'נמוך' : val === 'not_ok' ? 'לא תקין' : val === 'na' ? 'לא רלוונטי' : val || '-';
  const doneLabel = (val) => val === 'done' ? 'בוצע' : val === 'not_done' ? 'לא בוצע' : val || '-';
  const conditionColor = (val) => val === 'good' ? '#059669' : (val === 'fair') ? '#d97706' : '#dc2626';
  const checkColor = (val) => val === 'ok' ? '#059669' : val === 'low' ? '#d97706' : val === 'na' ? '#64748b' : '#dc2626';
  const doneColor = (val) => val === 'done' ? '#059669' : '#d97706';

  const cr = checkResults || {};

  const allResultsHtml = `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
      <tr><th style="text-align:right;padding:6px 10px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;">פריט</th><th style="text-align:right;padding:6px 10px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;">תוצאה</th></tr>
      ${cr.oilCheck ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">שמן</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${checkColor(cr.oilCheck)};font-weight:600;">${checkLabel(cr.oilCheck)}</td></tr>` : ''}
      ${cr.waterCheck ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">מים / קירור</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${checkColor(cr.waterCheck)};font-weight:600;">${checkLabel(cr.waterCheck)}</td></tr>` : ''}
      ${cr.tirePressureFront ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">לחץ צמיג קדמי</td><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;">${cr.tirePressureFront} PSI</td></tr>` : ''}
      ${cr.tirePressureRear ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">לחץ צמיג אחורי</td><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;">${cr.tirePressureRear} PSI</td></tr>` : ''}
      ${cr.chainLubrication ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">שימון שרשרת</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${doneColor(cr.chainLubrication)};font-weight:600;">${doneLabel(cr.chainLubrication)}</td></tr>` : ''}
      ${cr.boxScrewsTightening ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">חיזוק ברגי ארגז</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${doneColor(cr.boxScrewsTightening)};font-weight:600;">${doneLabel(cr.boxScrewsTightening)}</td></tr>` : ''}
      ${cr.boxRailLubrication ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">שימון מסילות ארגז</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${doneColor(cr.boxRailLubrication)};font-weight:600;">${doneLabel(cr.boxRailLubrication)}</td></tr>` : ''}
      ${cr.brakesCondition ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">בלמים</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${conditionColor(cr.brakesCondition)};font-weight:600;">${conditionLabel(cr.brakesCondition)}</td></tr>` : ''}
      ${cr.lightsCondition ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">פנסים</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${conditionColor(cr.lightsCondition)};font-weight:600;">${conditionLabel(cr.lightsCondition)}</td></tr>` : ''}
      ${cr.mirrorsCondition ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">מראות</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${conditionColor(cr.mirrorsCondition)};font-weight:600;">${conditionLabel(cr.mirrorsCondition)}</td></tr>` : ''}
      ${cr.helmetCondition ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">קסדה</td><td style="padding:6px 10px;border:1px solid #e2e8f0;color:${conditionColor(cr.helmetCondition)};font-weight:600;">${conditionLabel(cr.helmetCondition)}</td></tr>` : ''}
      ${currentKm ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">קילומטראז'</td><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;">${parseInt(currentKm).toLocaleString('he-IL')} ק"מ</td></tr>` : ''}
    </table>
  `;

  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;direction:rtl}
.container{max-width:620px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden}
.header{background:linear-gradient(135deg,#f44336,#e53935);padding:28px 30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px}
.header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px}
.body{padding:24px 30px}
.alert-box{background:#ffebee;border-right:4px solid #f44336;border-radius:8px;padding:15px;margin:16px 0}
.issues-list{background:#fff3e0;border-right:4px solid #f59e0b;border-radius:8px;padding:15px;margin:16px 0}
.issue-item{padding:4px 0;color:#92400e}
.footer{padding:16px 30px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8}
.button{display:inline-block;background:#1976d2;color:#fff!important;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0;font-weight:bold}
</style></head><body>
<div class="container">
<div class="header"><h1>⚠️ התראה: בעיות בבקרה חודשית</h1><p>כלי: ${vehiclePlate || 'לא צוין'} | רוכב: ${riderName}</p></div>
<div class="body">
<div class="alert-box"><strong>פרטי הבקרה:</strong><br/>רוכב: ${riderName}<br/>מספר רישוי: ${vehiclePlate || 'לא צוין'}</div>
<p><strong>פירוט תוצאות הבקרה:</strong></p>
${allResultsHtml}
<div class="issues-list"><strong>⚠️ בעיות שנמצאו:</strong><br/>${issues.map(issue => `<div class="issue-item">• ${issue}</div>`).join('')}</div>
${notes ? `<p><strong>הערות הרוכב:</strong> ${notes}</p>` : ''}
<p>אנא בדוק את הבקרה ונקוט פעולה בהתאם.</p>
<center><a href="${checkUrl}" class="button">צפה בבקרות</a></center>
</div>
<div class="footer"><p>© ${new Date().getFullYear()} מערכת CRM צי לוג ידידים</p></div>
</div></body></html>`;

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
    <div style="background:#fff; border:1px solid #e2e8f0; border-right:4px solid #f59e0b; border-radius:8px; padding:12px 16px; margin-bottom:10px; text-align:right; direction:rtl; line-height:1.7; font-size:14px; color:#374151;">
      <div style="font-weight:bold; color:#f59e0b; margin-bottom:4px;">${i + 1}.</div>
      <div><span style="color:#6b7280;">מספר רכב:</span> <strong>${item.licensePlate}</strong></div>
      <div><span style="color:#6b7280;">שם:</span> <strong>${item.riderName}</strong></div>
      <div><span style="color:#6b7280;">דגם:</span> <strong>${item.vehicleModel || 'לא ידוע'}</strong></div>
      <div><span style="color:#6b7280;">תאריך תפוגה:</span> <strong style="color:#dc2626;">${new Date(item.expiryDate).toLocaleDateString('he-IL')}</strong></div>
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
    <div style="background:#fff; border:1px solid #e2e8f0; border-right:4px solid #3b82f6; border-radius:8px; padding:12px 16px; margin-bottom:10px; text-align:right; direction:rtl; line-height:1.7; font-size:14px; color:#374151;">
      <div style="font-weight:bold; color:#3b82f6; margin-bottom:4px;">${i + 1}.</div>
      <div><span style="color:#6b7280;">מספר רכב:</span> <strong>${item.licensePlate}</strong></div>
      ${item.riderIdNumber ? `<div><span style="color:#6b7280;">ת.ז.:</span> <strong>${item.riderIdNumber}</strong></div>` : ''}
      <div><span style="color:#6b7280;">שם:</span> <strong>${item.riderName}</strong></div>
      <div><span style="color:#6b7280;">דגם:</span> <strong>${item.vehicleModel || 'לא ידוע'}</strong></div>
      <div><span style="color:#6b7280;">תאריך תפוגה:</span> <strong style="color:#dc2626;">${new Date(item.expiryDate).toLocaleDateString('he-IL')}</strong></div>
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

// שליחת הודעה על תקלה חדשה למנהלים
exports.sendNewFaultNotification = async (fault, vehicle, rider) => {
  const severityLabels = { critical: 'קריטית', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
  const categoryLabels = {
    scooter: 'קטנוע',
    personal_equipment: 'ציוד רוכב אישי',
    assistance_equipment: 'ציוד סיוע לאחר',
    engine: 'מנוע', brakes: 'בלמים', electrical: 'חשמל ותאורה',
    tires: 'צמיגים', bodywork: 'מרכב', other: 'אחר',
  };
  const urgencyLabels = { cannot_ride: 'לא ניתן לרכב', needs_treatment: 'מצריך טיפול' };
  const severity = severityLabels[fault.severity] || fault.severity || 'לא ידוע';
  const category = categoryLabels[fault.faultArea || fault.category] || fault.faultArea || fault.category || 'לא ידוע';
  const urgencyText = urgencyLabels[fault.urgencyLevel] || '';
  const severityColor = (fault.severity === 'critical' || fault.severity === 'high') ? '#dc2626' : fault.severity === 'medium' ? '#d97706' : '#64748b';
  const canRideText = fault.canRide === false ? '<span style="color:#dc2626;font-weight:bold;">לא ניתן לרכב ⚠️</span>' : 'ניתן לרכב';
  const riderName = rider ? `${rider.firstName || ''} ${rider.lastName || ''}`.trim() : (fault.riderName || 'לא ידוע');
  const vehicleHeaderLabel = [vehicle?.internalNumber, vehicle?.licensePlate || fault.vehicleLicensePlate || fault.vehiclePlate, rider ? riderName : null].filter(Boolean).join(' | ') || '-';

  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;direction:rtl;text-align:right}
.container{max-width:620px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;direction:rtl}
.header{background:linear-gradient(135deg,#ef4444,#f97316);padding:28px 30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px}
.header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px}
.body{padding:24px 30px}
.field{background:#f8fafc;border:1px solid #e2e8f0;border-right:4px solid #6366f1;border-radius:8px;padding:12px 16px;margin-bottom:10px;text-align:right}
.field-label{color:#64748b;font-size:12px}
.field-value{color:#1e293b;font-size:15px;font-weight:600;margin-top:2px}
.footer{padding:16px 30px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8}
</style></head><body><div class="container">
<div class="header"><h1>⚠️ תקלה חדשה דווחה</h1><p>כלי: ${vehicleHeaderLabel}</p></div>
<div class="body">
<div class="field"><div class="field-label">רוכב מדווח</div><div class="field-value">${riderName}</div></div>
<div class="field"><div class="field-label">כותרת התקלה</div><div class="field-value">${fault.title || (fault.description || '').substring(0, 60) || 'לא צוין'}</div></div>
<div class="field"><div class="field-label">קטגוריה</div><div class="field-value">${category}</div></div>
${fault.subCategory ? `<div class="field"><div class="field-label">סוג בעיה</div><div class="field-value">${fault.subCategory === 'אחר' && fault.customSubCategory ? fault.customSubCategory : fault.subCategory}</div></div>` : ''}
${urgencyText ? `<div class="field"><div class="field-label">רמת דחיפות</div><div class="field-value">${urgencyText}</div></div>` : ''}
<div class="field"><div class="field-label">חומרה</div><div class="field-value" style="color:${severityColor}">${severity}</div></div>
<div class="field"><div class="field-label">ניתן לרכב?</div><div class="field-value">${canRideText}</div></div>
<div class="field"><div class="field-label">תיאור</div><div class="field-value" style="font-weight:400">${fault.description || '-'}</div></div>
${fault.location ? `<div class="field"><div class="field-label">מיקום</div><div class="field-value">${fault.location}</div></div>` : ''}
<div class="field"><div class="field-label">תאריך דיווח</div><div class="field-value">${new Date(fault.reportedDate || fault.createdAt || Date.now()).toLocaleString('he-IL')}</div></div>
</div>
<div class="footer"><p>© ${new Date().getFullYear()} צי לוג ידידים | יש לטפל בתקלה במערכת</p></div>
</div></body></html>`;

  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
  const targets = adminEmails.length > 0 ? adminEmails : (process.env.FROM_EMAIL ? [process.env.FROM_EMAIL] : []);

  for (const email of targets) {
    await exports.sendEmail({
      email: email.trim(),
      subject: `תקלה חדשה: ${fault.title || (fault.description || '').substring(0, 40) || 'תקלה'} - ${licensePlate}`,
      html,
    });
  }
};
