// Vercel Serverless Function - POST /api/auth/login
const bcrypt = require('bcryptjs');
const { initFirebase } = require('../_utils/firebase');
const { getSignedJwtToken } = require('../_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { db } = initFirebase();
    const { username, password } = req.body;

    // בדיקת קלט
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'נא להזין שם משתמש וסיסמה'
      });
    }

    // חיפוש משתמש ב-Firestore
    const usersSnapshot = await db.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // בדיקת סיסמה
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // בדיקה אם החשבון פעיל
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

    // עדכון זמן כניסה אחרון
    await db.collection('users').doc(userId).update({
      lastLogin: new Date()
    });

    // יצירת token
    const token = getSignedJwtToken(userId);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: userId,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
