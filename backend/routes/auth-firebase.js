const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const UserModel = require('../models/firestore/UserModel');
const { getSignedJwtToken, protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { logAudit } = require('../middleware/auditLogger');

// Rate limiting - הגבלת ניסיונות כניסה
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 10, // מקסימום 10 ניסיונות ב-15 דקות
  message: { success: false, message: 'יותר מדי ניסיונות כניסה, נסה שוב בעוד 15 דקות' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // שעה
  max: 5, // מקסימום 5 בקשות לשעה
  message: { success: false, message: 'יותר מדי בקשות איפוס סיסמה, נסה שוב בעוד שעה' },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/auth/register
// @desc    רישום משתמש חדש - מנהלים בלבד
// @access  Private (super_admin, manager)
const ALLOWED_ROLES = ['rider', 'secretary', 'logistics', 'regional_manager', 'manager'];
router.post('/register', protect, async (req, res) => {
  try {
    // רק super_admin ו-manager יכולים ליצור משתמשים
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    if (!userRoles.some(r => ['super_admin', 'manager'].includes(r))) {
      return res.status(403).json({
        success: false,
        message: 'אין הרשאה ליצור משתמשים'
      });
    }

    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // ולידציות בסיסיות
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'כל השדות הם חובה'
      });
    }

    // מניעת הגדרת תפקיד לא מורשה
    const assignedRole = ALLOWED_ROLES.includes(role) ? role : 'rider';

    // יצירת משתמש
    const user = await UserModel.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      roles: [assignedRole],
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
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
router.post('/login', loginLimiter, async (req, res) => {
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

    // בדיקה אם החשבון פעיל
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'חשבון המשתמש אינו פעיל'
      });
    }

    // בדיקה אם החשבון נעול
    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'חשבון המשתמש נעול. אנא פנה למנהל המערכת'
      });
    }

    // בדיקת סיסמה
    const isMatch = await UserModel.comparePassword(password, user.password);

    if (!isMatch) {
      // ספירת ניסיונות כושלים ונעילה אוטומטית אחרי 5 ניסיונות
      const newAttempts = await UserModel.incrementLoginAttempts(user.id);
      if (newAttempts >= 5) {
        await UserModel.lockUser(user.id, 'נעילה אוטומטית לאחר 5 ניסיונות כניסה כושלים', null);
        return res.status(403).json({
          success: false,
          message: 'החשבון ננעל לאחר 5 ניסיונות כניסה כושלים. אנא פנה למנהל המערכת'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // עדכון זמן כניסה אחרון ואיפוס ניסיונות
    await UserModel.updateLastLogin(user.id);
    await UserModel.resetLoginAttempts(user.id);

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
        roles: user.roles || [user.role || 'rider'],
        riderId: user.riderId,
        vehicleAccess: user.vehicleAccess || []
      }
    });

    await logAudit(req, {
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`.trim() || user.username,
      description: 'משתמש התחבר למערכת'
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
router.get('/me', protect, async (req, res) => {
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
router.get('/users', protect, checkPermission('users', 'view'), async (req, res) => {
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
router.post('/users', protect, checkPermission('users', 'edit'), async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, roles, riderId, vehicleAccess, isActive } = req.body;

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
      roles: roles || ['rider'],
      riderId: riderId || null,
      vehicleAccess: vehicleAccess || [],
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });

    // שליחת מייל ברוכים הבאים עם הסיסמה הזמנית
    try {
      const emailService = require('../services/emailService');
      await emailService.sendNewUserWelcomeEmail(user, password);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // לא נכשל את הבקשה כולה אם המייל נכשל
    }

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

// @route   POST /api/auth/users/:id/unlock
// @desc    ביטול נעילת משתמש
// @access  Private (מנהלים בלבד)
router.post('/users/:id/unlock', protect, checkPermission('users', 'edit'), async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'משתמש לא נמצא' });
    }
    await UserModel.unlockUser(req.params.id);
    res.json({ success: true, message: 'הנעילה בוטלה בהצלחה' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/users/:id/send-credentials
// @desc    שליחת אישורים מחדש למשתמש (סיסמה זמנית חדשה)
// @access  Private (מנהלים בלבד)
router.post('/users/:id/send-credentials', protect, checkPermission('users', 'edit'), async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // יצירת סיסמה זמנית חדשה
    const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    // עדכון הסיסמה
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    await UserModel.update(req.params.id, { password: hashedPassword });

    // שליחת מייל עם הסיסמה החדשה
    const emailService = require('../services/emailService');
    await emailService.sendNewUserWelcomeEmail(user, temporaryPassword);

    res.json({
      success: true,
      message: 'פרטי הגישה נשלחו בהצלחה למייל המשתמש'
    });
  } catch (error) {
    console.error('Error sending credentials:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    עדכון משתמש
// @access  Private (מנהלים בלבד)
router.put('/users/:id', protect, checkPermission('users', 'edit'), async (req, res) => {
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
router.delete('/users/:id', protect, checkPermission('users', 'edit'), async (req, res) => {
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
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
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

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'סיסמה חייבת להיות לפחות 8 תווים'
      });
    }

    // הצפנת הטוקן שהתקבל
    const crypto = require('crypto');
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    // חיפוש ישיר לפי הטוקן המוצפן (במקום סריקת כל המשתמשים)
    const { db } = require('../config/firebase');
    const snapshot = await db.collection('users')
      .where('resetPasswordToken', '==', resetPasswordToken)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'טוקן לא תקין או שפג תוקפו'
      });
    }

    const doc = snapshot.docs[0];
    const rawUser = doc.data();
    const user = { id: doc.id, ...rawUser };

    // בדיקת תוקף
    const expireDate = rawUser.resetPasswordExpire?.toDate
      ? rawUser.resetPasswordExpire.toDate()
      : new Date(rawUser.resetPasswordExpire);

    if (!expireDate || expireDate < new Date()) {
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
