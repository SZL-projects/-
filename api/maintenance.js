// Vercel Serverless Function - /api/maintenance (all maintenance endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');
const googleDriveService = require('./services/googleDriveService');
const getRawBody = require('raw-body');
const Busboy = require('busboy');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT/PATCH requests (except multipart/form-data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body && !req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const rawBody = await getRawBody(req);
      const bodyText = rawBody.toString();
      req.body = bodyText && bodyText.trim() !== '' ? JSON.parse(bodyText) : {};
    } catch (e) {
      console.error('Body parsing error:', e.message);
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();

    // Initialize Google Drive service with Firestore
    googleDriveService.setFirestore(db);
    await googleDriveService.initialize();

    const user = await authenticateToken(req, db);

    const url = req.url.split('?')[0];
    const maintenanceId = extractIdFromUrl(req.url, 'maintenance');

    // ==================== Special Routes ====================

    // GET /api/maintenance/statistics - סטטיסטיקות טיפולים
    if (url.endsWith('/statistics') && req.method === 'GET') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId } = req.query;

      let query = db.collection('maintenance');

      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }

      const snapshot = await query.get();
      const maintenances = snapshot.docs.map(doc => doc.data());

      // חישוב סטטיסטיקות
      const totalCount = maintenances.length;
      const completedCount = maintenances.filter(m => m.status === 'completed').length;
      const pendingCount = maintenances.filter(m => m.status === 'pending').length;
      const inProgressCount = maintenances.filter(m => m.status === 'in_progress').length;

      const completedMaintenances = maintenances.filter(m => m.status === 'completed' && m.costs?.totalCost);
      const totalCost = completedMaintenances.reduce((sum, m) => sum + (m.costs?.totalCost || 0), 0);
      const averageCost = completedMaintenances.length > 0
        ? Math.round(totalCost / completedMaintenances.length)
        : 0;

      // קיבוץ לפי סוג טיפול
      const byType = {};
      maintenances.forEach(m => {
        const type = m.maintenanceType || 'other';
        if (!byType[type]) {
          byType[type] = { count: 0, totalCost: 0 };
        }
        byType[type].count++;
        if (m.costs?.totalCost) {
          byType[type].totalCost += m.costs.totalCost;
        }
      });

      return res.json({
        success: true,
        statistics: {
          totalCount,
          completedCount,
          pendingCount,
          inProgressCount,
          totalCost,
          averageCost,
          byType
        }
      });
    }

    // GET /api/maintenance/vehicle/:vehicleId - טיפולים לפי כלי
    if (url.includes('/vehicle/') && req.method === 'GET') {
      const match = url.match(/\/vehicle\/([^/]+)/);
      const vehicleId = match ? match[1] : null;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי חסר'
        });
      }

      const { limit = 50 } = req.query;
      const limitNum = Math.min(parseInt(limit), 200);

      const snapshot = await db.collection('maintenance')
        .where('vehicleId', '==', vehicleId)
        .orderBy('createdAt', 'desc')
        .limit(limitNum)
        .get();

      const maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return res.json({
        success: true,
        count: maintenances.length,
        maintenances
      });
    }

    // GET /api/maintenance/rider/:riderId - טיפולים לפי רוכב
    if (url.includes('/rider/') && req.method === 'GET') {
      const match = url.match(/\/rider\/([^/]+)/);
      const riderId = match ? match[1] : null;

      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה רוכב חסר'
        });
      }

      const { limit = 50 } = req.query;
      const limitNum = Math.min(parseInt(limit), 200);

      const snapshot = await db.collection('maintenance')
        .where('riderId', '==', riderId)
        .orderBy('createdAt', 'desc')
        .limit(limitNum)
        .get();

      const maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return res.json({
        success: true,
        count: maintenances.length,
        maintenances
      });
    }

    // GET /api/maintenance/fault/:faultId - טיפולים לפי תקלה
    if (url.includes('/fault/') && req.method === 'GET') {
      const match = url.match(/\/fault\/([^/]+)/);
      const faultId = match ? match[1] : null;

      if (!faultId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה תקלה חסר'
        });
      }

      const snapshot = await db.collection('maintenance')
        .where('faultId', '==', faultId)
        .get();

      const maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return res.json({
        success: true,
        count: maintenances.length,
        maintenances
      });
    }

    // POST /api/maintenance/upload-file - העלאת קובץ לטיפול
    if (url.endsWith('/upload-file') && req.method === 'POST') {
      return new Promise(async (resolve, reject) => {
        try {
          console.log('Upload maintenance file request received');

          const rawBody = await getRawBody(req, {
            length: req.headers['content-length'],
            limit: '10mb'
          });

          const bufferStream = Readable.from(rawBody);
          const busboy = Busboy({ headers: req.headers });

          let fileBuffer = null;
          let fileName = '';
          let mimeType = '';
          let vehicleId = '';
          let maintenanceId = '';
          let fileReceived = false;

          busboy.on('file', (fieldname, file, info) => {
            try {
              fileName = Buffer.from(info.filename, 'latin1').toString('utf8');
            } catch (e) {
              fileName = info.filename;
            }
            mimeType = info.mimeType;
            fileReceived = true;

            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
              fileBuffer = Buffer.concat(chunks);
            });
          });

          busboy.on('field', (fieldname, value) => {
            if (fieldname === 'vehicleId') vehicleId = value;
            if (fieldname === 'maintenanceId') maintenanceId = value;
          });

          busboy.on('finish', async () => {
            try {
              if (!fileReceived || !fileBuffer) {
                res.status(400).json({
                  success: false,
                  message: 'לא הועלה קובץ'
                });
                return reject(new Error('No file uploaded'));
              }

              if (!vehicleId) {
                res.status(400).json({
                  success: false,
                  message: 'מזהה רכב הוא שדה חובה'
                });
                return reject(new Error('No vehicleId provided'));
              }

              // מציאת הכלי וקבלת תיקיית הטיפולים שלו
              const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
              if (!vehicleDoc.exists) {
                res.status(404).json({
                  success: false,
                  message: 'רכב לא נמצא'
                });
                return reject(new Error('Vehicle not found'));
              }

              const vehicleData = vehicleDoc.data();
              let maintenanceFolderId = vehicleData.folders?.maintenance;

              // יצירת תיקיית טיפולים אם לא קיימת
              if (!maintenanceFolderId && vehicleData.driveFolderData?.mainFolderId) {
                const maintenanceFolder = await googleDriveService.createFolder(
                  'טיפולים',
                  vehicleData.driveFolderData.mainFolderId
                );
                maintenanceFolderId = maintenanceFolder.id;

                // עדכון הכלי עם התיקייה החדשה
                await db.collection('vehicles').doc(vehicleId).update({
                  'folders.maintenance': maintenanceFolderId,
                  updatedAt: new Date()
                });
              }

              const targetFolderId = maintenanceFolderId || vehicleData.driveFolderData?.mainFolderId;

              if (!targetFolderId) {
                res.status(400).json({
                  success: false,
                  message: 'לא נמצאה תיקיית Google Drive עבור הרכב'
                });
                return reject(new Error('No Drive folder found'));
              }

              // העלאת הקובץ
              const fileData = await googleDriveService.uploadFile(
                fileName,
                fileBuffer,
                targetFolderId,
                mimeType
              );

              res.json({
                success: true,
                message: 'קובץ הועלה בהצלחה',
                file: fileData
              });

              resolve();
            } catch (error) {
              console.error('Error in busboy finish handler:', error);
              res.status(500).json({
                success: false,
                message: error.message
              });
              reject(error);
            }
          });

          busboy.on('error', (error) => {
            console.error('Busboy error:', error);
            res.status(500).json({
              success: false,
              message: 'שגיאה בעיבוד הקובץ: ' + error.message
            });
            reject(error);
          });

          bufferStream.pipe(busboy);
        } catch (error) {
          console.error('Error setting up busboy:', error);
          res.status(500).json({
            success: false,
            message: 'שגיאה באתחול העלאת הקובץ: ' + error.message
          });
          reject(error);
        }
      });
    }

    // PUT /api/maintenance/:id/complete - סגירת טיפול
    if (maintenanceId && url.includes('/complete') && req.method === 'PUT') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      // ולידציה - בדיקה שיש עלות כוללת
      if (!req.body.costs || req.body.costs.totalCost === undefined) {
        return res.status(400).json({
          success: false,
          message: 'עלות כוללת היא שדה חובה בסגירת טיפול'
        });
      }

      const maintenanceRef = db.collection('maintenance').doc(maintenanceId);
      const doc = await maintenanceRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'טיפול לא נמצא'
        });
      }

      const updateData = {
        ...req.body,
        status: 'completed',
        completedAt: new Date(),
        completedBy: user.id,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await maintenanceRef.update(updateData);
      const updatedDoc = await maintenanceRef.get();

      return res.json({
        success: true,
        message: 'טיפול נסגר בהצלחה',
        maintenance: { id: updatedDoc.id, ...updatedDoc.data() }
      });
    }

    // ==================== CRUD Operations ====================

    // Single maintenance operations by ID
    if (maintenanceId && !url.includes('/vehicle/') && !url.includes('/rider/') && !url.includes('/fault/') && !url.includes('/statistics') && !url.includes('/complete') && !url.includes('/upload-file')) {
      const maintenanceRef = db.collection('maintenance').doc(maintenanceId);
      const doc = await maintenanceRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'טיפול לא נמצא'
        });
      }

      if (req.method === 'GET') {
        return res.json({
          success: true,
          maintenance: { id: doc.id, ...doc.data() }
        });
      }

      if (req.method === 'PUT') {
        checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await maintenanceRef.update(updateData);
        const updatedDoc = await maintenanceRef.get();

        return res.json({
          success: true,
          message: 'טיפול עודכן בהצלחה',
          maintenance: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin', 'manager']);

        await maintenanceRef.delete();

        return res.json({
          success: true,
          message: 'טיפול נמחק בהצלחה'
        });
      }
    }

    // Collection operations
    if (req.method === 'GET') {
      const { search, status, maintenanceType, vehicleId, riderId, paidBy, garageId, limit = 100 } = req.query;
      const limitNum = Math.min(parseInt(limit), 500);

      let query = db.collection('maintenance');

      // סינונים
      if (status) {
        query = query.where('status', '==', status);
      }
      if (maintenanceType) {
        query = query.where('maintenanceType', '==', maintenanceType);
      }
      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }
      if (riderId) {
        query = query.where('riderId', '==', riderId);
      }
      if (paidBy) {
        query = query.where('paidBy', '==', paidBy);
      }
      if (garageId) {
        query = query.where('garageId', '==', garageId);
      }

      const snapshot = await query.limit(limitNum).get();
      let maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // סינון לפי חיפוש
      if (search) {
        const searchLower = search.toLowerCase();
        maintenances = maintenances.filter(m =>
          m.description?.toLowerCase().includes(searchLower) ||
          m.garageName?.toLowerCase().includes(searchLower) ||
          m.notes?.toLowerCase().includes(searchLower)
        );
      }

      return res.json({
        success: true,
        count: maintenances.length,
        maintenances
      });
    }

    if (req.method === 'POST') {
      // כולם יכולים לדווח טיפול (כולל רוכבים)

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

      const maintenanceData = {
        vehicleId: req.body.vehicleId,
        riderId: req.body.riderId || null,
        description: req.body.description,
        maintenanceType: req.body.maintenanceType || 'other',
        garageId: req.body.garageId || null,
        garageName: req.body.garageName || '',
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : null,
        faultId: req.body.faultId || null,
        notes: req.body.notes || '',
        costs: req.body.costs || {},
        paidBy: req.body.paidBy || null,
        files: req.body.files || [],
        status: req.body.status || 'pending',
        reportedBy: user.id,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const maintenanceRef = await db.collection('maintenance').add(maintenanceData);
      const maintenanceDoc = await maintenanceRef.get();

      return res.status(201).json({
        success: true,
        message: 'טיפול נוצר בהצלחה',
        maintenance: { id: maintenanceRef.id, ...maintenanceDoc.data() }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Maintenance API error:', error.message, error.stack);

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
