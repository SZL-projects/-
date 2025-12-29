// Vercel Serverless Function - POST /api/auth/register
const bcrypt = require('bcryptjs');
const { initFirebase } = require('../_utils/firebase');
const { getSignedJwtToken } = require('../_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { db } = initFirebase();
    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // בדיקה אם המשתמש כבר קיים
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

    // הצפנת סיסמה
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // יצירת משתמש חדש
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

    // יצירת token
    const token = getSignedJwtToken(userId);

    res.status(201).json({
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
