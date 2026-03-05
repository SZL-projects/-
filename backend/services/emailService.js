const nodemailer = require('nodemailer');
const { logAuditDirect } = require('../middleware/auditLogger');

// יצירת transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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
    console.log('Email sent: %s', info.messageId);

    // רישום שליחת מייל בלוג
    logAuditDirect({
      action: 'email_sent',
      entityType: 'email',
      entityName: options.email,
      description: `מייל נשלח ל: ${options.email} | נושא: ${options.subject}`,
      metadata: { messageId: info.messageId, to: options.email, subject: options.subject },
    });

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
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
        <h1>🏍️ איפוס סיסמה - צי לוג ידידים</h1>
        <p>שלום ${user.firstName} ${user.lastName},</p>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת.</p>
        <p>לאיפוס הסיסמה, לחץ על הכפתור הבא:</p>
        <center>
          <a href="${resetUrl}" class="button">אפס סיסמה</a>
        </center>
        <p><strong>שים לב:</strong> קישור זה יפוג בעוד 10 דקות.</p>
        <p>אם לא ביקשת איפוס סיסמה, התעלם ממייל זה.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'איפוס סיסמה - צי לוג ידידים',
    html,
  });
};

// שליחת תזכורת לבקרה חודשית
exports.sendMonthlyCheckReminder = async (rider, vehicle) => {
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
        .info-box {
          background-color: #fff3e0;
          border-right: 4px solid #ff9800;
          padding: 15px;
          margin: 20px 0;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
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
        <p>שלום ${rider.firstName} ${rider.lastName},</p>
        <p>זוהי תזכורת לביצוע בקרה חודשית לכלי שלך.</p>
        <div class="info-box">
          <p><strong>פרטי הכלי:</strong></p>
          <p>מספר רישוי: <strong>${vehicle.licensePlate || vehicle.internalNumber}</strong></p>
          <p>יצרן ודגם: <strong>${vehicle.manufacturer} ${vehicle.model}</strong></p>
          <p>קילומטראז' נוכחי: <strong>${vehicle.currentKilometers?.toLocaleString('he-IL') || '0'} ק"מ</strong></p>
        </div>
        <p>אנא בצע את הבקרה החודשית במערכת בהקדם האפשרי.</p>
        <center>
          <a href="${process.env.FRONTEND_URL}/monthly-checks" class="button">לביצוע בקרה חודשית</a>
        </center>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: rider.email,
    subject: 'תזכורת: בקרה חודשית - צי לוג ידידים',
    html,
  });
};

