const express = require('express');
const router = express.Router();
const RiderModel = require('../models/firestore/RiderModel');
const { protect, authorize } = require('../middleware/auth-firebase');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/riders
// @desc    קבלת רשימת רוכבים
// @access  Private (כל המשתמשים המחוברים)
router.get('/', async (req, res) => {
  try {
    const { search, status, district, area, limit = 50 } = req.query;

    let riders;
    let filters = {};

    // סינונים
    if (status) {
      filters.riderStatus = status;
    }
    if (district) {
      filters.district = district;
    }

    // אם יש חיפוש
    if (search) {
      riders = await RiderModel.search(search, filters, parseInt(limit));
    } else {
      riders = await RiderModel.getAll(filters, parseInt(limit));
    }

    // אם המשתמש הוא רוכב - רק את עצמו
    if (req.user.role === 'rider' && req.user.riderId) {
      riders = riders.filter(r => r.id === req.user.riderId);
    }

    res.json({
      success: true,
      count: riders.length,
      riders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/riders/:id
// @desc    קבלת רוכב לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const rider = await RiderModel.findById(req.params.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // רוכב יכול לראות רק את עצמו
    if (req.user.role === 'rider' && req.user.riderId !== rider.id) {
      return res.status(403).json({
        success: false,
        message: 'אין הרשאה לצפות ברוכב זה'
      });
    }

    res.json({
      success: true,
      rider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/riders
// @desc    יצירת רוכב חדש
// @access  Private (מנהלים בלבד)
router.post('/', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const rider = await RiderModel.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      rider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/riders/:id
// @desc    עדכון רוכב
// @access  Private (מנהלים בלבד)
router.put('/:id', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const rider = await RiderModel.update(req.params.id, req.body, req.user.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    res.json({
      success: true,
      rider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/riders/:id
// @desc    מחיקת רוכב
// @access  Private (מנהל-על בלבד)
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    await RiderModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'רוכב נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
