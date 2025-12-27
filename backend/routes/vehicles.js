const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');

// כל הנתיבים מוגנים
router.use(protect);

// @route   GET /api/vehicles
// @desc    קבלת רשימת כלים
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, type, page = 1, limit = 50 } = req.query;

    let query = {};

    // חיפוש
    if (search) {
      query.$or = [
        { licensePlate: { $regex: search, $options: 'i' } },
        { internalNumber: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    // סינון לפי סטטוס
    if (status) {
      query.status = status;
    }

    // סינון לפי סוג
    if (type) {
      query.type = type;
    }

    const vehicles = await Vehicle.find(query)
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Vehicle.countDocuments(query);

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/vehicles/:id
// @desc    קבלת כלי לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'כלי לא נמצא'
      });
    }

    res.json({
      success: true,
      vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/vehicles
// @desc    יצירת כלי חדש
// @access  Private (מנהלים בלבד)
router.post('/', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const vehicle = await Vehicle.create(req.body);

    res.status(201).json({
      success: true,
      vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    עדכון כלי
// @access  Private (מנהלים בלבד)
router.put('/:id', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    req.body.updatedBy = req.user._id;

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'כלי לא נמצא'
      });
    }

    res.json({
      success: true,
      vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    מחיקת כלי
// @access  Private (מנהל-על בלבד)
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'כלי לא נמצא'
      });
    }

    res.json({
      success: true,
      message: 'כלי נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
