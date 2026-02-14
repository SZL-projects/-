const express = require('express');
const router = express.Router();
const FaultModel = require('../models/firestore/FaultModel');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { logAudit } = require('../middleware/auditLogger');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/faults
// @desc    קבלת רשימת תקלות
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, severity, vehicleId, riderId, limit = 100 } = req.query;

    let faults;
    let filters = {};

    // סינונים
    if (status) {
      filters.status = status;
    }
    if (severity) {
      filters.severity = severity;
    }
    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }
    if (riderId) {
      filters.riderId = riderId;
    }

    // אם יש חיפוש
    if (search) {
      faults = await FaultModel.search(search, filters, parseInt(limit));
    } else {
      faults = await FaultModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: faults.length,
      faults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/faults/:id
// @desc    קבלת תקלה לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const fault = await FaultModel.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'תקלה לא נמצאה'
      });
    }

    res.json({
      success: true,
      fault
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/faults
// @desc    יצירת תקלה חדשה
// @access  Private (כולם יכולים לדווח תקלה)
router.post('/', async (req, res) => {
  try {
    const fault = await FaultModel.create(req.body, req.user.id);

    logAudit(req, {
      action: 'create',
      entityType: 'fault',
      entityId: fault.id,
      entityName: fault.description?.substring(0, 40) || 'תקלה חדשה',
      description: 'תקלה חדשה נוצרה'
    });

    res.status(201).json({
      success: true,
      fault
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/faults/:id
// @desc    עדכון תקלה
// @access  Private (מנהלים בלבד)
router.put('/:id', checkPermission('faults', 'edit'), async (req, res) => {
  try {
    const fault = await FaultModel.update(req.params.id, req.body, req.user.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'תקלה לא נמצאה'
      });
    }

    logAudit(req, {
      action: 'update',
      entityType: 'fault',
      entityId: fault.id,
      entityName: fault.description?.substring(0, 40) || 'תקלה',
      description: 'תקלה עודכנה'
    });

    res.json({
      success: true,
      fault
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/faults/:id
// @desc    מחיקת תקלה
// @access  Private (מנהל-על בלבד)
router.delete('/:id', checkPermission('faults', 'edit'), async (req, res) => {
  try {
    const existingFault = await FaultModel.findById(req.params.id);
    await FaultModel.delete(req.params.id);

    logAudit(req, {
      action: 'delete',
      entityType: 'fault',
      entityId: req.params.id,
      entityName: existingFault?.description?.substring(0, 40) || 'תקלה',
      description: 'תקלה נמחקה'
    });

    res.json({
      success: true,
      message: 'תקלה נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
