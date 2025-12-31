const jwt = require('jsonwebtoken');
const User = require('../models/User');

// אימות משתמש
exports.protect = async (req, res, next) => {
  let token;

  // בדיקה אם יש token בheaders
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // בדיקה אם token קיים
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'אין הרשאה לגשת לנתוב זה'
    });
  }

  try {
    // אימות token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // שליפת המשתמש
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // בדיקה אם החשבון פעיל ולא נעול
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'חשבון המשתמש אינו פעיל'
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'חשבון המשתמש נעול'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'אין הרשאה לגשת לנתוב זה'
    });
  }
};

// בדיקת הרשאות לפי תפקיד - תומך ב-roles מרובים
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // תמיכה גם ב-role בודד (תאימות לאחור) וגם ב-roles מערך
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];

    // בדיקה אם למשתמש יש לפחות אחד מהתפקידים המתאימים
    const hasPermission = userRoles.some(userRole => roles.includes(userRole));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `התפקידים ${userRoles.join(', ')} אינם מורשים לבצע פעולה זו`
      });
    }
    next();
  };
};

// יצירת token
exports.getSignedJwtToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};
