// Vercel Serverless Function - /api/drive (OAuth2 flow)
const { google } = require('googleapis');
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');

// OAuth2 client configuration
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://seven-roan-19.vercel.app/api/drive/oauth2callback'
  );
};

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = initFirebase();
    const url = req.url.split('?')[0];

    // GET /api/drive/authorize - Start OAuth2 flow
    if (url.endsWith('/authorize') && req.method === 'GET') {
      const user = await authenticateToken(req, db);
      checkAuthorization(user, ['super_admin']);

      const oauth2Client = getOAuth2Client();

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        prompt: 'consent' // Force to get refresh token
      });

      return res.json({
        success: true,
        authUrl
      });
    }

    // GET /api/drive/oauth2callback - Handle OAuth2 callback
    if (url.includes('/oauth2callback') && req.method === 'GET') {
      const { code } = req.query;

      if (!code) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">❌ שגיאה</h2>
              <p>לא התקבל קוד אימות מגוגל</p>
              <a href="/" style="color: blue;">חזרה למערכת</a>
            </body>
          </html>
        `);
      }

      const oauth2Client = getOAuth2Client();

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      // Save tokens to Firestore
      const settingsRef = db.collection('settings').doc('googleDrive');
      await settingsRef.set({
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        },
        updatedAt: new Date(),
        authorizedBy: 'admin' // You can update this with actual user ID
      });

      // Get user info to confirm
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      console.log('Google Drive authorized for:', userInfo.data.email);

      return res.send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: green;">✅ הצלחה!</h2>
            <p>Google Drive מחובר בהצלחה</p>
            <p>חשבון: <strong>${userInfo.data.email}</strong></p>
            <p style="margin-top: 30px;">
              <a href="/" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                חזרה למערכת
              </a>
            </p>
            <script>
              // Auto close after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }

    // GET /api/drive/status - Check authorization status
    if (url.endsWith('/status') && req.method === 'GET') {
      const user = await authenticateToken(req, db);

      const settingsRef = db.collection('settings').doc('googleDrive');
      const settingsDoc = await settingsRef.get();

      if (!settingsDoc.exists || !settingsDoc.data().tokens) {
        return res.json({
          success: true,
          authorized: false,
          message: 'Google Drive לא מחובר'
        });
      }

      const tokens = settingsDoc.data().tokens;
      const updatedAt = settingsDoc.data().updatedAt;

      // Check if token is expired
      const isExpired = tokens.expiry_date && tokens.expiry_date < Date.now();

      // המר Firestore Timestamp ל-ISO string
      const lastUpdatedISO = updatedAt?.toDate ? updatedAt.toDate().toISOString() : updatedAt;

      return res.json({
        success: true,
        authorized: true,
        expired: isExpired,
        lastUpdated: lastUpdatedISO,
        message: isExpired ? 'הטוקן פג תוקף, נדרש אימות מחדש' : 'Google Drive מחובר'
      });
    }

    // POST /api/drive/revoke - Revoke authorization
    if (url.endsWith('/revoke') && req.method === 'POST') {
      const user = await authenticateToken(req, db);
      checkAuthorization(user, ['super_admin']);

      const settingsRef = db.collection('settings').doc('googleDrive');
      await settingsRef.delete();

      return res.json({
        success: true,
        message: 'הרשאות Google Drive הוסרו'
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });

  } catch (error) {
    console.error('Drive OAuth error:', error);

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
