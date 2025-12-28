const express = require('express');
const router = express.Router();
const MonthlyCheckModel = require('../models/firestore/MonthlyCheckModel');
const { protect, authorize } = require('../middleware/auth-firebase');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/monthly-checks
// @desc    קבלת רשימת בקרות חודשיות
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, vehicleId, riderId, limit = 100 } = req.query;

    let checks;
    let filters = {};

    // סינונים
    if (status) {
      filters.status = status;
    }
    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }
    if (riderId) {
      filters.riderId = riderId;
    }

    // אם יש חיפוש
    if (search) {
      checks = await MonthlyCheckModel.search(search, filters, parseInt(limit));
    } else {
      checks = await MonthlyCheckModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: checks.length,
      monthlyChecks: checks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/monthly-checks/:id
// @desc    קבלת בקרה חודשית לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const check = await MonthlyCheckModel.findById(req.params.id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'בקרה חודשית לא נמצאה'
      });
    }

    res.json({
      success: true,
      monthlyCheck: check
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/monthly-checks
// @desc    יצירת בקרה חודשית חדשה
// @access  Private
router.post('/', async (req, res) => {
  try {
    const check = await MonthlyCheckModel.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      monthlyCheck: check
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/monthly-checks/:id
// @desc    עדכון בקרה חודשית
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const check = await MonthlyCheckModel.update(req.params.id, req.body, req.user.id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'בקרה חודשית לא נמצאה'
      });
    }

    res.json({
      success: true,
      monthlyCheck: check
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/monthly-checks/:id
// @desc    מחיקת בקרה חודשית
// @access  Private (מנהל-על בלבד)
router.delete('/:id', authorize('super_admin', 'manager'), async (req, res) => {
  try {
    await MonthlyCheckModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'בקרה חודשית נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
