const express = require('express');
const router = express.Router();
const UserModel = require('../models/firestore/UserModel');
const { getSignedJwtToken } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    רישום משתמש חדש
// @access  Public (ייתכן שנרצה להגביל למנהלים בלבד)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // ולידציות בסיסיות
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'כל השדות הם חובה'
      });
    }

    // יצירת משתמש
    const user = await UserModel.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'rider'
    });

    // יצירת token
    const token = getSignedJwtToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
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

    // בדיקת משתמש
    const user = await UserModel.findByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // בדיקת סיסמה
    const isMatch = await UserModel.comparePassword(password, user.password);

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
    await UserModel.updateLastLogin(user.id);

    // יצירת token
    const token = getSignedJwtToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
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
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // הסרת סיסמה
    delete user.password;

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
