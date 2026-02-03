const express = require('express');
const router = express.Router();
const GarageModel = require('../models/firestore/GarageModel');
const { protect, authorize } = require('../middleware/auth-firebase');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/garages
// @desc    קבלת רשימת מוסכים
// @access  Private (כולם יכולים לראות)
router.get('/', async (req, res) => {
  try {
    const { search, includeInactive } = req.query;

    let garages;
    const filters = {
      includeInactive: includeInactive === 'true'
    };

    if (search) {
      garages = await GarageModel.search(search, filters);
    } else {
      garages = await GarageModel.getAll(filters);
    }

    res.json({
      success: true,
      count: garages.length,
      garages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/garages/compare-prices
// @desc    השוואת מחירים בין מוסכים
// @access  Private (מנהלים בלבד)
router.get('/compare-prices', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { maintenanceType } = req.query;
    const comparison = await GarageModel.comparePrices(maintenanceType || null);

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/garages/:id
// @desc    קבלת מוסך לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const garage = await GarageModel.findById(req.params.id);

    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'מוסך לא נמצא'
      });
    }

    res.json({
      success: true,
      garage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/garages/:id/statistics
// @desc    קבלת סטטיסטיקות מוסך לפי סוג טיפול
// @access  Private (מנהלים בלבד)
router.get('/:id/statistics', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const garage = await GarageModel.findById(req.params.id);

    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'מוסך לא נמצא'
      });
    }

    const statistics = await GarageModel.getStatisticsByType(req.params.id);

    res.json({
      success: true,
      garage,
      statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/garages
// @desc    יצירת מוסך חדש
// @access  Private (כולם יכולים להוסיף מוסך)
router.post('/', async (req, res) => {
  try {
    // ולידציה בסיסית
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'שם המוסך הוא שדה חובה'
      });
    }

    const garage = await GarageModel.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'מוסך נוצר בהצלחה',
      garage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/garages/:id
// @desc    עדכון מוסך
// @access  Private (מנהלים בלבד)
router.put('/:id', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const garage = await GarageModel.update(req.params.id, req.body, req.user.id);

    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'מוסך לא נמצא'
      });
    }

    res.json({
      success: true,
      message: 'מוסך עודכן בהצלחה',
      garage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/garages/:id
// @desc    מחיקת מוסך (סימון כלא פעיל)
// @access  Private (מנהלים בלבד)
router.delete('/:id', authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const garage = await GarageModel.findById(req.params.id);

    if (!garage) {
      return res.status(404).json({
        success: false,
        message: 'מוסך לא נמצא'
      });
    }

    await GarageModel.delete(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'מוסך הוסר בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
