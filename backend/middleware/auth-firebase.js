const jwt = require('jsonwebtoken');
const UserModel = require('../models/firestore/UserModel');

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

    // שליפת המשתמש מ-Firestore
    const user = await UserModel.findById(decoded.id);

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

    // הסרת סיסמה לפני שמירה ב-request
    delete user.password;

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'אין הרשאה לגשת לנתוב זה'
    });
  }
};

// בדיקת הרשאות לפי תפקיד
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `התפקיד ${req.user.role} אינו מורשה לבצע פעולה זו`
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
