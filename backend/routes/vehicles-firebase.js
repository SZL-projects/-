const express = require('express');
const router = express.Router();
const multer = require('multer');
const VehicleModel = require('../models/firestore/VehicleModel');
const RiderModel = require('../models/firestore/RiderModel');
const googleDriveService = require('../services/googleDriveService');
const { protect, authorize } = require('../middleware/auth-firebase');

// הגדרת multer לטיפול בקבצים
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

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

// ==================== Google Drive Endpoints (Static routes MUST come before /:id) ====================

// @route   GET /api/vehicles/list-files
// @desc    קבלת רשימת קבצים בתיקייה
// @access  Private
router.get('/list-files', async (req, res) => {
  try {
    const { folderId } = req.query;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה תיקייה הוא שדה חובה'
      });
    }

    const files = await googleDriveService.listFiles(folderId);

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בקבלת רשימת קבצים'
    });
  }
});

// @route   GET /api/vehicles/drive-structure
// @desc    קבלת מבנה התיקיות הנוכחי בדרייב
// @access  Private (מנהלים בלבד)
router.get('/drive-structure', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const structure = await googleDriveService.getDriveFolderStructure();

    res.json({
      success: true,
      data: structure
    });
  } catch (error) {
    console.error('Error getting Drive structure:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בקבלת מבנה הדרייב'
    });
  }
});

// @route   DELETE /api/vehicles/delete-file
// @desc    מחיקת קובץ מ-Drive
// @access  Private (מנהלים בלבד)
router.delete('/delete-file', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה קובץ הוא שדה חובה'
      });
    }

    await googleDriveService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'קובץ נמחק בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה במחיקת קובץ'
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
        message: 'קילומטראז ומקור הם שדות חובה'
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

// ==================== Google Drive Endpoints ====================

// @route   POST /api/vehicles/create-folder
// @desc    יצירת מבנה תיקיות ב-Drive עבור כלי
// @access  Private (מנהלים בלבד)
router.post('/create-folder', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { vehicleNumber, vehicleId } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'מספר כלי הוא שדה חובה'
      });
    }

    const folderData = await googleDriveService.createVehicleFolderStructure(vehicleNumber);

    // שמירת נתוני התיקיות בכלי אם סופק vehicleId
    if (vehicleId) {
      await VehicleModel.update(vehicleId, { driveFolderData: folderData }, req.user.id);
    }

    res.json({
      success: true,
      message: 'מבנה תיקיות נוצר בהצלחה',
      data: folderData
    });
  } catch (error) {
    console.error('Error creating folder structure:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה ביצירת מבנה תיקיות'
    });
  }
});

// @route   POST /api/vehicles/create-rider-folder
// @desc    יצירת תיקיית רוכב בתוך תיקיית הביטוחים
// @access  Private (מנהלים בלבד)
router.post('/create-rider-folder', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { riderName, insuranceFolderId } = req.body;

    if (!riderName || !insuranceFolderId) {
      return res.status(400).json({
        success: false,
        message: 'שם רוכב ומזהה תיקיית ביטוחים הם שדות חובה'
      });
    }

    const riderFolderData = await googleDriveService.createRiderFolder(riderName, insuranceFolderId);

    res.json({
      success: true,
      message: 'תיקיית רוכב נוצרה בהצלחה',
      data: riderFolderData
    });
  } catch (error) {
    console.error('Error creating rider folder:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה ביצירת תיקיית רוכב'
    });
  }
});

// @route   POST /api/vehicles/upload-file
// @desc    העלאת קובץ ל-Drive
// @access  Private
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const { folderId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'לא הועלה קובץ'
      });
    }

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה תיקייה הוא שדה חובה'
      });
    }

    const fileData = await googleDriveService.uploadFile(
      req.file.originalname,
      req.file.buffer,
      folderId,
      req.file.mimetype
    );

    res.json({
      success: true,
      message: 'קובץ הועלה בהצלחה',
      data: fileData
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בהעלאת קובץ'
    });
  }
});

// @route   POST /api/vehicles/create-rider-folder-structure
// @desc    יצירת מבנה תיקיות עצמאי לרוכב (תחת תיקיית "רוכבים")
// @access  Private (מנהלים בלבד)
router.post('/create-rider-folder-structure', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { riderName, riderId } = req.body;

    if (!riderName) {
      return res.status(400).json({
        success: false,
        message: 'שם רוכב הוא שדה חובה'
      });
    }

    const folderData = await googleDriveService.createRiderFolderStructure(riderName);

    // שמירת נתוני התיקיות ברוכב אם סופק riderId
    if (riderId) {
      await RiderModel.update(riderId, { driveFolderData: folderData }, req.user.id);
    }

    res.json({
      success: true,
      message: 'מבנה תיקיות רוכב נוצר בהצלחה',
      data: folderData
    });
  } catch (error) {
    console.error('Error creating rider folder structure:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה ביצירת מבנה תיקיות רוכב'
    });
  }
});

