const { google } = require('googleapis');

class GmailService {
  constructor() {
    this.gmail = null;
    this.initialized = false;
    this.db = null;
  }

  // הגדרת Firestore instance
  setFirestore(db) {
    this.db = db;
  }

  // קבלת OAuth2 client עם טוקנים מ-Firestore
  async getOAuth2Client() {
    if (!this.db) {
      throw new Error('Firestore not initialized. Call setFirestore(db) first.');
    }

    const settingsRef = this.db.collection('settings').doc('googleDrive');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists || !settingsDoc.data().tokens) {
      throw new Error('Google לא מאומת. יש להתחבר דרך ממשק הניהול.');
    }

    const tokens = settingsDoc.data().tokens;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://tzi-log-yedidim.vercel.app/api/drive/oauth2callback'
    );

    oauth2Client.setCredentials(tokens);

    // בדוק אם הטוקן פג תוקף ורענן אותו
    const expiryDate = tokens.expiry_date?.toMillis ? tokens.expiry_date.toMillis() : tokens.expiry_date;
    const now = Date.now();
    const needsRefresh = !expiryDate || expiryDate < (now + 5 * 60 * 1000);

    if (needsRefresh) {
      console.log('Gmail: Access token needs refresh');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        const updatedTokens = {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          scope: credentials.scope || tokens.scope,
          token_type: credentials.token_type || tokens.token_type,
          expiry_date: credentials.expiry_date
        };

        await settingsRef.update({
          tokens: updatedTokens,
          updatedAt: new Date()
        });

        oauth2Client.setCredentials(updatedTokens);
        console.log('Gmail: Access token refreshed successfully');
      } catch (error) {
        console.error('Gmail: Failed to refresh access token:', error);
      }
    }

    return oauth2Client;
  }

  // אתחול Gmail API
  async initialize() {
    console.log('📧 [GmailService] Starting initialization...');
    try {
      console.log('📧 [GmailService] Getting OAuth2 client...');
      const auth = await this.getOAuth2Client();
      console.log('📧 [GmailService] OAuth2 client obtained, creating Gmail API...');
      this.gmail = google.gmail({ version: 'v1', auth });
      this.initialized = true;
      console.log('📧 [GmailService] Gmail service initialized successfully');
      return true;
    } catch (error) {
      console.error('📧 [GmailService] Failed to initialize:', {
        message: error.message,
        stack: error.stack
      });
      this.initialized = false;
      throw error; // זרוק את השגיאה במקום להחזיר false
    }
  }

  // שליחת מייל
  async sendEmail({ to, subject, html, text }) {
    console.log('📧 [GmailService] sendEmail called:', { to, subject: subject?.substring(0, 50) });

    if (!this.initialized) {
      console.log('📧 [GmailService] Not initialized, calling initialize()...');
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Gmail service not initialized');
    }

    console.log('📧 [GmailService] Service is initialized, preparing email...');

    try {
      // יצירת המייל בפורמט RFC 2822
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        html || text
      ];

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      console.log('📧 [GmailService] Sending via Gmail API...');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('📧 [GmailService] Email sent successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('📧 [GmailService] Error sending email:', {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      throw error;
    }
  }

  // שליחת מייל ברוכים הבאים
  async sendWelcomeEmail(userEmail, userName, loginUrl) {
    const subject = 'ברוכים הבאים למערכת CRM צי לוג ידידים';
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">שלום ${userName},</h2>
        <p>ברוכים הבאים למערכת CRM של צי לוג ידידים!</p>
        <p>המשתמש שלך נוצר בהצלחה.</p>
        <p><strong>פרטי התחברות:</strong></p>
        <ul>
          <li>אימייל: ${userEmail}</li>
          <li>סיסמה ראשונית נשלחה אליך בנפרד</li>
        </ul>
        <p>
          <a href="${loginUrl}" style="display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            התחבר למערכת
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          במידה ויש לך שאלות, אנא פנה למנהל המערכת.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html
    });
  }

  // שליחת מייל איפוס סיסמה
  async sendPasswordResetEmail(userEmail, userName, resetLink) {
    const subject = 'איפוס סיסמה - מערכת CRM צי לוג ידידים';
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">שלום ${userName},</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
        <p>לחץ על הכפתור למטה כדי לאפס את הסיסמה:</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            אפס סיסמה
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          הקישור תקף ל-24 שעות בלבד.
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          אם לא ביקשת לאפס את הסיסמה, התעלם ממייל זה.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html
    });
  }

  // שליחת התראה למנהל
  async sendAdminNotification({ subject, message, adminEmail }) {
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">התראה ממערכת CRM</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          ${message}
        </div>
        <p style="color: #666; font-size: 14px;">
          נשלח מ: מערכת CRM צי לוג ידידים
        </p>
      </div>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `התראה: ${subject}`,
      html
    });
  }

  // שליחת תזכורת לרוכב
  async sendReminderEmail({ to, subject, message, actionUrl, actionText }) {
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">תזכורת</h2>
        <p>${message}</p>
        ${actionUrl ? `
          <p>
            <a href="${actionUrl}" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              ${actionText || 'לחץ כאן'}
            </a>
          </p>
        ` : ''}
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          מערכת CRM צי לוג ידידים
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html
    });
  }
}

// יצירת instance יחיד
const gmailService = new GmailService();

module.exports = gmailService;
