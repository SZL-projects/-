const AuditLogModel = require('../models/firestore/AuditLogModel');

// שדות שיש להתעלם מהם בעת חישוב שינויים
const IGNORE_FIELDS = [
  'updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'id', '_id',
  'timestamp', '__v', 'password', 'token'
];

/**
 * חישוב הפרש בין נתונים ישנים לחדשים
 * מחזיר: { fieldName: { old: '...', new: '...' } }
 */
function buildChanges(before, after) {
  if (!before || !after) return after || null;

  const changes = {};

  for (const key of Object.keys(after)) {
    if (IGNORE_FIELDS.includes(key)) continue;

    const oldVal = before[key];
    const newVal = after[key];

    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);

    if (oldStr !== newStr) {
      changes[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * רישום פעולה בלוג הפעילות - דורש req (fire-and-forget)
 * שגיאות לא מונעות response - הלוג אינו קריטי
 */
async function logAudit(req, { action, entityType, entityId, entityName, changes, description, metadata }) {
  try {
    await AuditLogModel.log({
      userId: req.user?.id || req.user?._id || null,
      userName: req.user
        ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username || 'משתמש'
        : 'מערכת',
      action,
      entityType,
      entityId,
      entityName,
      changes,
      description,
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...(metadata || {}),
      },
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

/**
 * רישום פעולה בלוג הפעילות - ללא req (לפעולות מערכת / schedulers / שליחת מיילים)
 * fire-and-forget - שגיאות לא נזרקות
 */
async function logAuditDirect({ userId, userName, action, entityType, entityId, entityName, changes, description, metadata }) {
  try {
    await AuditLogModel.log({
      userId: userId || null,
      userName: userName || 'מערכת',
      action,
      entityType,
      entityId: entityId || null,
      entityName: entityName || null,
      changes: changes || null,
      description: description || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error('Audit log (direct) error:', err.message);
  }
}

module.exports = { logAudit, logAuditDirect, buildChanges };
