const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const { getSignedJwtToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

// @route   POST /api/auth/register
// @desc    רישום משתמש חדש
// @access  Public (ייתכן שנרצה להגביל למנהלים בלבד)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // בדיקה אם המשתמש כבר קיים
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'משתמש עם אימייל או שם משתמש זה כבר קיים'
      });
    }

    // יצירת משתמש
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'rider'
    });

    // יצירת token
    const token = getSignedJwtToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    התחברות משתמש
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // בדיקת קלט
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'נא להזין שם משתמש וסיסמה'
      });
    }

    // בדיקת משתמש (כולל סיסמה)
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // בדיקת סיסמה
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // בדיקה אם החשבון פעיל
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'חשבון המשתמש אינו פעיל'
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'חשבון המשתמש נעול. אנא פנה למנהל המערכת'
      });
    }

    // עדכון זמן כניסה אחרון
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // יצירת token
    const token = getSignedJwtToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    קבלת פרטי המשתמש המחובר
// @access  Private
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// @route   POST /api/auth/forgot-password
// @desc    שליחת מייל לאיפוס סיסמה
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'נא להזין כתובת אימייל'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'לא נמצא משתמש עם כתובת אימייל זו'
      });
    }

    // יצירת token לאיפוס סיסמה
    const resetToken = crypto.randomBytes(32).toString('hex');

    // הצפנת ה-token ושמירתו ב-DB
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 דקות

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save({ validateBeforeSave: false });

    // שליחת מייל
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);

      res.json({
        success: true,
        message: 'נשלח אימייל עם הוראות לאיפוס הסיסמה'
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);

      // ביטול ה-token במקרה של שגיאה
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליחת האימייל. נסה שוב מאוחר יותר'
      });
    }
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת. נסה שוב מאוחר יותר'
    });
  }
});

// @route   PUT /api/auth/reset-password/:resetToken
// @desc    איפוס סיסמה עם token
// @access  Public
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
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
        message: 'הסיסמה חייבת להכיל לפחות 6 תווים'
      });
    }

    // הצפנת ה-token שהתקבל
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    // חיפוש משתמש עם token תקף
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'קישור איפוס הסיסמה אינו תקף או פג תוקפו'
      });
    }

    // עדכון סיסמה
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'הסיסמה עודכנה בהצלחה'
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת. נסה שוב מאוחר יותר'
    });
  }
});

module.exports = router;
