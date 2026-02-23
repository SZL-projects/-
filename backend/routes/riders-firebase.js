const express = require('express');
const router = express.Router();
const multer = require('multer');
const RiderModel = require('../models/firestore/RiderModel');
const googleDriveService = require('../services/googleDriveService');
const { protect, authorize } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { logAudit } = require('../middleware/auditLogger');

// הגדרת multer לקבלת קבצים
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// ==================== Google Drive File Operations ====================
// חשוב: נתיבים סטטיים חייבים לבוא לפני נתיבים דינמיים (:id)

// @route   GET /api/riders/list-files
// @desc    קבלת רשימת קבצים מתיקיית רוכב
// @access  Private
router.get('/list-files', async (req, res) => {
  try {
    const { folderId, riderId } = req.query;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: 'חסר מזהה תיקייה'
      });
    }

    const files = await googleDriveService.listFiles(folderId);

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Error listing rider files:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בקבלת רשימת הקבצים'
    });
  }
});

// @route   POST /api/riders/upload-file
// @desc    העלאת קובץ לתיקיית רוכב
// @access  Private (מנהלים בלבד)
router.post('/upload-file', checkPermission('riders', 'edit'), upload.single('file'), async (req, res) => {
  try {
    const { folderId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'לא נבחר קובץ להעלאה'
      });
    }

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: 'חסר מזהה תיקייה'
      });
    }

    const uploadedFile = await googleDriveService.uploadFile(
      file.originalname,
      file.buffer,
      folderId,
      file.mimetype
    );

    res.json({
      success: true,
      message: 'הקובץ הועלה בהצלחה',
      file: uploadedFile
    });
  } catch (error) {
    console.error('Error uploading rider file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בהעלאת הקובץ'
    });
  }
});

// @route   POST /api/riders/rename-file
// @desc    שינוי שם קובץ בתיקיית רוכב
// @access  Private (מנהלים בלבד)
router.post('/rename-file', checkPermission('riders', 'edit'), async (req, res) => {
  try {
    const { fileId, newName } = req.body;

    if (!fileId || !newName) {
      return res.status(400).json({
        success: false,
        message: 'מזהה קובץ ושם חדש הם שדות חובה'
      });
    }

    const updatedFile = await googleDriveService.renameFile(fileId, newName.trim());

    res.json({
      success: true,
      message: 'שם הקובץ שונה בהצלחה',
      data: updatedFile
    });
  } catch (error) {
    console.error('Error renaming rider file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בשינוי שם הקובץ'
    });
  }
});

// @route   DELETE /api/riders/delete-file
// @desc    מחיקת קובץ מתיקיית רוכב
// @access  Private (מנהלים בלבד)
router.delete('/delete-file', checkPermission('riders', 'edit'), async (req, res) => {
  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'חסר מזהה קובץ'
      });
    }

    await googleDriveService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'הקובץ נמחק בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting rider file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה במחיקת הקובץ'
    });
  }
});

// ==================== End Google Drive File Operations ====================

// @route   GET /api/riders
// @desc    קבלת רשימת רוכבים
// @access  Private (כל המשתמשים המחוברים)
router.get('/', checkPermission('riders', 'view'), async (req, res) => {
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

    // אם הרשאת "עצמי" - רק את עצמו
    if (req.permissionLevel === 'self' && req.user.riderId) {
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
router.get('/:id', checkPermission('riders', 'view'), async (req, res) => {
  try {
    const rider = await RiderModel.findById(req.params.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // אם הרשאת "עצמי" - רק את עצמו
    if (req.permissionLevel === 'self' && req.user.riderId !== rider.id) {
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
router.post('/', checkPermission('riders', 'edit'), async (req, res) => {
  try {
    console.log('Creating rider with data:', req.body);
    const rider = await RiderModel.create(req.body, req.user.id);

    const riderName = `${req.body.firstName} ${req.body.lastName}`.trim();
    await logAudit(req, {
      action: 'create',
      entityType: 'rider',
      entityId: rider.id,
      entityName: riderName,
      description: `רוכב חדש נוצר: ${riderName}`
    });

    res.status(201).json({
      success: true,
      rider
    });
  } catch (error) {
    console.error('Error creating rider:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/riders/:id
// @desc    עדכון רוכב
// @access  Private (מנהלים בלבד)
router.put('/:id', checkPermission('riders', 'edit'), async (req, res) => {
  try {
    const existingRider = await RiderModel.findById(req.params.id);
    const rider = await RiderModel.update(req.params.id, req.body, req.user.id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    const riderName = existingRider
      ? `${existingRider.firstName} ${existingRider.lastName}`.trim()
      : `${rider.firstName} ${rider.lastName}`.trim();
    await logAudit(req, {
      action: 'update',
      entityType: 'rider',
      entityId: req.params.id,
      entityName: riderName,
      changes: req.body,
      description: `רוכב עודכן: ${riderName}`
    });

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
router.delete('/:id', checkPermission('riders', 'edit'), async (req, res) => {
  try {
    const rider = await RiderModel.findById(req.params.id);
    await RiderModel.delete(req.params.id);

    const riderName = rider ? `${rider.firstName} ${rider.lastName}`.trim() : req.params.id;
    await logAudit(req, {
      action: 'delete',
      entityType: 'rider',
      entityId: req.params.id,
      entityName: riderName,
      description: `רוכב נמחק: ${riderName}`
    });

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

// ==================== Google Drive Endpoints ====================

// @route   POST /api/riders/:id/create-folder
// @desc    יצירת מבנה תיקיות בדרייב לרוכב
// @access  Private (מנהלים בלבד)
router.post('/:id/create-folder', checkPermission('riders', 'edit'), async (req, res) => {
  try {
    const riderId = req.params.id;

    // קבלת נתוני הרוכב
    const rider = await RiderModel.findById(riderId);
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    const riderName = `${rider.firstName} ${rider.lastName}`.trim();
    if (!riderName) {
      return res.status(400).json({
        success: false,
        message: 'שם הרוכב חסר'
      });
    }

    // יצירת מבנה התיקיות
    const folderData = await googleDriveService.createRiderFolderStructure(riderName);

    // שמירת נתוני התיקיות ברוכב
    await RiderModel.update(riderId, { driveFolderData: folderData }, req.user.id);

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

module.exports = router;
