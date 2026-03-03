const express = require('express');
const router = express.Router();
const InsuranceClaimModel = require('../models/firestore/InsuranceClaimModel');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { logAudit, buildChanges } = require('../middleware/auditLogger');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/insurance-claims
// @desc    קבלת רשימת תביעות ביטוח
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, eventType, vehicleId, riderId, insuranceCompany, limit = 100 } = req.query;

    let claims;
    let filters = {};

    if (status) filters.status = status;
    if (eventType) filters.eventType = eventType;
    if (vehicleId) filters.vehicleId = vehicleId;
    if (riderId) filters.riderId = riderId;
    if (insuranceCompany) filters.insuranceCompany = insuranceCompany;

    if (search) {
      claims = await InsuranceClaimModel.search(search, filters, parseInt(limit));
    } else {
      claims = await InsuranceClaimModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: claims.length,
      claims
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/insurance-claims/statistics
// @desc    קבלת סטטיסטיקות תביעות
// @access  Private (מנהלים בלבד)
router.get('/statistics', checkPermission('insurance_claims', 'view'), async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const statistics = await InsuranceClaimModel.getStatistics(vehicleId || null);

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/insurance-claims/vehicle/:vehicleId
// @desc    קבלת תביעות לפי כלי
// @access  Private
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const claims = await InsuranceClaimModel.getByVehicle(req.params.vehicleId, parseInt(limit));

    res.json({
      success: true,
      count: claims.length,
      claims
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/insurance-claims/rider/:riderId
// @desc    קבלת תביעות לפי רוכב
// @access  Private
router.get('/rider/:riderId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const claims = await InsuranceClaimModel.getByRider(req.params.riderId, parseInt(limit));

    res.json({
      success: true,
      count: claims.length,
      claims
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/insurance-claims/:id
// @desc    קבלת תביעה לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const claim = await InsuranceClaimModel.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'תביעה לא נמצאה'
      });
    }

    res.json({
      success: true,
      claim
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/insurance-claims
// @desc    יצירת תביעת ביטוח חדשה
// @access  Private
router.post('/', async (req, res) => {
  try {
    // ולידציה
    if (!req.body.vehicleId) {
      return res.status(400).json({ success: false, message: 'כלי הוא שדה חובה' });
    }
    if (!req.body.eventType) {
      return res.status(400).json({ success: false, message: 'סוג אירוע הוא שדה חובה' });
    }
    if (!req.body.eventDate) {
      return res.status(400).json({ success: false, message: 'תאריך אירוע הוא שדה חובה' });
    }
    if (!req.body.description) {
      return res.status(400).json({ success: false, message: 'תיאור האירוע הוא שדה חובה' });
    }
    if (!req.body.insuranceCompany) {
      return res.status(400).json({ success: false, message: 'חברת ביטוח היא שדה חובה' });
    }

    const claim = await InsuranceClaimModel.create(req.body, req.user.id);

    await logAudit(req, { action: 'create', entityType: 'insurance_claim', entityId: claim.id, entityName: claim.claimNumber || 'תביעה חדשה', description: `תביעת ביטוח חדשה נוצרה: ${claim.claimNumber || ''}` });

    res.status(201).json({
      success: true,
      message: 'תביעת ביטוח נוצרה בהצלחה',
      claim
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/insurance-claims/:id
// @desc    עדכון תביעה
// @access  Private (מנהלים בלבד)
router.put('/:id', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    const existingClaim = await InsuranceClaimModel.findById(req.params.id);
    const claim = await InsuranceClaimModel.update(req.params.id, req.body, req.user.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'תביעה לא נמצאה'
      });
    }

    const diff = buildChanges(existingClaim, req.body);
    await logAudit(req, { action: 'update', entityType: 'insurance_claim', entityId: req.params.id, entityName: claim.claimNumber, changes: diff, description: `תביעת ביטוח עודכנה: ${claim.claimNumber || ''}` });

    res.json({
      success: true,
      message: 'תביעה עודכנה בהצלחה',
      claim
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/insurance-claims/:id/submit
// @desc    הגשת תביעה
// @access  Private (מנהלים בלבד)
router.put('/:id/submit', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    const claim = await InsuranceClaimModel.update(req.params.id, {
      ...req.body,
      status: 'submitted',
      submittedAt: new Date()
    }, req.user.id);

    if (!claim) {
      return res.status(404).json({ success: false, message: 'תביעה לא נמצאה' });
    }

    await logAudit(req, { action: 'status_change', entityType: 'insurance_claim', entityId: req.params.id, entityName: claim.claimNumber, description: `תביעת ביטוח הוגשה: ${claim.claimNumber || ''}` });

    res.json({
      success: true,
      message: 'תביעה הוגשה בהצלחה',
      claim
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/insurance-claims/:id/approve
// @desc    אישור תביעה
// @access  Private (מנהלים בלבד)
router.put('/:id/approve', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    if (!req.body.approvedAmount && req.body.approvedAmount !== 0) {
      return res.status(400).json({
        success: false,
        message: 'סכום מאושר הוא שדה חובה לאישור תביעה'
      });
    }

    const claim = await InsuranceClaimModel.update(req.params.id, {
      ...req.body,
      status: 'approved',
      approvedAmount: req.body.approvedAmount,
      approvedAt: new Date()
    }, req.user.id);

    if (!claim) {
      return res.status(404).json({ success: false, message: 'תביעה לא נמצאה' });
    }

    await logAudit(req, { action: 'status_change', entityType: 'insurance_claim', entityId: req.params.id, entityName: claim.claimNumber, description: `תביעת ביטוח אושרה: ${claim.claimNumber || ''}, סכום: ${req.body.approvedAmount}` });

    res.json({
      success: true,
      message: 'תביעה אושרה בהצלחה',
      claim
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/insurance-claims/:id/reject
// @desc    דחיית תביעה
// @access  Private (מנהלים בלבד)
router.put('/:id/reject', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    if (!req.body.rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'סיבת דחייה היא שדה חובה'
      });
    }

    const claim = await InsuranceClaimModel.update(req.params.id, {
      status: 'rejected',
      rejectionReason: req.body.rejectionReason,
      rejectedAt: new Date()
    }, req.user.id);

    if (!claim) {
      return res.status(404).json({ success: false, message: 'תביעה לא נמצאה' });
    }

    await logAudit(req, { action: 'status_change', entityType: 'insurance_claim', entityId: req.params.id, entityName: claim.claimNumber, description: `תביעת ביטוח נדחתה: ${claim.claimNumber || ''}, סיבה: ${req.body.rejectionReason}` });

    res.json({
      success: true,
      message: 'תביעה נדחתה',
      claim
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/insurance-claims/:id/close
// @desc    סגירת תביעה
// @access  Private (מנהלים בלבד)
router.put('/:id/close', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    const claim = await InsuranceClaimModel.update(req.params.id, {
      ...req.body,
      status: 'closed',
      closedAt: new Date(),
      closedBy: req.user.id
    }, req.user.id);

    if (!claim) {
      return res.status(404).json({ success: false, message: 'תביעה לא נמצאה' });
    }

    await logAudit(req, { action: 'status_change', entityType: 'insurance_claim', entityId: req.params.id, entityName: claim.claimNumber, description: `תביעת ביטוח נסגרה: ${claim.claimNumber || ''}` });

    res.json({
      success: true,
      message: 'תביעה נסגרה בהצלחה',
      claim
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/insurance-claims/:id
// @desc    מחיקת תביעה
// @access  Private (מנהל-על בלבד)
router.delete('/:id', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    const claim = await InsuranceClaimModel.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'תביעה לא נמצאה'
      });
    }

    await InsuranceClaimModel.delete(req.params.id);

    await logAudit(req, { action: 'delete', entityType: 'insurance_claim', entityId: req.params.id, entityName: claim.claimNumber, description: `תביעת ביטוח נמחקה: ${claim.claimNumber || ''}` });

    res.json({
      success: true,
      message: 'תביעה נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
