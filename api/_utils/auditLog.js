/**
 * כתיבת רשומה ללוג פעילות ב-Firestore
 */
async function writeAuditLog(db, user, { action, entityType, entityId, entityName, description }) {
  try {
    await db.collection('audit_logs').add({
      userId: user?.id || user?._id || null,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'משתמש' : 'מערכת',
      action,
      entityType,
      entityId: entityId || null,
      entityName: entityName || null,
      description: description || null,
      timestamp: new Date(),
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Audit log write error:', err.message);
  }
}

module.exports = { writeAuditLog };
