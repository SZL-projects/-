// Vercel Serverless Function - /api/auth (all auth endpoints) - catch-all route
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { initFirebase } = require('../_utils/firebase');
const { getSignedJwtToken, authenticateToken } = require('../_utils/auth');
// שימוש ב-SMTP כרגע - לשימוש ב-Gmail API צריך Domain-Wide Delegation
// כשתהיה גישת אדמין, החלף ל: const { sendPasswordResetEmail } = require('../_utils/gmailService');
const { sendPasswordResetEmail } = require('../_utils/emailService');
const { setCorsHeaders } = require('../_utils/cors');

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    const getRawBody = require('raw-body');
    try {
      const rawBody = await getRawBody(req);
      req.body = JSON.parse(rawBody.toString());
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();

    // Extract the sub-path using Vercel's native query.path (most reliable)
    let path;
    if (req.query && req.query.path) {
      const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
      path = '/' + parts.join('/');
    } else {
      // Fallback: parse req.url manually
      let rawPath = req.url.split('?')[0];
      if (rawPath.includes('/auth/')) {
        path = rawPath.substring(rawPath.indexOf('/auth/') + 6);
        if (!path.startsWith('/')) path = '/' + path;
      } else {
        path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
      }
    }

    console.log('🔐 Auth Request:', {
      path,
      method: req.method,
      fullUrl: req.url,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });

    // POST /api/auth/login
    if (path === '/login' && req.method === 'POST') {
      console.log('📝 Login attempt for username:', req.body?.username);
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'נא להזין שם משתמש וסיסמה'
        });
      }

      // חיפוש לפי שם משתמש
      let usersSnapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      // אם לא נמצא לפי שם משתמש, ננסה לפי אימייל
      if (usersSnapshot.empty) {
        console.log('📝 Username not found, trying email lookup:', username.toLowerCase());
        usersSnapshot = await db.collection('users')
          .where('email', '==', username.toLowerCase())
          .limit(1)
          .get();
      }

      if (usersSnapshot.empty) {
        console.log('❌ User not found by username or email:', username);
        return res.status(401).json({
          success: false,
          message: 'שם משתמש או סיסמה שגויים'
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (!userData.isActive) {
        return res.status(403).json({
          success: false,
          message: 'חשבון המשתמש אינו פעיל'
        });
      }

      if (userData.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'חשבון המשתמש נעול. אנא פנה למנהל המערכת'
        });
      }

      const isMatch = await bcrypt.compare(password, userData.password);

      if (!isMatch) {
        const currentAttempts = (userData.loginAttempts || 0) + 1;
        if (currentAttempts >= 5) {
          await db.collection('users').doc(userId).update({
            loginAttempts: currentAttempts,
            isLocked: true,
            lockReason: 'נעילה אוטומטית לאחר 5 ניסיונות כניסה כושלים',
            lockedAt: new Date()
          });
          return res.status(403).json({
            success: false,
            message: 'החשבון ננעל לאחר 5 ניסיונות כניסה כושלים. אנא פנה למנהל המערכת'
          });
        }
        await db.collection('users').doc(userId).update({ loginAttempts: currentAttempts });
        return res.status(401).json({
          success: false,
          message: 'שם משתמש או סיסמה שגויים'
        });
      }

      await db.collection('users').doc(userId).update({
        lastLogin: new Date(),
        loginAttempts: 0
      });

      const token = getSignedJwtToken(userId);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: userId,
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          roles: userData.roles || [userData.role],
          riderId: userData.riderId,
          vehicleAccess: userData.vehicleAccess || [],
          riderAccess: userData.riderAccess || []
        }
      });
    }

    // GET /api/auth/me
    if (path === '/me' && req.method === 'GET') {
      const user = await authenticateToken(req, db);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          roles: user.roles || [user.role],
          riderId: user.riderId,
          vehicleAccess: user.vehicleAccess || [],
          riderAccess: user.riderAccess || [],
          isActive: user.isActive
        }
      });
    }

    // POST /api/auth/forgot-password
    if (path === '/forgot-password' && req.method === 'POST') {
      console.log('📧 Forgot password request for:', req.body?.email);
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'נא להזין כתובת אימייל'
        });
      }

      // חיפוש משתמש לפי אימייל
      const usersSnapshot = await db.collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      // תמיד נחזיר הצלחה (למניעת גילוי קיום משתמשים)
      if (usersSnapshot.empty) {
        console.log('⚠️ Email not found, but returning success for security');
        return res.status(200).json({
          success: true,
          message: 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה'
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;

      // יצירת טוקן איפוס סיסמה
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 דקות

      // שמירת הטוקן במשתמש
      await db.collection('users').doc(userId).update({
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetTokenExpiry
      });

      console.log('✅ Reset token created for user:', userId);

      // שליחת מייל עם קישור לאיפוס סיסמה
      try {
        const userData = userDoc.data();
        await sendPasswordResetEmail(
          {
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || ''
          },
          resetToken
        );
        console.log('✅ Password reset email sent successfully to:', userData.email);
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError);
        // לא נכשיל את הבקשה אם המייל נכשל - נמשיך הלאה
      }

      return res.status(200).json({
        success: true,
        message: 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה',
        // לטסטים בלבד - להסיר בפרודקשן!
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    }

    // PUT /api/auth/reset-password/:token
    if (path.startsWith('/reset-password/') && req.method === 'PUT') {
      const token = path.split('/reset-password/')[1];
      console.log('🔄 Reset password request with token:', token?.substring(0, 10) + '...');

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'נא להזין סיסמה חדשה'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'הסיסמה חייבת להיות לפחות 6 תווים'
        });
      }

      // חיפוש משתמש עם הטוקן
      const usersSnapshot = await db.collection('users')
        .where('resetPasswordToken', '==', token)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return res.status(400).json({
          success: false,
          message: 'טוקן לא תקין או שפג תוקפו'
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      // בדיקת תוקף הטוקן
      const now = new Date();
      let expiryDate;

      // טיפול בפורמטים שונים של תאריך
      if (userData.resetPasswordExpiry) {
        if (typeof userData.resetPasswordExpiry.toDate === 'function') {
          // Firestore Timestamp
          expiryDate = userData.resetPasswordExpiry.toDate();
        } else if (userData.resetPasswordExpiry instanceof Date) {
          // JavaScript Date
          expiryDate = userData.resetPasswordExpiry;
        } else if (typeof userData.resetPasswordExpiry === 'string' || typeof userData.resetPasswordExpiry === 'number') {
          // String או Number
          expiryDate = new Date(userData.resetPasswordExpiry);
        }
      }

      console.log('🕐 Token expiry check:', {
        now: now.toISOString(),
        expiry: expiryDate ? expiryDate.toISOString() : 'N/A',
        isExpired: !expiryDate || expiryDate < now
      });

      if (!expiryDate || expiryDate < now) {
        return res.status(400).json({
          success: false,
          message: 'הטוקן פג תוקף. אנא בקש איפוס סיסמה מחדש'
        });
      }

      // הצפנת הסיסמה החדשה
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // עדכון הסיסמה ומחיקת הטוקן
      await db.collection('users').doc(userId).update({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        updatedAt: new Date()
      });

      console.log('✅ Password reset successful for user:', userId);

      return res.status(200).json({
        success: true,
        message: 'הסיסמה אופסה בהצלחה'
      });
    }

    // PUT /api/auth/change-password
    if (path === '/change-password' && req.method === 'PUT') {
      // בדיקת אימות - דורש משתמש מחובר
      const authUser = await authenticateToken(req, db);

      if (!authUser) {
        return res.status(401).json({
          success: false,
          message: 'נדרשת התחברות'
        });
      }

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'נא להזין סיסמה ישנה וסיסמה חדשה'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'הסיסמה החדשה חייבת להיות לפחות 6 תווים'
        });
      }

      // קבלת פרטי המשתמש הנוכחי
      const userRef = db.collection('users').doc(authUser.id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      const userData = userDoc.data();

      // בדיקת הסיסמה הישנה
      const isMatch = await bcrypt.compare(oldPassword, userData.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'הסיסמה הישנה שגויה'
        });
      }

      // הצפנת הסיסמה החדשה
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // עדכון הסיסמה
      await userRef.update({
        password: hashedPassword,
        mustChangePassword: false,
        updatedAt: new Date()
      });

      console.log('✅ Password changed successfully for user:', authUser.id);

      return res.status(200).json({
        success: true,
        message: 'הסיסמה שונתה בהצלחה'
      });
    }

    console.error('❌ Auth endpoint not found:', {
      path,
      method: req.method,
      url: req.url,
      availableEndpoints: ['/login (POST)', '/me (GET)', '/forgot-password (POST)', '/reset-password/:token (PUT)', '/change-password (PUT)']
    });

    return res.status(404).json({
      success: false,
      message: 'נתיב לא נמצא',
      details: {
        requestedPath: path,
        requestedMethod: req.method,
        availableEndpoints: [
          'POST /api/auth/login',
          'GET /api/auth/me',
          'POST /api/auth/forgot-password',
          'PUT /api/auth/reset-password/:token',
          'PUT /api/auth/change-password'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Auth error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
