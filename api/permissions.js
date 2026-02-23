// Vercel Serverless Function - /api/permissions
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');
const { writeAuditLog } = require('./_utils/auditLog');

// רמות גישה אפשריות
const ACCESS_LEVELS = ['none', 'view', 'edit', 'self'];

// כל הישויות במערכת
const ENTITIES = [
  { key: 'riders', label: 'רוכבים' },
  { key: 'vehicles', label: 'רכבים' },
  { key: 'tasks', label: 'משימות' },
  { key: 'faults', label: 'תקלות' },
  { key: 'monthly_checks', label: 'בדיקות חודשיות' },
  { key: 'maintenance', label: 'טיפולים' },
  { key: 'garages', label: 'מוסכים' },
  { key: 'insurance_claims', label: 'תביעות ביטוח' },
  { key: 'users', label: 'משתמשים' },
  { key: 'reports', label: 'דוחות' },
  { key: 'settings', label: 'הגדרות' },
  { key: 'audit_logs', label: 'לוג פעולות' },
  { key: 'donations', label: 'קופה / תרומות' },
];

// כל התפקידים במערכת
const ROLES = [
  { key: 'super_admin', label: 'מנהל על' },
  { key: 'manager', label: 'מנהל' },
  { key: 'secretary', label: 'מזכיר' },
  { key: 'logistics', label: 'לוגיסטיקה' },
  { key: 'rider', label: 'רוכב' },
  { key: 'regional_manager', label: 'מנהל אזורי' },
];

// הרשאות ברירת מחדל
const DEFAULT_PERMISSIONS = {
  super_admin: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'edit', garages: 'edit',
    insurance_claims: 'edit', users: 'edit', reports: 'edit',
    settings: 'edit', audit_logs: 'view', donations: 'edit',
  },
  manager: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'edit', garages: 'edit',
    insurance_claims: 'edit', users: 'edit', reports: 'edit',
    settings: 'edit', audit_logs: 'view', donations: 'edit',
  },
  secretary: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'view', garages: 'view',
    insurance_claims: 'edit', users: 'none', reports: 'view',
    settings: 'none', audit_logs: 'none', donations: 'none',
  },
  logistics: {
    riders: 'view', vehicles: 'view', tasks: 'edit', faults: 'edit',
    monthly_checks: 'view', maintenance: 'edit', garages: 'edit',
    insurance_claims: 'view', users: 'none', reports: 'view',
    settings: 'none', audit_logs: 'none', donations: 'none',
  },
  rider: {
    riders: 'self', vehicles: 'self', tasks: 'self', faults: 'self',
    monthly_checks: 'self', maintenance: 'self', garages: 'none',
    insurance_claims: 'none', users: 'none', reports: 'none',
    settings: 'none', audit_logs: 'none', donations: 'none',
  },
  regional_manager: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'edit', garages: 'view',
    insurance_claims: 'view', users: 'none', reports: 'view',
    settings: 'none', audit_logs: 'none', donations: 'none',
  },
};

// מיזוג entities חדשים שלא קיימים ב-Firestore עם ברירת מחדל
function mergeWithDefaults(storedPermissions) {
  const merged = { ...storedPermissions };
  for (const [role, defaults] of Object.entries(DEFAULT_PERMISSIONS)) {
    if (!merged[role]) {
      merged[role] = defaults;
    } else {
      for (const [entity, level] of Object.entries(defaults)) {
        if (merged[role][entity] === undefined) {
          merged[role][entity] = level;
        }
      }
    }
  }
  return merged;
}

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    const getRawBody = require('raw-body');
    try {
      const rawBody = await getRawBody(req);
      req.body = JSON.parse(rawBody.toString());
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

    const permissionsRef = db.collection('permissions').doc('default');

    // זיהוי הנתיב
    const urlPath = req.url.split('?')[0];
    const isMyRoute = urlPath.includes('/my');
    const isResetRoute = urlPath.includes('/reset');

    // GET /api/permissions/my - הרשאות המשתמש המחובר
    if (req.method === 'GET' && isMyRoute) {
      const doc = await permissionsRef.get();
      const permissions = doc.exists ? mergeWithDefaults(doc.data().roles) : DEFAULT_PERMISSIONS;

      // חישוב הרשאות אפקטיביות
      const levelPriority = { none: 0, self: 1, view: 2, edit: 3 };
      const effectivePermissions = {};

      for (const entity of ENTITIES) {
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

      return res.status(200).json({
        success: true,
        permissions: effectivePermissions,
      });
    }

    // POST /api/permissions/reset - איפוס לברירת מחדל
    if (req.method === 'POST' && isResetRoute) {
      if (!userRoles.includes('super_admin')) {
        return res.status(403).json({
          success: false,
          message: 'רק מנהל-על יכול לאפס הרשאות',
        });
      }

      await permissionsRef.set({
        roles: DEFAULT_PERMISSIONS,
        updatedAt: new Date(),
        updatedBy: user.id,
      });

      await writeAuditLog(db, user, { action: 'update', entityType: 'permission', entityName: 'הגדרות מערכת', description: 'הרשאות אופסו לברירת מחדל' });
      return res.status(200).json({
        success: true,
        message: 'ההרשאות אופסו לברירת מחדל',
        permissions: DEFAULT_PERMISSIONS,
      });
    }

    // GET /api/permissions - קבלת כל ההרשאות + מטא-דאטא
    if (req.method === 'GET') {
      if (!userRoles.some(r => ['super_admin', 'manager'].includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'רק מנהלים יכולים לצפות בהגדרות ההרשאות',
        });
      }

      const doc = await permissionsRef.get();
      const permissions = doc.exists ? mergeWithDefaults(doc.data().roles) : DEFAULT_PERMISSIONS;

      return res.status(200).json({
        success: true,
        permissions,
        metadata: {
          entities: ENTITIES,
          roles: ROLES,
          accessLevels: ACCESS_LEVELS.map(level => ({
            key: level,
            label: { none: 'ללא', view: 'צפייה', edit: 'עריכה', self: 'עצמי' }[level],
          })),
        },
      });
    }

    // PUT /api/permissions - עדכון הרשאות
    if (req.method === 'PUT') {
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

      // ולידציה
      for (const [role, entities] of Object.entries(permissions)) {
        if (!ROLES.find(r => r.key === role)) {
          return res.status(400).json({ success: false, message: `תפקיד לא חוקי: ${role}` });
        }
        for (const [entity, level] of Object.entries(entities)) {
          if (!ENTITIES.find(e => e.key === entity)) {
            return res.status(400).json({ success: false, message: `ישות לא חוקית: ${entity}` });
          }
          if (!ACCESS_LEVELS.includes(level)) {
            return res.status(400).json({ success: false, message: `רמת גישה לא חוקית: ${level}` });
          }
        }
      }

      // super_admin תמיד מקבל הכל
      permissions.super_admin = { ...DEFAULT_PERMISSIONS.super_admin };

      await permissionsRef.set({
        roles: permissions,
        updatedAt: new Date(),
        updatedBy: user.id,
      });

      await writeAuditLog(db, user, { action: 'update', entityType: 'permission', entityName: 'הגדרות מערכת', description: 'הרשאות עודכנו' });
      return res.status(200).json({
        success: true,
        message: 'ההרשאות עודכנו בהצלחה',
        permissions,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });

  } catch (error) {
    console.error('Permissions error:', error);

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
