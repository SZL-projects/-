const express = require('express');
const router = express.Router();
const multer = require('multer');
const MaintenanceModel = require('../models/firestore/MaintenanceModel');
const VehicleModel = require('../models/firestore/VehicleModel');
const googleDriveService = require('../services/googleDriveService');
const { protect, authorize } = require('../middleware/auth-firebase');

// הגדרת multer לטיפול בקבצים
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/maintenance
// @desc    קבלת רשימת טיפולים
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status, maintenanceType, vehicleId, riderId, paidBy, limit = 100 } = req.query;

    let maintenances;
    let filters = {};

    // סינונים
    if (status) {
      filters.status = status;
    }
    if (maintenanceType) {
      filters.maintenanceType = maintenanceType;
    }
    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }
    if (riderId) {
      filters.riderId = riderId;
    }
    if (paidBy) {
      filters.paidBy = paidBy;
    }

    // אם יש חיפוש
    if (search) {
      maintenances = await MaintenanceModel.search(search, filters, parseInt(limit));
    } else {
      maintenances = await MaintenanceModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/maintenance/statistics
// @desc    קבלת סטטיסטיקות טיפולים
// @access  Private (מנהלים בלבד)
router.get('/statistics', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const statistics = await MaintenanceModel.getStatistics(vehicleId || null);

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

// @route   GET /api/maintenance/vehicle/:vehicleId
// @desc    קבלת טיפולים לפי כלי
// @access  Private
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const maintenances = await MaintenanceModel.getByVehicle(req.params.vehicleId, parseInt(limit));

    res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/maintenance/rider/:riderId
// @desc    קבלת טיפולים לפי רוכב
// @access  Private
router.get('/rider/:riderId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const maintenances = await MaintenanceModel.getByRider(req.params.riderId, parseInt(limit));

    res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/maintenance/fault/:faultId
// @desc    קבלת טיפולים לפי תקלה
// @access  Private
router.get('/fault/:faultId', async (req, res) => {
  try {
    const maintenances = await MaintenanceModel.getByFault(req.params.faultId);

    res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/maintenance/:id
// @desc    קבלת טיפול לפי ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const maintenance = await MaintenanceModel.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'טיפול לא נמצא'
      });
    }

    res.json({
      success: true,
      maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/maintenance
// @desc    יצירת טיפול חדש
// @access  Private (כולם יכולים לדווח טיפול)
router.post('/', async (req, res) => {
  try {
    // ולידציה בסיסית
    if (!req.body.vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'כלי הוא שדה חובה'
      });
    }
    if (!req.body.description) {
      return res.status(400).json({
        success: false,
        message: 'תיאור הטיפול הוא שדה חובה'
      });
    }

    const maintenance = await MaintenanceModel.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'טיפול נוצר בהצלחה',
      maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/maintenance/:id
// @desc    עדכון טיפול
// @access  Private (מנהלים בלבד)
router.put('/:id', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const maintenance = await MaintenanceModel.update(req.params.id, req.body, req.user.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'טיפול לא נמצא'
      });
    }

    res.json({
      success: true,
      message: 'טיפול עודכן בהצלחה',
      maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/maintenance/:id/complete
// @desc    סגירת טיפול (סימון כהושלם)
// @access  Private (מנהלים בלבד)
router.put('/:id/complete', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    // ולידציה - בדיקה שיש עלות כוללת
    if (!req.body.costs || req.body.costs.totalCost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'עלות כוללת היא שדה חובה בסגירת טיפול'
      });
    }

    const updateData = {
      ...req.body,
      status: 'completed',
      completedAt: new Date(),
      completedBy: req.user.id
    };

    const maintenance = await MaintenanceModel.update(req.params.id, updateData, req.user.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'טיפול לא נמצא'
      });
    }

    res.json({
      success: true,
      message: 'טיפול נסגר בהצלחה',
      maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/maintenance/:id
// @desc    מחיקת טיפול
// @access  Private (מנהל-על בלבד)
router.delete('/:id', authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const maintenance = await MaintenanceModel.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'טיפול לא נמצא'
      });
    }

    await MaintenanceModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'טיפול נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/maintenance/upload-file
// @desc    העלאת קובץ (קבלה/הצעת מחיר) לטיפול
// @access  Private
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const { vehicleId, maintenanceId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'לא הועלה קובץ'
      });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה רכב הוא שדה חובה'
      });
    }

    // מצא את הרכב כדי לקבל את תיקיית הקבצים שלו
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'רכב לא נמצא'
      });
    }

    // בדיקה אם יש תיקיית טיפולים לרכב, אם לא - יצירה
    let maintenanceFolderId = vehicle.folders?.maintenance;

    if (!maintenanceFolderId && vehicle.driveFolderId) {
      // יצירת תיקיית טיפולים בתוך תיקיית הרכב
      const maintenanceFolder = await googleDriveService.createFolder('טיפולים', vehicle.driveFolderId);
      maintenanceFolderId = maintenanceFolder.id;

      // עדכון הרכב עם התיקייה החדשה
      await VehicleModel.update(vehicleId, {
        folders: {
          ...vehicle.folders,
          maintenance: maintenanceFolderId
        }
      }, req.user.id);
    }

    // אם עדיין אין תיקייה - העלה לתיקייה הראשית של הרכב
    const targetFolderId = maintenanceFolderId || vehicle.driveFolderId;

    if (!targetFolderId) {
      return res.status(400).json({
        success: false,
        message: 'לא נמצאה תיקיית Google Drive עבור הרכב'
      });
    }

    // העלאת הקובץ
    const fileData = await googleDriveService.uploadFile(
      req.file.originalname,
      req.file.buffer,
      targetFolderId,
      req.file.mimetype
    );

    res.json({
      success: true,
      message: 'קובץ הועלה בהצלחה',
      file: fileData
    });
  } catch (error) {
    console.error('Error uploading maintenance file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בהעלאת קובץ'
    });
  }
});

module.exports = router;
