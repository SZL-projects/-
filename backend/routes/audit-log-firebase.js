const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const AuditLogModel = require('../models/firestore/AuditLogModel');

// כל הנתיבים דורשים אימות
router.use(protect);

// @route   GET /api/audit-logs
// @desc    קבלת לוגים עם פילטרים
// @access  Private (audit_logs view)
router.get('/', checkPermission('audit_logs', 'view'), async (req, res) => {
  try {
    const { userId, action, entityType, search, dateFrom, dateTo, limit = 100 } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const logs = await AuditLogModel.getAll(filters, parseInt(limit) || 100);

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/audit-logs/users
// @desc    רשימת משתמשים ייחודיים מהלוגים
// @access  Private (audit_logs view)
router.get('/users', checkPermission('audit_logs', 'view'), async (req, res) => {
  try {
    const users = await AuditLogModel.getDistinctUsers();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
