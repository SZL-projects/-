// Gmail API Email Service - שירות שליחת מיילים דרך Gmail API
const { google } = require('googleapis');

// פונקציה ליצירת Gmail client
const createGmailClient = () => {
  try {
    // קריאת Service Account Key מהסביבה
    const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    // יצירת OAuth2 client עם Service Account
    const auth = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      // שליחת מיילים מטעם המשתמש bikes@yedidim-il.org
      subject: 'bikes@yedidim-il.org'
    });

    const gmail = google.gmail({ version: 'v1', auth });

    console.log('✅ Gmail API client created successfully');
    return gmail;
  } catch (error) {
    console.error('❌ Failed to create Gmail client:', error);
    throw error;
  }
};

// פונקציה ליצירת מייל בפורמט RFC 2822
const createEmailMessage = (to, subject, html) => {
  const from = `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`;

  // בניית המייל בפורמט שגוגל מבין
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html
  ].join('\n');

  // המרה ל-Base64 (זה מה שגוגל דורש)
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
};

// שליחת מייל כללי
exports.sendEmail = async (options) => {
  try {
    const gmail = createGmailClient();

    const encodedMessage = createEmailMessage(
      options.email,
      options.subject,
      options.html
    );

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('✅ Email sent successfully via Gmail API:', result.data.id);
    return result.data;
  } catch (error) {
    console.error('❌ Error sending email via Gmail API:', error);
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
        <h1>🏍️ איפוס סיסמה - מערכת CRM יחידת האופנועים</h1>
        <p>שלום ${user.firstName} ${user.lastName},</p>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת.</p>
        <p>לאיפוס הסיסמה, לחץ על הכפתור הבא:</p>
        <center>
          <a href="${resetUrl}" class="button">אפס סיסמה</a>
        </center>
        <p><strong>שים לב:</strong> קישור זה יפוג בעוד 10 דקות.</p>
        <p>אם לא ביקשת איפוס סיסמה, התעלם ממייל זה.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} מערכת CRM יחידת האופנועים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'איפוס סיסמה - מערכת CRM יחידת האופנועים',
    html,
  });
};
