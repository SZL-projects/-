const express = require('express');
const router = express.Router();
const VehicleModel = require('../models/firestore/VehicleModel');
const { protect, authorize } = require('../middleware/auth-firebase');

// כל הנתיבים מוגנים
router.use(protect);

// @route   GET /api/vehicles
// @desc    קבלת רשימת כלים
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, type, limit = 50 } = req.query;

    let vehicles;
    let filters = {};

    // סינונים
    if (status) {
      filters.status = status;
    }
    if (type) {
      filters.type = type;
    }

    // אם יש חיפוש
    if (search) {
      vehicles = await VehicleModel.search(search, filters, parseInt(limit));
    } else {
      vehicles = await VehicleModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: vehicles.length,
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
    const vehicle = await VehicleModel.findById(req.params.id);

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
    const vehicle = await VehicleModel.create(req.body, req.user.id);

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
    const vehicle = await VehicleModel.update(req.params.id, req.body, req.user.id);

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

// @route   PATCH /api/vehicles/:id/kilometers
// @desc    עדכון קילומטראז'
// @access  Private
router.patch('/:id/kilometers', async (req, res) => {
  try {
    const { kilometers, source, notes } = req.body;

    if (!kilometers || !source) {
      return res.status(400).json({
        success: false,
        message: 'קילומטראז' ומקור הם שדות חובה'
      });
    }

    const vehicle = await VehicleModel.updateKilometers(
      req.params.id,
      kilometers,
      source,
      req.user.id,
      notes
    );

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
    await VehicleModel.delete(req.params.id);

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
