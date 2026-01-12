// JWT Authentication utilities for Vercel Serverless Functions
const jwt = require('jsonwebtoken');

// יצירת JWT Token
function getSignedJwtToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
}

// אימות Token והחזרת User
async function authenticateToken(req, db) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    // אימות ה-Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // שליפת המשתמש מ-Firestore
    const userDoc = await db.collection('users').doc(decoded.id).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const user = { id: userDoc.id, ...userDoc.data() };

    // בדיקת סטטוס
    if (!user.isActive) {
      throw new Error('User account is not active');
    }

    if (user.isLocked) {
      throw new Error('User account is locked');
    }

    return user;
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
}

// בדיקת הרשאות
function checkAuthorization(user, allowedRoles) {
  // תמיכה בשני פורמטים: role (בודד) ו-roles (מערך)
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

  // בדיקה אם למשתמש יש לפחות אחד מהתפקידים המותרים
  const hasPermission = userRoles.some(role => allowedRoles.includes(role));

  if (!hasPermission) {
    throw new Error(`User roles [${userRoles.join(', ')}] not authorized for this action. Required: [${allowedRoles.join(', ')}]`);
  }
  return true;
}

module.exports = {
  getSignedJwtToken,
  authenticateToken,
  checkAuthorization
};
