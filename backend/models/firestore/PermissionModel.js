const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

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
];

// כל התפקידים במערכת
const ROLES = [
  { key: 'super_admin', label: 'מנהל על' },
  { key: 'manager', label: 'מנהל' },
  { key: 'secretary', label: 'מזכירה' },
  { key: 'logistics', label: 'לוגיסטיקה' },
  { key: 'rider', label: 'רוכב' },
  { key: 'regional_manager', label: 'מנהל אזורי' },
];

// הרשאות ברירת מחדל
const DEFAULT_PERMISSIONS = {
  super_admin: {
    riders: 'edit',
    vehicles: 'edit',
    tasks: 'edit',
    faults: 'edit',
    monthly_checks: 'edit',
    maintenance: 'edit',
    garages: 'edit',
    insurance_claims: 'edit',
    users: 'edit',
    reports: 'edit',
    settings: 'edit',
    audit_logs: 'view',
  },
  manager: {
    riders: 'edit',
    vehicles: 'edit',
    tasks: 'edit',
    faults: 'edit',
    monthly_checks: 'edit',
    maintenance: 'edit',
    garages: 'edit',
    insurance_claims: 'edit',
    users: 'edit',
    reports: 'edit',
    settings: 'edit',
    audit_logs: 'view',
  },
  secretary: {
    riders: 'edit',
    vehicles: 'edit',
    tasks: 'edit',
    faults: 'edit',
    monthly_checks: 'edit',
    maintenance: 'view',
    garages: 'view',
    insurance_claims: 'edit',
    users: 'none',
    reports: 'view',
    settings: 'none',
    audit_logs: 'none',
  },
  logistics: {
    riders: 'view',
    vehicles: 'view',
    tasks: 'edit',
    faults: 'edit',
    monthly_checks: 'view',
    maintenance: 'edit',
    garages: 'edit',
    insurance_claims: 'view',
    users: 'none',
    reports: 'view',
    settings: 'none',
    audit_logs: 'none',
  },
  rider: {
    riders: 'self',
    vehicles: 'self',
    tasks: 'self',
    faults: 'self',
    monthly_checks: 'self',
    maintenance: 'self',
    garages: 'none',
    insurance_claims: 'none',
    users: 'none',
    reports: 'none',
    settings: 'none',
    audit_logs: 'none',
  },
  regional_manager: {
    riders: 'edit',
    vehicles: 'edit',
    tasks: 'edit',
    faults: 'edit',
    monthly_checks: 'edit',
    maintenance: 'edit',
    garages: 'view',
    insurance_claims: 'view',
    users: 'none',
    reports: 'view',
    settings: 'none',
    audit_logs: 'none',
  },
};

// קאש בזיכרון
let permissionsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 דקות

class PermissionModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.PERMISSIONS);
    this.docId = 'default';
  }

  // ניקוי קאש
  clearCache() {
    permissionsCache = null;
    cacheTimestamp = 0;
  }

  // קבלת ההרשאות הנוכחיות (עם קאש)
  async getPermissions() {
    // בדיקת קאש
    if (permissionsCache && (Date.now() - cacheTimestamp) < CACHE_TTL) {
      return permissionsCache;
    }

    try {
      const doc = await this.collection.doc(this.docId).get();

      if (!doc.exists) {
        // אם אין מסמך - יוצרים עם ברירת מחדל
        await this.resetToDefaults();
        permissionsCache = DEFAULT_PERMISSIONS;
        cacheTimestamp = Date.now();
        return DEFAULT_PERMISSIONS;
      }

      const data = doc.data();
      permissionsCache = data.roles;
      cacheTimestamp = Date.now();
      return data.roles;
    } catch (error) {
      console.error('שגיאה בטעינת הרשאות:', error);
      // במקרה של שגיאה - משתמשים בברירת מחדל
      return DEFAULT_PERMISSIONS;
    }
  }

  // עדכון הרשאות
  async updatePermissions(newPermissions, updatedBy) {
    try {
      // ולידציה
      for (const [role, entities] of Object.entries(newPermissions)) {
        if (!ROLES.find(r => r.key === role)) {
          throw new Error(`תפקיד לא חוקי: ${role}`);
        }
        for (const [entity, level] of Object.entries(entities)) {
          if (!ENTITIES.find(e => e.key === entity)) {
            throw new Error(`ישות לא חוקית: ${entity}`);
          }
          if (!ACCESS_LEVELS.includes(level)) {
            throw new Error(`רמת גישה לא חוקית: ${level}`);
          }
        }
      }

      // super_admin תמיד מקבל הכל
      newPermissions.super_admin = { ...DEFAULT_PERMISSIONS.super_admin };

      await this.collection.doc(this.docId).set({
        roles: newPermissions,
        updatedAt: new Date(),
        updatedBy: updatedBy || null,
      });

      // ניקוי קאש
      this.clearCache();

      return newPermissions;
    } catch (error) {
      throw error;
    }
  }

  // איפוס לברירת מחדל
  async resetToDefaults(updatedBy) {
    try {
      await this.collection.doc(this.docId).set({
        roles: DEFAULT_PERMISSIONS,
        updatedAt: new Date(),
        updatedBy: updatedBy || 'system',
      });

      this.clearCache();
      return DEFAULT_PERMISSIONS;
    } catch (error) {
      throw error;
    }
  }

  // בדיקת הרשאה למשתמש
  async checkAccess(userRoles, entity, requiredLevel) {
    const permissions = await this.getPermissions();

    // נורמליזציה - תמיכה גם ב-role בודד וגם במערך
    const roles = Array.isArray(userRoles) ? userRoles : [userRoles];

    // בדיקה אם super_admin - תמיד מקבל הכל
    if (roles.includes('super_admin')) {
      return { allowed: true, level: 'edit' };
    }

    // מצא את רמת הגישה הגבוהה ביותר מבין כל התפקידים
    const levelPriority = { none: 0, self: 1, view: 2, edit: 3 };
    let highestLevel = 'none';

    for (const role of roles) {
      const rolePermissions = permissions[role];
      if (rolePermissions && rolePermissions[entity]) {
        const roleLevel = rolePermissions[entity];
        if (levelPriority[roleLevel] > levelPriority[highestLevel]) {
          highestLevel = roleLevel;
        }
      }
    }

    // בדיקה אם רמת הגישה מספיקה
    const requiredPriority = levelPriority[requiredLevel] || 0;
    const userPriority = levelPriority[highestLevel] || 0;

    return {
      allowed: userPriority >= requiredPriority,
      level: highestLevel,
    };
  }

  // קבלת מטא-דאטא (ישויות, תפקידים, רמות)
  getMetadata() {
    return {
      entities: ENTITIES,
      roles: ROLES,
      accessLevels: ACCESS_LEVELS.map(level => ({
        key: level,
        label: {
          none: 'ללא',
          view: 'צפייה',
          edit: 'עריכה',
          self: 'עצמי',
        }[level],
      })),
    };
  }
}

module.exports = new PermissionModel();