// שליחת הודעה על תקלה חדשה (כל תקלה)
exports.sendNewFaultNotification = async (fault, vehicle, rider) => {
  const severityLabels = { critical: 'קריטית', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
  const categoryLabels = { engine: 'מנוע', brakes: 'בלמים', electrical: 'חשמל ותאורה', tires: 'צמיגים', bodywork: 'מרכב', other: 'אחר' };
  const severity = severityLabels[fault.severity] || fault.severity;
  const category = categoryLabels[fault.category] || fault.category;
  const severityColor = fault.severity === 'critical' || fault.severity === 'high' ? '#dc2626' : fault.severity === 'medium' ? '#d97706' : '#64748b';
  const canRideText = fault.canRide === false ? '<span style="color:#dc2626;font-weight:bold;">לא ניתן לרכב ⚠️</span>' : 'ניתן לרכב';
  const riderName = rider ? `${rider.firstName} ${rider.lastName}` : 'לא ידוע';
  const vehicleHeaderLabel = [vehicle?.internalNumber, vehicle?.licensePlate].filter(Boolean).join(' | ') || fault.vehicleLicensePlate || 'לא ידוע';
  const riderDetails = rider
    ? [rider.idNumber ? `ל.ז. ${rider.idNumber}` : null, vehicle?.internalNumber ? `מספר פנימי ${vehicle.internalNumber}` : null, riderName].filter(Boolean).join(' | ')
    : 'לא ידוע';

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; direction: rtl; text-align: right; }
        .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; direction: rtl; }
        .header { background: linear-gradient(135deg, #ef4444, #f97316); padding: 28px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 24px 30px; }
        .field { background:#f8fafc; border:1px solid #e2e8f0; border-right:4px solid #6366f1; border-radius:8px; padding:12px 16px; margin-bottom:10px; text-align: right; }
        .field-label { color:#64748b; font-size:12px; }
        .field-value { color:#1e293b; font-size:15px; font-weight:600; margin-top:2px; }
        .footer { padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ תקלה חדשה דווחה</h1>
          <p>כלי: ${vehicleHeaderLabel}</p>
        </div>
        <div class="body">
          <div class="field">
            <div class="field-label">רוכב מדווח</div>
            <div class="field-value">${riderDetails}</div>
          </div>
          <div class="field">
            <div class="field-label">כותרת התקלה</div>
            <div class="field-value">${fault.title || fault.description?.substring(0, 60) || 'לא צוין'}</div>
          </div>
          <div class="field">
            <div class="field-label">קטגוריה</div>
            <div class="field-value">${category}</div>
          </div>
          <div class="field">
            <div class="field-label">חומרה</div>
            <div class="field-value" style="color:${severityColor}">${severity}</div>
          </div>
          <div class="field">
            <div class="field-label">ניתן לרכב?</div>
            <div class="field-value">${canRideText}</div>
          </div>
          <div class="field">
            <div class="field-label">תיאור</div>
            <div class="field-value" style="font-weight:400">${fault.description || '-'}</div>
          </div>
          ${fault.location ? `<div class="field"><div class="field-label">מיקום</div><div class="field-value">${fault.location}</div></div>` : ''}
          <div class="field">
            <div class="field-label">תאריך דיווח</div>
            <div class="field-value">${new Date(fault.reportedDate || fault.createdAt).toLocaleString('he-IL')}</div>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים &nbsp;|&nbsp; יש לטפל בתקלה במערכת</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
  const systemEmail = process.env.FROM_EMAIL;
  const targets = adminEmails.length > 0 ? adminEmails : (systemEmail ? [systemEmail] : []);

  for (const email of targets) {
    await exports.sendEmail({
      email: email.trim(),
      subject: `תקלה חדשה: ${fault.title || fault.description?.substring(0, 40) || 'תקלה'} - ${vehicle?.licensePlate || fault.vehicleLicensePlate || ''}`,
      html,
    });
  }
};

// שליחת הודעה על תקלה קריטית
exports.sendCriticalFaultNotification = async (fault, vehicle, rider) => {
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
        .alert-box {
          background-color: #ffebee;
          border-right: 4px solid #f44336;
          padding: 15px;
          margin: 20px 0;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
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
        <h1>⚠️ תקלה קריטית בכלי</h1>
        <p>שלום,</p>
        <p>דווחה תקלה קריטית במערכת שדורשת טיפול מיידי.</p>
        <div class="alert-box">
          <p><strong>פרטי התקלה:</strong></p>
          <p>כלי: <strong>${vehicle.licensePlate || vehicle.internalNumber}</strong></p>
          <p>רוכב: <strong>${rider.firstName} ${rider.lastName}</strong></p>
          <p>תיאור: <strong>${fault.description}</strong></p>
          <p>תאריך דיווח: <strong>${new Date(fault.reportedDate).toLocaleDateString('he-IL')}</strong></p>
        </div>
        <p>יש לטפל בתקלה בהקדם האפשרי.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // שליחה למנהלים
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];

  for (const email of adminEmails) {
    await exports.sendEmail({
      email: email.trim(),
      subject: 'תקלה קריטית - דורש טיפול מיידי',
      html,
    });
  }
};

// שליחת אישור רישום משתמש חדש
exports.sendNewUserWelcomeEmail = async (user, temporaryPassword) => {
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
          color: #4caf50;
          text-align: center;
        }
        .info-box {
          background-color: #e8f5e9;
          border-right: 4px solid #4caf50;
          padding: 15px;
          margin: 20px 0;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
        }
        .button {
          display: inline-block;
          background-color: #4caf50;
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
        <h1>🏍️ ברוכים הבאים לצי לוג ידידים</h1>
        <p>שלום ${user.firstName} ${user.lastName},</p>
        <p>חשבון המשתמש שלך נוצר בהצלחה במערכת!</p>
        <div class="info-box">
          <p><strong>פרטי התחברות:</strong></p>
          <p>שם משתמש: <strong>${user.username}</strong></p>
          <p>סיסמה זמנית: <strong>${temporaryPassword}</strong></p>
          <p>תפקיד: <strong>${getRoleLabel(Array.isArray(user.roles) ? user.roles[0] : user.role)}</strong></p>
        </div>
        <p><strong>חשוב!</strong> אנא התחבר למערכת ושנה את סיסמתך הזמנית בהקדם האפשרי.</p>
        <center>
          <a href="${loginUrl}" class="button">התחבר למערכת</a>
        </center>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'ברוכים הבאים - חשבון המשתמש שלך נוצר',
    html,
  });
};

// שליחת התראה על ביטוחים שפוקעים בעוד 14 יום
exports.sendInsuranceExpiryEmail = async (insuranceItems) => {
  if (!insuranceItems || insuranceItems.length === 0) return;

  const today = new Date().toLocaleDateString('he-IL');
  const expiryDateStr = new Date(insuranceItems[0].expiryDate).toLocaleDateString('he-IL');

  const cardsHtml = insuranceItems.map(item => `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-right:4px solid #f59e0b; border-radius:8px; padding:16px 20px; margin-bottom:12px;">
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">שם הרוכב:</span><br>
        <strong>${item.riderName}</strong>
      </p>
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">מספר רכב:</span><br>
        <strong>${item.licensePlate}</strong>
      </p>
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">דגם:</span><br>
        <strong>${item.vehicleModel || 'לא ידוע'}</strong>
      </p>
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">סוג ביטוח:</span><br>
        <strong>ביטוח</strong>
      </p>
      <p style="margin:0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">תאריך תפוגת הביטוח:</span><br>
        <strong style="color:#dc2626;">${new Date(item.expiryDate).toLocaleDateString('he-IL')}</strong>
      </p>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; }
        .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 24px 30px; }
        .footer { padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 התראת ביטוח</h1>
          <p>${insuranceItems.length} כלים שביטוחם פוקע בתאריך ${expiryDateStr} (עוד 14 יום)</p>
        </div>
        <div class="body">
          ${cardsHtml}
          <p style="margin-top:20px; color:#64748b; font-size:14px; text-align:center;">
            אנא טפל בחידוש הביטוחים בהקדם האפשרי.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים &nbsp;|&nbsp; תאריך שליחה: ${today}</p>
          <p>התראה זו נשלחת אוטומטית 14 יום לפני פקיעת הביטוח</p>
        </div>
      </div>
    </body>
    </html>
  `;

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
exports.sendLicenseExpiryEmail = async (licenseItems) => {
  if (!licenseItems || licenseItems.length === 0) return;

  const today = new Date().toLocaleDateString('he-IL');
  const expiryDateStr = new Date(licenseItems[0].expiryDate).toLocaleDateString('he-IL');

  const cardsHtml = licenseItems.map(item => `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-right:4px solid #3b82f6; border-radius:8px; padding:16px 20px; margin-bottom:12px;">
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">מספר רכב:</span><br>
        <strong>${item.licensePlate}</strong>
      </p>
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">שם הרוכב:</span><br>
        <strong>${item.riderName}</strong>
      </p>
      ${item.riderIdNumber ? `
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">תעודת זהות:</span><br>
        <strong>${item.riderIdNumber}</strong>
      </p>` : ''}
      <p style="margin:0 0 8px 0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">דגם:</span><br>
        <strong>${item.vehicleModel || 'לא ידוע'}</strong>
      </p>
      <p style="margin:0; color:#374151; font-size:15px;">
        <span style="color:#6b7280; font-size:13px;">תאריך תפוגת הרישיון:</span><br>
        <strong style="color:#dc2626;">${new Date(item.expiryDate).toLocaleDateString('he-IL')}</strong>
      </p>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; }
        .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 28px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 24px 30px; }
        .footer { padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 התראת טסט / רשיון רכב</h1>
          <p>${licenseItems.length} כלים שרשיונם פוקע בתאריך ${expiryDateStr} (עוד 30 יום)</p>
        </div>
        <div class="body">
          ${cardsHtml}
          <p style="margin-top:20px; color:#64748b; font-size:14px; text-align:center;">
            אנא דאג לחידוש הטסט / רשיון הרכב בהקדם האפשרי.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים &nbsp;|&nbsp; תאריך שליחה: ${today}</p>
          <p>התראה זו נשלחת אוטומטית 30 יום לפני פקיעת רשיון הרכב</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const systemEmail = process.env.FROM_EMAIL;
  if (systemEmail) {
    await exports.sendEmail({
      email: systemEmail,
      subject: `⚠️ התראת טסט/רשיון: ${licenseItems.length} כלים - פוקע ב-${expiryDateStr}`,
      html,
    });
  }
};

// פונקציית עזר לתרגום תפקידים
function getRoleLabel(role) {
  const roles = {
    super_admin: 'מנהל על',
    manager: 'מנהל',
    secretary: 'מזכיר',
    rider: 'רוכב',
    viewer: 'צופה'
  };
  return roles[role] || role;
}
