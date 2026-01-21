const express = require('express');
const router = express.Router();
const Rider = require('../models/Rider');
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/riders
// @desc    קבלת רשימת רוכבים
// @access  Private (כל המשתמשים המחוברים)
router.get('/', async (req, res) => {
  try {
    const { search, status, district, area, page = 1, limit = 50 } = req.query;

    // ולידציה והגבלת פרמטרים למניעת עומס
    const pageNum = Math.max(1, Math.min(parseInt(page) || 1, 1000));
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 100)); // מקסימום 100 רשומות

    let query = {};

    // חיפוש
    if (search) {
      const searchStr = String(search).trim().substring(0, 100); // הגבלת אורך חיפוש
      query.$or = [
        { firstName: { $regex: searchStr, $options: 'i' } },
        { lastName: { $regex: searchStr, $options: 'i' } },
        { idNumber: { $regex: searchStr, $options: 'i' } },
        { phone: { $regex: searchStr, $options: 'i' } }
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

    // שימוש ב-lean() לביצועים משופרים - מחזיר אובייקטים רגילים במקום מסמכי Mongoose
    const riders = await Rider.find(query)
      .select('-__v')
      .lean()
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .sort({ createdAt: -1 });

    // ספירה עם הגבלה לביצועים טובים יותר
    const count = await Rider.countDocuments(query);

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
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
    // שימוש ב-lean() לביצועים משופרים
    const rider = await Rider.findById(req.params.id).lean();

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

    // אם הרוכב משויך לכלי, לעדכן גם את הכלי
    if (req.body.assignmentStatus === 'assigned' && req.body.assignedVehicleId) {
      const vehicle = await Vehicle.findById(req.body.assignedVehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'הכלי המשויך לא נמצא'
        });
      }

      // בדיקה שהכלי לא משויך כבר
      if (vehicle.isAssigned && vehicle.assignedRider) {
        return res.status(400).json({
          success: false,
          message: 'הכלי כבר משויך לרוכב אחר'
        });
      }
    }

    const rider = await Rider.create(req.body);

    // עדכון הכלי אם יש שיוך
    if (req.body.assignmentStatus === 'assigned' && req.body.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(req.body.assignedVehicleId, {
        isAssigned: true,
        assignedRider: rider._id,
        assignmentDate: new Date(),
        $push: {
          assignmentHistory: {
            rider: rider._id,
            assignedAt: new Date(),
            assignedBy: req.user._id
          }
        }
      });
    }

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

    const oldRider = await Rider.findById(req.params.id);
    if (!oldRider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // טיפול בשינוי שיוך כלי
    const oldVehicleId = oldRider.assignedVehicleId?.toString();
    const newVehicleId = req.body.assignedVehicleId?.toString();
    const newAssignmentStatus = req.body.assignmentStatus;

    // אם משנים כלי או מבטלים שיוך
    if (oldVehicleId && (oldVehicleId !== newVehicleId || newAssignmentStatus === 'unassigned')) {
      // לשחרר את הכלי הישן
      await Vehicle.findByIdAndUpdate(oldVehicleId, {
        isAssigned: false,
        assignedRider: null,
        $push: {
          assignmentHistory: {
            rider: oldRider._id,
            unassignedAt: new Date(),
            unassignedBy: req.user._id,
            reason: 'עדכון שיוך רוכב'
          }
        }
      });
    }

    // אם משויכים לכלי חדש
    if (newAssignmentStatus === 'assigned' && newVehicleId && oldVehicleId !== newVehicleId) {
      const vehicle = await Vehicle.findById(newVehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'הכלי המשויך לא נמצא'
        });
      }

      // בדיקה שהכלי לא משויך כבר
      if (vehicle.isAssigned && vehicle.assignedRider && vehicle.assignedRider.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'הכלי כבר משויך לרוכב אחר'
        });
      }

      // עדכון הכלי החדש
      await Vehicle.findByIdAndUpdate(newVehicleId, {
        isAssigned: true,
        assignedRider: oldRider._id,
        assignmentDate: new Date(),
        $push: {
          assignmentHistory: {
            rider: oldRider._id,
            assignedAt: new Date(),
            assignedBy: req.user._id
          }
        }
      });
    }

    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

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
    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // לשחרר את הכלי המשויך אם יש
    if (rider.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(rider.assignedVehicleId, {
        isAssigned: false,
        assignedRider: null,
        $push: {
          assignmentHistory: {
            rider: rider._id,
            unassignedAt: new Date(),
            unassignedBy: req.user._id,
            reason: 'מחיקת רוכב'
          }
        }
      });
    }

    await Rider.findByIdAndDelete(req.params.id);

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
