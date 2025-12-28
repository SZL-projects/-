const express = require('express');
const router = express.Router();
const TaskModel = require('../models/firestore/TaskModel');
const { protect, authorize } = require('../middleware/auth-firebase');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/tasks
// @desc    קבלת רשימת משימות
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, priority, riderId, vehicleId, limit = 100 } = req.query;

    let tasks;
    let filters = {};

    // סינונים
    if (status) {
      filters.status = status;
    }
    if (priority) {
      filters.priority = priority;
    }
    if (riderId) {
      filters.riderId = riderId;
    }
    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }

    // אם יש חיפוש
    if (search) {
      tasks = await TaskModel.search(search, filters, parseInt(limit));
    } else {
      tasks = await TaskModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    קבלת משימה לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/tasks
// @desc    יצירת משימה חדשה
// @access  Private (מנהלים בלבד)
router.post('/', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const task = await TaskModel.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    עדכון משימה
// @access  Private (מנהלים בלבד)
router.put('/:id', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const task = await TaskModel.update(req.params.id, req.body, req.user.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    מחיקת משימה
// @access  Private (מנהל-על בלבד)
router.delete('/:id', authorize('super_admin', 'manager'), async (req, res) => {
  try {
    await TaskModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'משימה נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