// @route   POST /api/vehicles/refresh-drive-folders
// @desc    ריענון וסידור מבנה התיקיות בדרייב
// @access  Private (מנהל-על בלבד)
router.post('/refresh-drive-folders', authorize('super_admin', 'manager'), async (req, res) => {
  try {
    // קבלת כל הכלים והרוכבים מהמערכת
    const vehicles = await VehicleModel.getAll({}, 1000);
    const riders = await RiderModel.getAll({}, 1000);

    console.log(`Refreshing Drive folders for ${vehicles.length} vehicles and ${riders.length} riders`);

    const results = await googleDriveService.refreshDriveFolders(vehicles, riders);

    // עדכון נתוני התיקיות בכלים שנוצרו להם תיקיות חדשות
    for (const vehicle of vehicles) {
      if (vehicle.internalNumber && !vehicle.driveFolderData?.mainFolderId) {
        try {
          const folderData = await googleDriveService.createVehicleFolderStructure(vehicle.internalNumber);
          await VehicleModel.update(vehicle.id, { driveFolderData: folderData }, req.user.id);
        } catch (err) {
          console.error(`Error updating vehicle ${vehicle.id} folder data:`, err);
        }
      }
    }

    // עדכון נתוני התיקיות ברוכבים שנוצרו להם תיקיות חדשות
    for (const rider of riders) {
      const riderName = `${rider.firstName} ${rider.lastName}`.trim();
      if (riderName && !rider.driveFolderData?.mainFolderId) {
        try {
          const folderData = await googleDriveService.createRiderFolderStructure(riderName);
          await RiderModel.update(rider.id, { driveFolderData: folderData }, req.user.id);
        } catch (err) {
          console.error(`Error updating rider ${rider.id} folder data:`, err);
        }
      }
    }

    res.json({
      success: true,
      message: 'ריענון תיקיות הדרייב הושלם בהצלחה',
      data: results
    });
  } catch (error) {
    console.error('Error refreshing Drive folders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בריענון תיקיות הדרייב'
    });
  }
});

// @route   POST /api/vehicles/:id/assign
// @desc    שיוך כלי לרוכב
// @access  Private (מנהלים בלבד)
router.post('/:id/assign', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const { riderId } = req.body;
    const vehicleId = req.params.id;

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'נא לספק מזהה רוכב'
      });
    }

    // בדיקה שהכלי קיים
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'כלי לא נמצא'
      });
    }

    // בדיקה שהרוכב קיים
    const { db } = require('../config/firebase');
    const COLLECTIONS = require('../config/collections');
    const riderDoc = await db.collection(COLLECTIONS.RIDERS).doc(riderId).get();
    if (!riderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // בדיקה אם הכלי כבר משויך לרוכב אחר
    if (vehicle.assignedTo && vehicle.assignedTo !== riderId) {
      return res.status(400).json({
        success: false,
        message: 'כלי כבר משויך לרוכב אחר. יש לבטל את השיוך הקיים תחילה.'
      });
    }

    // עדכון הכלי - הוספת שיוך
    const updatedVehicle = await VehicleModel.update(vehicleId, {
      assignedTo: riderId,
      status: 'assigned',
      assignedAt: new Date()
    }, req.user.id);

    // עדכון הרוכב - הוספת שיוך
    await db.collection(COLLECTIONS.RIDERS).doc(riderId).update({
      assignedVehicle: vehicleId,
      assignmentStatus: 'assigned',
      assignedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'כלי שוייך בהצלחה לרוכב',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Error assigning vehicle:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בשיוך כלי'
    });
  }
});

// @route   POST /api/vehicles/:id/unassign
// @desc    ביטול שיוך כלי מרוכב
// @access  Private (מנהלים בלבד)
router.post('/:id/unassign', authorize('super_admin', 'manager', 'secretary'), async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // בדיקה שהכלי קיים
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'כלי לא נמצא'
      });
    }

    if (!vehicle.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'כלי לא משויך לרוכב'
      });
    }

    const riderId = vehicle.assignedTo;

    // עדכון הכלי - הסרת שיוך
    const updatedVehicle = await VehicleModel.update(vehicleId, {
      assignedTo: null,
      status: 'waiting_for_rider',
      assignedAt: null,
      unassignedAt: new Date()
    }, req.user.id);

    // עדכון הרוכב - הסרת שיוך
    const { db } = require('../config/firebase');
    const COLLECTIONS = require('../config/collections');

    const riderDoc = await db.collection(COLLECTIONS.RIDERS).doc(riderId).get();
    if (riderDoc.exists) {
      await db.collection(COLLECTIONS.RIDERS).doc(riderId).update({
        assignedVehicle: null,
        assignmentStatus: 'unassigned',
        assignedAt: null,
        updatedAt: new Date(),
        updatedBy: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'שיוך הכלי בוטל בהצלחה',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Error unassigning vehicle:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בביטול שיוך כלי'
    });
  }
});

module.exports = router;
