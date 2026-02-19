const express = require('express');
const router = express.Router();
const multer = require('multer');
const DonationModel = require('../models/firestore/DonationModel');
const googleDriveService = require('../services/googleDriveService');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { logAudit } = require('../middleware/auditLogger');

// הגדרת multer לטיפול בקבצים
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/donations
// @desc    קבלת רשימת תרומות
// @access  Private
router.get('/', checkPermission('donations', 'view'), async (req, res) => {
  try {
    const { search, paymentMethod, riderId, type, limit = 100 } = req.query;

    let donations;
    let filters = {};

    if (type) {
      filters.type = type;
    }
    if (paymentMethod) {
      filters.paymentMethod = paymentMethod;
    }
    if (riderId) {
      filters.riderId = riderId;
    }

    if (search) {
      donations = await DonationModel.search(search, filters, parseInt(limit));
    } else {
      donations = await DonationModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/donations/statistics
// @desc    קבלת סטטיסטיקות תרומות
// @access  Private
router.get('/statistics', checkPermission('donations', 'view'), async (req, res) => {
  try {
    const statistics = await DonationModel.getStatistics();

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

// @route   GET /api/donations/rider/:riderId
// @desc    קבלת תרומות לפי רוכב
// @access  Private
router.get('/rider/:riderId', checkPermission('donations', 'view'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const donations = await DonationModel.getByRider(req.params.riderId, parseInt(limit));

    res.json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/donations/:id
// @desc    קבלת תרומה לפי ID
// @access  Private
router.get('/:id', checkPermission('donations', 'view'), async (req, res) => {
  try {
    const donation = await DonationModel.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'תרומה לא נמצאה'
      });
    }

    res.json({
      success: true,
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/donations
// @desc    יצירת תרומה חדשה
// @access  Private
router.post('/', checkPermission('donations', 'edit'), async (req, res) => {
  try {
    const entryType = req.body.type || 'donation';
    if (entryType === 'donation' && !req.body.riderId) {
      return res.status(400).json({
        success: false,
        message: 'רוכב הוא שדה חובה'
      });
    }
    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'סכום חייב להיות גדול מאפס'
      });
    }

    const donation = await DonationModel.create(req.body, req.user.id);

    logAudit(req, {
      action: 'create',
      entityType: 'donation',
      entityId: donation.id,
      entityName: donation.donationNumber || 'תרומה חדשה',
      description: `תרומה חדשה נוצרה: ${donation.donationNumber}`
    });

    res.status(201).json({
      success: true,
      message: 'תרומה נוצרה בהצלחה',
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/donations/:id
// @desc    עדכון תרומה
// @access  Private
router.put('/:id', checkPermission('donations', 'edit'), async (req, res) => {
  try {
    const donation = await DonationModel.update(req.params.id, req.body, req.user.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'תרומה לא נמצאה'
      });
    }

    logAudit(req, {
      action: 'update',
      entityType: 'donation',
      entityId: req.params.id,
      entityName: donation.donationNumber || req.params.id,
      description: `תרומה עודכנה: ${donation.donationNumber || req.params.id}`
    });

    res.json({
      success: true,
      message: 'תרומה עודכנה בהצלחה',
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/donations/:id
// @desc    מחיקת תרומה
// @access  Private
router.delete('/:id', checkPermission('donations', 'edit'), async (req, res) => {
  try {
    const donation = await DonationModel.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'תרומה לא נמצאה'
      });
    }

    await DonationModel.delete(req.params.id);

    logAudit(req, {
      action: 'delete',
      entityType: 'donation',
      entityId: req.params.id,
      entityName: donation.donationNumber || req.params.id,
      description: `תרומה נמחקה: ${donation.donationNumber || req.params.id}`
    });

    res.json({
      success: true,
      message: 'תרומה נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/donations/upload-file
// @desc    העלאת קובץ לתרומה (קבלה/אישור)
// @access  Private
router.post('/upload-file', checkPermission('donations', 'edit'), upload.single('file'), async (req, res) => {
  try {
    const { donationId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'לא הועלה קובץ'
      });
    }

    // תמיד להעלות לתיקיית "תרומות" קבועה ב-Drive
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '186mat7V_XgO02xkmIqjQXeZDs26S1SFY';
    let targetFolderId;
    try {
      const donationsFolder = await googleDriveService.findOrCreateFolder('תרומות', rootFolderId);
      targetFolderId = donationsFolder.id;
    } catch (e) {
      targetFolderId = rootFolderId;
    }

    // העלאת הקובץ ל-Google Drive
    const fileData = await googleDriveService.uploadFile(
      req.file.originalname,
      req.file.buffer,
      targetFolderId,
      req.file.mimetype
    );

    // אם יש מזהה תרומה - עדכון רשימת המסמכים
    if (donationId) {
      const donation = await DonationModel.findById(donationId);
      if (donation) {
        const documents = donation.documents || [];
        documents.push({
          fileId: fileData.id,
          filename: fileData.name,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          webViewLink: fileData.webViewLink,
          uploadDate: new Date(),
          uploadedBy: req.user.id
        });
        await DonationModel.update(donationId, { documents }, req.user.id);
      }
    }

    logAudit(req, {
      action: 'create',
      entityType: 'donation',
      entityId: donationId || 'upload',
      entityName: req.file.originalname,
      description: `קובץ תרומה הועלה: ${req.file.originalname}`
    });

    res.json({
      success: true,
      message: 'קובץ הועלה בהצלחה',
      file: fileData
    });
  } catch (error) {
    console.error('Error uploading donation file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בהעלאת קובץ'
    });
  }
});

module.exports = router;
