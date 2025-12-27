const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getSignedJwtToken } = require('../middleware/auth');

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

module.exports = router;
