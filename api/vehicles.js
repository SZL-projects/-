// Vercel Serverless Function - /api/vehicles (all vehicle endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');
const googleDriveService = require('./services/googleDriveService');
const Busboy = require('busboy');
const getRawBody = require('raw-body');
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
      req.body = JSON.parse(rawBody.toString());
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();

    // Initialize Google Drive service with Firestore
    googleDriveService.setFirestore(db);
    await googleDriveService.initialize();

    const user = await authenticateToken(req, db);

    // Check for special routes first (before extracting ID)
    const url = req.url.split('?')[0]; // Remove query params for matching

    // ==================== Google Drive Endpoints ====================

    // POST /api/vehicles/create-folder
    if (url.endsWith('/create-folder') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

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
        const vehicleRef = db.collection('vehicles').doc(vehicleId);
        await vehicleRef.update({
          driveFolderData: folderData,
          updatedBy: user.id,
          updatedAt: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'מבנה תיקיות נוצר בהצלחה',
        data: folderData
      });
    }

    // POST /api/vehicles/create-rider-folder
    if (url.endsWith('/create-rider-folder') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { riderName, insuranceFolderId } = req.body;

      if (!riderName || !insuranceFolderId) {
        return res.status(400).json({
          success: false,
          message: 'שם רוכב ומזהה תיקיית ביטוחים הם שדות חובה'
        });
      }

      const riderFolderData = await googleDriveService.createRiderFolder(riderName, insuranceFolderId);

      return res.json({
        success: true,
        message: 'תיקיית רוכב נוצרה בהצלחה',
        data: riderFolderData
      });
    }

    // POST /api/vehicles/upload-file
    if (url.endsWith('/upload-file') && req.method === 'POST') {
      return new Promise(async (resolve, reject) => {
        try {
          console.log('Upload file request received');
          console.log('Headers:', req.headers);

          // Get raw body first
          const rawBody = await getRawBody(req, {
            length: req.headers['content-length'],
            limit: '10mb'
          });

          console.log('Raw body received, size:', rawBody.length);

          // Convert buffer to stream
          const bufferStream = Readable.from(rawBody);

          const busboy = Busboy({ headers: req.headers });

          let fileBuffer = null;
          let fileName = '';
          let mimeType = '';
          let folderId = '';
          let fileReceived = false;

          busboy.on('file', (fieldname, file, info) => {
            console.log('Busboy file event:', { fieldname, info });
            // תיקון קידוד תווים עבריים - busboy מקבל latin1 במקום utf8
            try {
              // המר מ-latin1 ל-utf8
              fileName = Buffer.from(info.filename, 'latin1').toString('utf8');
            } catch (e) {
              fileName = info.filename;
            }
            console.log('Original filename:', info.filename);
            console.log('Fixed filename:', fileName);
            mimeType = info.mimeType;
            fileReceived = true;

            const chunks = [];

            file.on('data', (data) => {
              chunks.push(data);
            });

            file.on('end', () => {
              fileBuffer = Buffer.concat(chunks);
              console.log('File received, size:', fileBuffer.length);
            });

            file.on('error', (err) => {
              console.error('File stream error:', err);
            });
          });

          busboy.on('field', (fieldname, value) => {
            console.log('Busboy field event:', { fieldname, value });
            if (fieldname === 'folderId') {
              folderId = value;
            }
          });

          busboy.on('finish', async () => {
            try {
              console.log('Busboy finish event', { fileName, folderId, fileBufferSize: fileBuffer?.length });

              if (!fileReceived || !fileBuffer) {
                res.status(400).json({
                  success: false,
                  message: 'לא הועלה קובץ'
                });
                return reject(new Error('No file uploaded'));
              }

              if (!folderId) {
                res.status(400).json({
                  success: false,
                  message: 'מזהה תיקייה הוא שדה חובה'
                });
                return reject(new Error('No folderId provided'));
              }

              const fileData = await googleDriveService.uploadFile(
                fileName,
                fileBuffer,
                folderId,
                mimeType
              );

              res.json({
                success: true,
                message: 'קובץ הועלה בהצלחה',
                data: fileData
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

    // GET /api/vehicles/list-files
    if (url.endsWith('/list-files') && req.method === 'GET') {
      const { folderId } = req.query;

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה תיקייה הוא שדה חובה'
        });
      }

      const files = await googleDriveService.listFiles(folderId);

      return res.json({
        success: true,
        files
      });
    }

    // DELETE /api/vehicles/delete-file
    if (url.endsWith('/delete-file') && req.method === 'DELETE') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { fileId } = req.query;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה קובץ הוא שדה חובה'
        });
      }

      await googleDriveService.deleteFile(fileId);

      return res.json({
        success: true,
        message: 'קובץ נמחק בהצלחה'
      });
    }

    // ==================== Regular Vehicle Endpoints ====================

    // Extract ID from URL for regular vehicle operations
    const vehicleId = extractIdFromUrl(req.url, 'vehicles');

    // PATCH /api/vehicles/:id/kilometers
    if (vehicleId && url.includes('/kilometers') && req.method === 'PATCH') {
      const { kilometers, source, notes } = req.body;

      if (!kilometers || !source) {
        return res.status(400).json({
          success: false,
          message: 'קילומטראז ומקור הם שדות חובה'
        });
      }

      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const doc = await vehicleRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const updateData = {
        currentKilometers: kilometers,
        lastKilometerUpdate: {
          kilometers,
          source,
          notes: notes || '',
          updatedBy: user.id,
          updatedAt: new Date()
        },
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await vehicleRef.update(updateData);
      const updatedDoc = await vehicleRef.get();

      return res.status(200).json({
        success: true,
        vehicle: { id: updatedDoc.id, ...updatedDoc.data() }
      });
    }

    // Single vehicle operations
    if (vehicleId) {
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const doc = await vehicleRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          vehicle: { id: doc.id, ...doc.data() }
        });
      }

      if (req.method === 'PUT') {
        checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await vehicleRef.update(updateData);
        const updatedDoc = await vehicleRef.get();

        return res.status(200).json({
          success: true,
          message: 'כלי עודכן בהצלחה',
          vehicle: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin']);

        await vehicleRef.delete();

        return res.status(200).json({
          success: true,
          message: 'כלי נמחק בהצלחה'
        });
      }
    }

    // Collection operations
    if (req.method === 'GET') {
      const { search, status, type, page = 1, limit = 50 } = req.query;

      let query = db.collection('vehicles');

      if (status) {
        query = query.where('status', '==', status);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      let vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // סינון לפי תפקיד משתמש
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isAdminOrManager = userRoles.some(role =>
        ['super_admin', 'manager', 'secretary'].includes(role)
      );

      // אם המשתמש הוא רוכב (לא מנהל) - הצג רק את הכלי המשויך אליו
      if (!isAdminOrManager && user.riderId) {
        // נמצא את הרוכב כדי לקבל את assignedVehicleId
        const riderSnapshot = await db.collection('riders').doc(user.riderId).get();
        if (riderSnapshot.exists) {
          const riderData = riderSnapshot.data();
          if (riderData.assignedVehicleId) {
            // הצג רק את הכלי המשויך
            vehicles = vehicles.filter(v => v.id === riderData.assignedVehicleId);
          } else {
            // אין כלי משויך - מערך ריק
            vehicles = [];
          }
        } else {
          // רוכב לא נמצא - מערך ריק
          vehicles = [];
        }
      }

      if (search) {
        const searchLower = search.toLowerCase();
        vehicles = vehicles.filter(vehicle =>
          vehicle.licensePlate?.toLowerCase().includes(searchLower) ||
          vehicle.internalNumber?.toLowerCase().includes(searchLower) ||
          vehicle.manufacturer?.toLowerCase().includes(searchLower) ||
          vehicle.model?.toLowerCase().includes(searchLower)
        );
      }

      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        count: vehicles.length,
        totalPages: Math.ceil(vehicles.length / limit),
        currentPage: parseInt(page),
        vehicles: paginatedVehicles
      });
    }

    if (req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const vehicleData = {
        ...req.body,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const vehicleRef = await db.collection('vehicles').add(vehicleData);
      const vehicleDoc = await vehicleRef.get();

      return res.status(201).json({
        success: true,
        message: 'כלי נוצר בהצלחה',
        vehicle: { id: vehicleRef.id, ...vehicleDoc.data() }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Vehicles error:', error);

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
