// שדות שיש להתעלם מהם בחישוב שינויים
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
 * כתיבת רשומה ללוג פעילות ב-Firestore (fire-and-forget - לא חוסם את הבקשה)
 */
function writeAuditLog(db, user, { action, entityType, entityId, entityName, changes, description, metadata }) {
  db.collection('audit_logs').add({
    userId: user?.id || user?._id || null,
    userName: user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'משתמש'
      : 'מערכת',
    action,
    entityType,
    entityId: entityId || null,
    entityName: entityName || null,
    changes: changes || null,
    description: description || null,
    metadata: metadata || null,
    timestamp: new Date(),
    createdAt: new Date(),
  }).catch(err => console.error('Audit log write error:', err.message));
}

/**
 * רישום לוג ללא user object (לפעולות מערכת / שליחת מיילים) - fire-and-forget
 */
function writeSystemAuditLog(db, { action, entityType, entityId, entityName, changes, description, metadata }) {
  db.collection('audit_logs').add({
    userId: null,
    userName: 'מערכת',
    action,
    entityType,
    entityId: entityId || null,
    entityName: entityName || null,
    changes: changes || null,
    description: description || null,
    metadata: metadata || null,
    timestamp: new Date(),
    createdAt: new Date(),
  }).catch(err => console.error('System audit log write error:', err.message));
}

module.exports = { writeAuditLog, writeSystemAuditLog, buildChanges };
