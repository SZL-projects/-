// Vercel Serverless Function - /api/auth (all auth endpoints)
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { initFirebase } = require('./_utils/firebase');
const { getSignedJwtToken, authenticateToken } = require('./_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = initFirebase();

    // Extract the sub-path - handle multiple Vercel URL patterns
    let path = req.url.split('?')[0]; // Remove query params first

    // Try different patterns
    if (path.includes('/auth/')) {
      // Pattern: /api/auth/login or /auth/login
      path = path.substring(path.indexOf('/auth/') + 5); // Everything after /auth
    } else if (path.startsWith('/')) {
      // Pattern: /login (Vercel stripped the prefix)
      path = path;
    }

    console.log('Auth path:', path, 'Method:', req.method, 'Full URL:', req.url);

    // POST /api/auth/login
    if (path === '/login' && req.method === 'POST') {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'נא להזין שם משתמש וסיסמה'
        });
      }

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

      const isMatch = await bcrypt.compare(password, userData.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'שם משתמש או סיסמה שגויים'
        });
      }

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

      await db.collection('users').doc(userId).update({
        lastLogin: new Date()
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
          role: userData.role
        }
      });
    }

    // POST /api/auth/register
    if (path === '/register' && req.method === 'POST') {
      const { username, email, password, firstName, lastName, phone, role } = req.body;

      const usernameCheck = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      const emailCheck = await db.collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (!usernameCheck.empty || !emailCheck.empty) {
        return res.status(400).json({
          success: false,
          message: 'משתמש עם אימייל או שם משתמש זה כבר קיים'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: role || 'rider',
        isActive: true,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userRef = await db.collection('users').add(newUser);
      const userId = userRef.id;

      const token = getSignedJwtToken(userId);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: userId,
          username,
          email: email.toLowerCase(),
          firstName,
          lastName,
          role: role || 'rider'
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
          isActive: user.isActive
        }
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
