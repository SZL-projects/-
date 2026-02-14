const AuditLogModel = require('../models/firestore/AuditLogModel');

/**
 * רישום פעולה בלוג הפעילות (fire-and-forget)
 * שגיאות לא מונעות response - הלוג אינו קריטי
 *
 * @param {Object} req - Express request object (must have req.user)
 * @param {Object} options
 * @param {string} options.action - סוג הפעולה: create, update, delete, login, logout, status_change, assign, unassign
 * @param {string} options.entityType - סוג הישות: vehicle, rider, fault, task, maintenance, monthly_check, insurance_claim, user, permission
 * @param {string} [options.entityId] - מזהה הישות
 * @param {string} [options.entityName] - שם/תיאור הישות
 * @param {Object} [options.changes] - שינויים שבוצעו
 * @param {string} [options.description] - תיאור טקסטואלי של הפעולה
 */
function logAudit(req, { action, entityType, entityId, entityName, changes, description }) {
  // fire-and-forget - לא חוסם את ה-response
  AuditLogModel.log({
    userId: req.user?.id || req.user?._id || null,
    userName: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username : 'מערכת',
    action,
    entityType,
    entityId,
    entityName,
    changes,
    description,
    metadata: {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  }).catch(err => {
    console.error('Audit log error (non-blocking):', err.message);
  });
}

module.exports = { logAudit };
