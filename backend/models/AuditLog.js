const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // מי ביצע את הפעולה
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String, // שם המשתמש (לשמירה גם אם המשתמש יימחק)

  // סוג הפעולה
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'lock', 'unlock', 'assign', 'unassign', 'approve', 'reject', 'override'],
    required: true
  },

  // על איזו ישות
  entityType: {
    type: String,
    enum: ['User', 'Rider', 'Vehicle', 'Assignment', 'Task', 'MonthlyCheck', 'Fault', 'Maintenance', 'InsuranceClaim', 'Equipment'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityName: String, // שם/תיאור הישות (לנוחות)

  // שינויים
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],

  // תיאור חופשי
  description: String,

  // מתי
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },

  // הערות נוספות
  notes: String,

  // מטא-דאטה
  metadata: {
    userAgent: String,
    method: String, // GET, POST, PUT, DELETE
    endpoint: String
  }
}, {
  timestamps: false // לא צריך timestamps כי יש לנו timestamp משלנו
});

// אינדקסים
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1 });

// TTL Index - אופציונלי: מחיקת לוגים ישנים אוטומטית אחרי X זמן
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 שנים

module.exports = mongoose.model('AuditLog', auditLogSchema);
