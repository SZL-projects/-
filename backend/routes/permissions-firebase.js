const express = require('express');
const router = express.Router();
const PermissionModel = require('../models/firestore/PermissionModel');
const { protect } = require('../middleware/auth-firebase');
const { logAudit } = require('../middleware/auditLogger');

// כל הנתיבים מוגנים
router.use(protect);

// @route   GET /api/permissions
// @desc    קבלת ההרשאות הנוכחיות + מטא-דאטא
// @access  Private (מנהלים בלבד)
router.get('/', async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    if (!userRoles.some(r => ['super_admin', 'manager'].includes(r))) {
      return res.status(403).json({
        success: false,
        message: 'רק מנהלים יכולים לצפות בהגדרות ההרשאות',
      });
    }

    const permissions = await PermissionModel.getPermissions();
    const metadata = PermissionModel.getMetadata();

    res.json({
      success: true,
      permissions,
      metadata,
    });
  } catch (error) {
    console.error('שגיאה בקבלת הרשאות:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בקבלת הרשאות',
    });
  }
});

// @route   PUT /api/permissions
// @desc    עדכון הרשאות
// @access  Private (מנהל-על בלבד)
router.put('/', async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    if (!userRoles.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'רק מנהל-על יכול לעדכן הרשאות',
      });
    }

    const { permissions } = req.body;
    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'חסרות הרשאות לעדכון',
      });
    }

    const updated = await PermissionModel.updatePermissions(permissions, req.user.id);

    res.json({
      success: true,
      message: 'ההרשאות עודכנו בהצלחה',
      permissions: updated,
    });

    for (const role of Object.keys(permissions)) {
      logAudit(req, {
        action: 'update',
        entityType: 'permission',
        entityName: role,
        description: `הרשאות עודכנו לתפקיד: ${role}`
      });
    }
  } catch (error) {
    console.error('שגיאה בעדכון הרשאות:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בעדכון הרשאות',
    });
  }
});

// @route   POST /api/permissions/reset
// @desc    איפוס הרשאות לברירת מחדל
// @access  Private (מנהל-על בלבד)
router.post('/reset', async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    if (!userRoles.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'רק מנהל-על יכול לאפס הרשאות',
      });
    }

    const permissions = await PermissionModel.resetToDefaults(req.user.id);

    res.json({
      success: true,
      message: 'ההרשאות אופסו לברירת מחדל',
      permissions,
    });

    logAudit(req, {
      action: 'update',
      entityType: 'permission',
      description: 'הרשאות אופסו לברירת מחדל'
    });
  } catch (error) {
    console.error('שגיאה באיפוס הרשאות:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה באיפוס הרשאות',
    });
  }
});

// @route   GET /api/permissions/my
// @desc    קבלת ההרשאות של המשתמש המחובר
// @access  Private
router.get('/my', async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const permissions = await PermissionModel.getPermissions();
    const metadata = PermissionModel.getMetadata();

    // חישוב ההרשאות האפקטיביות של המשתמש
    const effectivePermissions = {};
    const levelPriority = { none: 0, self: 1, view: 2, edit: 3 };

    for (const entity of metadata.entities) {
      let highestLevel = 'none';
      for (const role of userRoles) {
        const rolePerms = permissions[role];
        if (rolePerms && rolePerms[entity.key]) {
          const roleLevel = rolePerms[entity.key];
          if (levelPriority[roleLevel] > levelPriority[highestLevel]) {
            highestLevel = roleLevel;
          }
        }
      }
      effectivePermissions[entity.key] = highestLevel;
    }

    res.json({
      success: true,
      permissions: effectivePermissions,
    });
  } catch (error) {
    console.error('שגיאה בקבלת הרשאות המשתמש:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בקבלת הרשאות',
    });
  }
});

module.exports = router;
