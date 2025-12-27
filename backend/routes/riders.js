const express = require('express');
const router = express.Router();
const Rider = require('../models/Rider');
const { protect, authorize } = require('../middleware/auth');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/riders
// @desc    קבלת רשימת רוכבים
// @access  Private (כל המשתמשים המחוברים)
router.get('/', async (req, res) => {
  try {
    const { search, status, district, area, page = 1, limit = 50 } = req.query;

    let query = {};

    // חיפוש
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // סינון לפי סטטוס
    if (status) {
      query.riderStatus = status;
    }

    // סינון לפי מחוז/מרחב
    if (district) {
      query['region.district'] = district;
    }
    if (area) {
      query['region.area'] = area;
    }

    // אם המשתמש הוא רוכב - רק את עצמו
    if (req.user.role === 'rider' && req.user.riderId) {
      query._id = req.user.riderId;
    }

    const riders = await Rider.find(query)
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Rider.countDocuments(query);

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
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
    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // רוכב יכול לראות רק את עצמו
    if (req.user.role === 'rider' && req.user.riderId?.toString() !== rider._id.toString()) {
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
    req.body.createdBy = req.user._id;
    const rider = await Rider.create(req.body);

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
    req.body.updatedBy = req.user._id;

    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

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
    const rider = await Rider.findByIdAndDelete(req.params.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

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
