// JWT Authentication utilities for Vercel Serverless Functions
const jwt = require('jsonwebtoken');

// יצירת JWT Token
function getSignedJwtToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
}

// אימות Token והחזרת User
async function authenticateToken(req, db) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    // אימות ה-Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // שליפת המשתמש מ-Firestore
    const userDoc = await db.collection('users').doc(decoded.id).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const user = { id: userDoc.id, ...userDoc.data() };

    // בדיקת סטטוס
    if (!user.isActive) {
      throw new Error('User account is not active');
    }

    if (user.isLocked) {
      throw new Error('User account is locked');
    }

    return user;
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
}

// הרשאות ברירת מחדל
const DEFAULT_PERMISSIONS = {
  super_admin: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'edit', garages: 'edit',
    insurance_claims: 'edit', users: 'edit', reports: 'edit',
    settings: 'edit', audit_logs: 'view',
  },
  manager: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'edit', garages: 'edit',
    insurance_claims: 'edit', users: 'edit', reports: 'edit',
    settings: 'edit', audit_logs: 'view',
  },
  secretary: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'view', garages: 'view',
    insurance_claims: 'edit', users: 'none', reports: 'view',
    settings: 'none', audit_logs: 'none',
  },
  logistics: {
    riders: 'view', vehicles: 'view', tasks: 'edit', faults: 'edit',
    monthly_checks: 'view', maintenance: 'edit', garages: 'edit',
    insurance_claims: 'view', users: 'none', reports: 'view',
    settings: 'none', audit_logs: 'none',
  },
  rider: {
    riders: 'self', vehicles: 'self', tasks: 'self', faults: 'self',
    monthly_checks: 'self', maintenance: 'self', garages: 'none',
    insurance_claims: 'none', users: 'none', reports: 'none',
    settings: 'none', audit_logs: 'none',
  },
  regional_manager: {
    riders: 'edit', vehicles: 'edit', tasks: 'edit', faults: 'edit',
    monthly_checks: 'edit', maintenance: 'edit', garages: 'view',
    insurance_claims: 'view', users: 'none', reports: 'view',
    settings: 'none', audit_logs: 'none',
  },
};

const LEVEL_PRIORITY = { none: 0, self: 1, view: 2, edit: 3 };

// Cache להרשאות - 5 דקות
let permissionsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getPermissions(db) {
  const now = Date.now();
  if (permissionsCache && (now - cacheTime) < CACHE_TTL) {
    return permissionsCache;
  }
  try {
    const doc = await db.collection('permissions').doc('default').get();
    permissionsCache = doc.exists ? doc.data().roles : DEFAULT_PERMISSIONS;
    cacheTime = now;
    return permissionsCache;
  } catch (err) {
    console.error('Error loading permissions:', err);
    return DEFAULT_PERMISSIONS;
  }
}

// בדיקת הרשאות (ישנה - לצורך תאימות)
function checkAuthorization(user, allowedRoles) {
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
  const hasPermission = userRoles.some(role => allowedRoles.includes(role));
  if (!hasPermission) {
    throw new Error(`User roles [${userRoles.join(', ')}] not authorized for this action. Required: [${allowedRoles.join(', ')}]`);
  }
  return true;
}

// בדיקת הרשאות חדשה - על בסיס מערכת ההרשאות
// entity: 'riders', 'vehicles', 'tasks', 'faults', 'monthly_checks', 'maintenance', 'garages', 'users', etc.
// requiredLevel: 'view' או 'edit'
// מחזיר את רמת הגישה בפועל (none/self/view/edit)
async function checkPermission(user, db, entity, requiredLevel) {
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

  // super_admin תמיד מקבל הכל
  if (userRoles.includes('super_admin')) return 'edit';

  const permissions = await getPermissions(db);

  // חישוב הרשאה גבוהה ביותר מכל התפקידים
  let highestLevel = 'none';
  for (const role of userRoles) {
    const rolePerms = permissions[role];
    if (rolePerms && rolePerms[entity]) {
      const roleLevel = rolePerms[entity];
      if (LEVEL_PRIORITY[roleLevel] > LEVEL_PRIORITY[highestLevel]) {
        highestLevel = roleLevel;
      }
    }
  }

  // בדיקה אם רמת הגישה מספיקה
  if (LEVEL_PRIORITY[highestLevel] < LEVEL_PRIORITY[requiredLevel]) {
    throw new Error('אין לך הרשאה לבצע פעולה זו');
  }

  return highestLevel;
}

module.exports = {
  getSignedJwtToken,
  authenticateToken,
  checkAuthorization,
  checkPermission
};
