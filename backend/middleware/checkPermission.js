const PermissionModel = require('../models/firestore/PermissionModel');

/**
 * מידלוור לבדיקת הרשאות
 * @param {string} entity - הישות (riders, vehicles, tasks...)
 * @param {string} requiredLevel - רמת הגישה הנדרשת (view, edit)
 */
const checkPermission = (entity, requiredLevel = 'view') => {
  return async (req, res, next) => {
    try {
      // נורמליזציה - תמיכה גם ב-role בודד וגם במערך roles
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];

      const { allowed, level } = await PermissionModel.checkAccess(
        userRoles,
        entity,
        requiredLevel
      );

      if (!allowed) {
        const levelLabels = {
          none: 'ללא גישה',
          view: 'צפייה',
          edit: 'עריכה',
          self: 'עצמי',
        };
        return res.status(403).json({
          success: false,
          message: `אין הרשאה לבצע פעולה זו. נדרש: ${levelLabels[requiredLevel]}, קיים: ${levelLabels[level]}`,
        });
      }

      // שמירת רמת הגישה ב-request לשימוש בראוט
      req.permissionLevel = level;

      next();
    } catch (error) {
      console.error('שגיאה בבדיקת הרשאות:', error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בבדיקת הרשאות',
      });
    }
  };
};

module.exports = { checkPermission };
