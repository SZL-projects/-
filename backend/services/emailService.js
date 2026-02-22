const nodemailer = require('nodemailer');

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

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #f59e0b; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; font-weight: 600; color: #64748b; }
        tr { background-color: #fef3c7; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #777; }
        .summary { background-color: #fff7ed; border-right: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📋 התראת ביטוח - פוקע בעוד 14 יום</h1>

        <div class="summary">
          <p><strong>תאריך שליחה:</strong> ${today}</p>
          <p><strong>${insuranceItems.length} כלים</strong> שהביטוח שלהם פוקע בתאריך ${new Date(insuranceItems[0].expiryDate).toLocaleDateString('he-IL')}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>מספר רישוי</th>
              <th>סוג ביטוח</th>
              <th>תאריך פקיעה</th>
            </tr>
          </thead>
          <tbody>
            ${insuranceItems.map(item => `
              <tr>
                <td>${item.licensePlate}</td>
                <td>${item.insuranceType === 'mandatory' ? 'ביטוח חובה' : 'ביטוח מקיף'}</td>
                <td>${new Date(item.expiryDate).toLocaleDateString('he-IL')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 20px; color: #64748b;">אנא טפל בחידוש הביטוחים בהקדם האפשרי.</p>

        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
          <p style="font-size: 12px; color: #94a3b8;">התראה זו נשלחת אוטומטית 14 יום לפני פקיעת הביטוח</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const systemEmail = process.env.FROM_EMAIL;
  if (systemEmail) {
    await exports.sendEmail({
      email: systemEmail,
      subject: `התראת ביטוח: ${insuranceItems.length} כלים - פוקע בעוד 14 יום`,
      html,
    });
  }
};

// שליחת התראה על רשיון רכב/טסט שפוקע בעוד 30 יום
exports.sendLicenseExpiryEmail = async (licenseItems) => {
  if (!licenseItems || licenseItems.length === 0) return;

  const today = new Date().toLocaleDateString('he-IL');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #3b82f6; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; font-weight: 600; color: #64748b; }
        tr { background-color: #eff6ff; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #777; }
        .summary { background-color: #eff6ff; border-right: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚗 התראת טסט/רשיון רכב - פוקע בעוד 30 יום</h1>

        <div class="summary">
          <p><strong>תאריך שליחה:</strong> ${today}</p>
          <p><strong>${licenseItems.length} כלים</strong> שרשיון הרכב/טסט שלהם פוקע בתאריך ${new Date(licenseItems[0].expiryDate).toLocaleDateString('he-IL')}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>מספר רישוי</th>
              <th>תאריך פקיעה</th>
            </tr>
          </thead>
          <tbody>
            ${licenseItems.map(item => `
              <tr>
                <td>${item.licensePlate}</td>
                <td>${new Date(item.expiryDate).toLocaleDateString('he-IL')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 20px; color: #64748b;">אנא דאג לחידוש הטסט/רשיון הרכב בהקדם האפשרי.</p>

        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
          <p style="font-size: 12px; color: #94a3b8;">התראה זו נשלחת אוטומטית 30 יום לפני פקיעת רשיון הרכב</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const systemEmail = process.env.FROM_EMAIL;
  if (systemEmail) {
    await exports.sendEmail({
      email: systemEmail,
      subject: `התראת טסט/רשיון: ${licenseItems.length} כלים - פוקע בעוד 30 יום`,
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
