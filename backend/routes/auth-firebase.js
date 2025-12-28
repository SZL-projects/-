const express = require('express');
const router = express.Router();
const UserModel = require('../models/firestore/UserModel');
const { getSignedJwtToken } = require('../middleware/auth-firebase');

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
router.get('/me', require('../middleware/auth-firebase').protect, async (req, res) => {
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

// @route   GET /api/auth/users
// @desc    קבלת רשימת משתמשים
// @access  Private (מנהלים בלבד)
router.get('/users', require('../middleware/auth-firebase').protect, require('../middleware/auth-firebase').authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const { search, role, isActive, limit = 50 } = req.query;

    let filters = {};

    if (role) {
      filters.role = role;
    }
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    let users;
    if (search) {
      users = await UserModel.search(search, filters, parseInt(limit));
    } else {
      users = await UserModel.getAll(filters, parseInt(limit));
    }

    // הסרת סיסמאות
    users = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/users
// @desc    יצירת משתמש חדש (ע"י מנהל)
// @access  Private (מנהלים בלבד)
router.post('/users', require('../middleware/auth-firebase').protect, require('../middleware/auth-firebase').authorize('super_admin', 'manager'), async (req, res) => {
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
      role: role || 'viewer',
      createdBy: req.user.id
    });

    // הסרת סיסמה מהתשובה
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    עדכון משתמש
// @access  Private (מנהלים בלבד)
router.put('/users/:id', require('../middleware/auth-firebase').protect, require('../middleware/auth-firebase').authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const user = await UserModel.update(req.params.id, req.body, req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // הסרת סיסמה
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    מחיקת משתמש
// @access  Private (מנהל-על בלבד)
router.delete('/users/:id', require('../middleware/auth-firebase').protect, require('../middleware/auth-firebase').authorize('super_admin'), async (req, res) => {
  try {
    // מניעת מחיקה עצמית
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'לא ניתן למחוק את המשתמש שלך'
      });
    }

    await UserModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'משתמש נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
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

    const user = await UserModel.findByEmail(email);

    if (!user) {
      // לא מגלים למשתמש אם האימייל קיים או לא מטעמי אבטחה
      return res.json({
        success: true,
        message: 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה'
      });
    }

    // יצירת טוקן איפוס סיסמה (תקף ל-10 דקות)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // שמירת הטוקן במשתמש (מוצפן)
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 דקות

    await UserModel.update(user.id, {
      resetPasswordToken,
      resetPasswordExpire
    });

    // שליחת מייל
    const emailService = require('../services/emailService');
    await emailService.sendPasswordResetEmail(user, resetToken);

    res.json({
      success: true,
      message: 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה'
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליחת מייל לאיפוס סיסמה'
    });
  }
});

// @route   PUT /api/auth/reset-password/:resetToken
// @desc    איפוס סיסמה באמצעות טוקן
// @access  Public
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'סיסמה חייבת להיות לפחות 6 תווים'
      });
    }

    // הצפנת הטוקן שהתקבל
    const crypto = require('crypto');
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    // חיפוש משתמש עם הטוקן ובדיקה שלא פג תוקפו
    const users = await UserModel.getAll({}, 1000);
    const user = users.find(u =>
      u.resetPasswordToken === resetPasswordToken &&
      u.resetPasswordExpire &&
      new Date(u.resetPasswordExpire) > new Date()
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'טוקן לא תקין או שפג תוקפו'
      });
    }

    // הצפנת סיסמה חדשה
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // עדכון סיסמה ומחיקת טוקן
    await UserModel.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpire: null
    });

    // יצירת token חדש
    const token = getSignedJwtToken(user.id);

    res.json({
      success: true,
      message: 'הסיסמה אופסה בהצלחה',
      token
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה באיפוס סיסמה'
    });
  }
});

module.exports = router;
