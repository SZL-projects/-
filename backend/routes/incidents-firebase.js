const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db } = require('../config/firebase');
const COLLECTIONS = require('../config/collections');
const googleDriveService = require('../services/googleDriveService');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { logAudit } = require('../middleware/auditLogger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// מוצא או יוצר תיקיית "אירועים" ב-Drive
async function getIncidentsFolderId() {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) throw new Error('Google Drive לא מחובר');
  const folder = await googleDriveService.findOrCreateFolder('אירועים', rootFolderId);
  return folder.id;
}

router.use(protect);

// יצירת מספר אירוע אוטומטי
async function generateIncidentNumber() {
  const year = new Date().getFullYear();
  const snapshot = await db.collection(COLLECTIONS.INCIDENTS)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  const lastNum = snapshot.empty ? 0 : (snapshot.docs[0].data().incidentNumber?.split('-')[2] || 0);
  const nextNum = parseInt(lastNum) + 1;
  return `INC-${year}-${String(nextNum).padStart(4, '0')}`;
}

function isRiderOnly(user) {
  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  return roles.every(r => r === 'rider');
}

// @route   GET /api/incidents
router.get('/', async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;

    let query = db.collection(COLLECTIONS.INCIDENTS);

    // רוכב רואה רק אירועים שהוא יצר
    if (isRiderOnly(req.user)) {
      query = query.where('createdBy', '==', req.user.id);
    }

    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('createdAt', 'desc').limit(parseInt(limit)).get();
    const incidents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, count: incidents.length, incidents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
    }

    const incident = { id: doc.id, ...doc.data() };

    // רוכב רואה רק אירועים שלו
    if (isRiderOnly(req.user) && incident.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'אין הרשאה' });
    }

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/incidents
router.post('/', async (req, res) => {
  try {
    const incidentNumber = await generateIncidentNumber();

    const data = {
      ...req.body,
      incidentNumber,
      status: 'new',
      createdBy: req.user.id,
      createdByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(COLLECTIONS.INCIDENTS).add(data);
    const incident = { id: docRef.id, ...data };

    await logAudit(req, {
      action: 'create',
      entityType: 'incident',
      entityId: docRef.id,
      entityName: incidentNumber,
      description: `דיווח אירוע חדש: ${incidentNumber}`,
    });

    res.status(201).json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/incidents/:id
router.put('/:id', async (req, res) => {
  try {
    const docRef = db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
    }

    const existing = doc.data();

    // רוכב יכול לערוך רק אירועים שלו
    if (isRiderOnly(req.user) && existing.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'אין הרשאה לערוך אירוע זה' });
    }

    const updateData = { ...req.body, updatedAt: new Date(), updatedBy: req.user.id };
    await docRef.update(updateData);

    res.json({ success: true, incident: { id: req.params.id, ...existing, ...updateData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/incidents/:id/upload-photo
// @desc    העלאת תמונה לאירוע ב-Google Drive
// @access  Private
router.post('/:id/upload-photo', upload.single('file'), async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'לא הועלה קובץ' });
    }

    const folderId = await getIncidentsFolderId();
    const incidentNumber = doc.data().incidentNumber || req.params.id;
    const fileName = `${incidentNumber}_${req.file.originalname}`;

    const fileData = await googleDriveService.uploadFile(
      fileName,
      req.file.buffer,
      folderId,
      req.file.mimetype
    );

    // שמירת ה-URL בדוקומנט האירוע
    const existing = doc.data();
    const photos = existing.photos || [];
    photos.push({ fileId: fileData.id, name: fileName, url: fileData.webViewLink || '' });

    await db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id).update({
      photos,
      updatedAt: new Date(),
    });

    res.json({ success: true, file: fileData });
  } catch (error) {
    console.error('Error uploading incident photo:', error);
    res.status(500).json({ success: false, message: error.message || 'שגיאה בהעלאת קובץ' });
  }
});

// @route   DELETE /api/incidents/:id
router.delete('/:id', checkPermission('insurance_claims', 'edit'), async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
    }

    await db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id).delete();

    res.json({ success: true, message: 'אירוע נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
