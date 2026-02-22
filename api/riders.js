// Vercel Serverless Function - /api/riders (all rider endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const googleDriveService = require('./_services/googleDriveService');
const Busboy = require('busboy');
const getRawBody = require('raw-body');
const { Readable } = require('stream');
const { setCorsHeaders } = require('./_utils/cors');

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

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
      req.body = {};
    }
  }

  try {
    console.log('👤 Riders Request:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.authorization
    });

    const { db } = initFirebase();

    // Initialize Google Drive service with Firestore
    googleDriveService.setFirestore(db);
    await googleDriveService.initialize();

    const user = await authenticateToken(req, db);

    // Check for special routes first (before extracting ID)
    const url = req.url.split('?')[0]; // Remove query params for matching

    // ==================== Google Drive File Operations ====================

    // GET /api/riders/list-files
    if (url.endsWith('/list-files') && req.method === 'GET') {
      const { folderId, riderId, viewAsRider } = req.query;

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'חסר מזהה תיקייה'
        });
      }

      const files = await googleDriveService.listFiles(folderId);

      // בדיקת הרשאות משתמש
      const listFilesPermLevel = await checkPermission(user, db, 'riders', 'view');
      const isAdminOrManager = listFilesPermLevel !== 'self';

      // טעינת הגדרות נראות מ-Firestore
      let fileSettings = {};
      if (riderId) {
        const riderRef = db.collection('riders').doc(riderId);
        const riderDoc = await riderRef.get();
        const riderData = riderDoc.exists ? riderDoc.data() : {};
        fileSettings = riderData.fileSettings || {};
      }

      // מיפוי קבצים עם מידע נראות
      const filesWithMetadata = files.map(file => {
        const hasExplicitSetting = fileSettings[file.id] !== undefined;
        const visibleToRider = hasExplicitSetting
          ? fileSettings[file.id].visibleToRider
          : true; // ברירת מחדל - גלוי
        return { ...file, visibleToRider };
      });

      // אם viewAsRider=true - רוכב רואה רק קבצים גלויים (מסונן)
      if (viewAsRider === 'true') {
        const visibleFiles = filesWithMetadata.filter(f => f.visibleToRider !== false);
        return res.json({
          success: true,
          files: visibleFiles
        });
      }

      // מנהלים רואים הכל, רוכבים רק גלויים
      const filteredFiles = isAdminOrManager
        ? filesWithMetadata
        : filesWithMetadata.filter(f => f.visibleToRider);

      return res.json({
        success: true,
        files: filteredFiles
      });
    }

    // POST /api/riders/upload-file
    if (url.endsWith('/upload-file') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      return new Promise(async (resolve, reject) => {
        try {
          console.log('Upload rider file request received');

          const rawBody = await getRawBody(req, {
            length: req.headers['content-length'],
            limit: '50mb'
          });

          const bufferStream = Readable.from(rawBody);
          const busboy = Busboy({ headers: req.headers });

          let fileBuffer = null;
          let fileName = '';
          let mimeType = '';
          let folderId = '';
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
              console.log('Rider file received, size:', fileBuffer.length);
            });
          });

          busboy.on('field', (fieldname, value) => {
            if (fieldname === 'folderId') {
              folderId = value;
            }
          });

          busboy.on('finish', async () => {
            try {
              if (!fileReceived || !fileBuffer) {
                res.status(400).json({ success: false, message: 'לא הועלה קובץ' });
                return reject(new Error('No file uploaded'));
              }

              if (!folderId) {
                res.status(400).json({ success: false, message: 'חסר מזהה תיקייה' });
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
                message: 'הקובץ הועלה בהצלחה',
                file: fileData
              });
              resolve();
            } catch (error) {
              console.error('Error in rider upload finish handler:', error);
              res.status(500).json({ success: false, message: error.message });
              reject(error);
            }
          });

          busboy.on('error', (error) => {
            console.error('Busboy error:', error);
            res.status(500).json({ success: false, message: 'שגיאה בעיבוד הקובץ: ' + error.message });
            reject(error);
          });

          bufferStream.pipe(busboy);
        } catch (error) {
          console.error('Error setting up rider upload:', error);
          res.status(500).json({ success: false, message: 'שגיאה באתחול העלאת הקובץ: ' + error.message });
          reject(error);
        }
      });
    }

    // POST /api/riders/rename-file - שינוי שם קובץ בתיקיית רוכב
    if (url.endsWith('/rename-file') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const { fileId, newName } = req.body;

      if (!fileId || !newName) {
        return res.status(400).json({
          success: false,
          message: 'מזהה קובץ ושם חדש הם שדות חובה'
        });
      }

      const updatedFile = await googleDriveService.renameFile(fileId, newName.trim());

      return res.json({
        success: true,
        message: 'שם הקובץ שונה בהצלחה',
        data: updatedFile
      });
    }

    // DELETE /api/riders/delete-file
    if (url.endsWith('/delete-file') && req.method === 'DELETE') {
      await checkPermission(user, db, 'riders', 'edit');

      const { fileId, recursive } = req.query;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: 'חסר מזהה קובץ'
        });
      }

      await googleDriveService.deleteFile(fileId, recursive === 'true');

      return res.json({
        success: true,
        message: 'הקובץ נמחק בהצלחה'
      });
    }

    // PATCH /api/riders/update-file-visibility - עדכון נראות קובץ לרוכב
    if (url.endsWith('/update-file-visibility') && req.method === 'PATCH') {
      await checkPermission(user, db, 'riders', 'edit');

      const { riderId, fileId, visibleToRider } = req.body;

      if (!riderId || !fileId || visibleToRider === undefined) {
        return res.status(400).json({
          success: false,
          message: 'חסרים פרמטרים: riderId, fileId, visibleToRider'
        });
      }

      const riderRef = db.collection('riders').doc(riderId);
      const riderDoc = await riderRef.get();

      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      const riderData = riderDoc.data();
      const fileSettings = riderData.fileSettings || {};

      fileSettings[fileId] = {
        ...fileSettings[fileId],
        visibleToRider,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await riderRef.update({
        fileSettings,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'הגדרות הקובץ עודכנו בהצלחה'
      });
    }

    // POST /api/riders/move-file - העברת קובץ לתיקייה אחרת
    if (url.endsWith('/move-file') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const { riderId, fileId, targetFolderId } = req.body;

      if (!riderId || !fileId || !targetFolderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה רוכב, מזהה קובץ ומזהה תיקיית יעד הם שדות חובה'
        });
      }

      const riderRef = db.collection('riders').doc(riderId);
      const riderDoc = await riderRef.get();

      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      await googleDriveService.moveFile(fileId, targetFolderId);

      return res.json({
        success: true,
        message: 'הקובץ הועבר בהצלחה'
      });
    }

    // POST /api/riders/add-custom-folder - הוספת תיקייה מותאמת אישית
    if (url.endsWith('/add-custom-folder') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const { riderId, folderName } = req.body;

      if (!riderId || !folderName) {
        return res.status(400).json({
          success: false,
          message: 'מזהה רוכב ושם תיקייה הם שדות חובה'
        });
      }

      const riderRef = db.collection('riders').doc(riderId);
      const riderDoc = await riderRef.get();

      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      const riderData = riderDoc.data();
      const extrasFolderId = riderData.driveFolderData?.extrasFolderId;

      if (!extrasFolderId) {
        return res.status(400).json({
          success: false,
          message: 'לא קיים מבנה תיקיות עבור רוכב זה. יש ליצור מבנה תיקיות או לרענן תיקיות קיימות.'
        });
      }

      const newFolder = await googleDriveService.createFolder(folderName, extrasFolderId);

      const customFolders = riderData.driveFolderData?.customFolders || [];
      customFolders.push({
        id: newFolder.id,
        name: folderName,
        link: newFolder.webViewLink,
        createdAt: new Date(),
        createdBy: user.id
      });

      await riderRef.update({
        'driveFolderData.customFolders': customFolders,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'תיקייה נוצרה בהצלחה',
        data: {
          folderId: newFolder.id,
          folderName: folderName,
          folderLink: newFolder.webViewLink
        }
      });
    }

    // POST /api/riders/delete-custom-folder - מחיקת תיקייה מותאמת אישית
    if (url.endsWith('/delete-custom-folder') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const { riderId, folderId } = req.body;

      if (!riderId || !folderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה רוכב ומזהה תיקייה הם שדות חובה'
        });
      }

      const riderRef = db.collection('riders').doc(riderId);
      const riderDoc = await riderRef.get();

      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      const riderData = riderDoc.data();
      const customFolders = riderData.driveFolderData?.customFolders || [];

      await googleDriveService.deleteFile(folderId, true);

      const updatedCustomFolders = customFolders.filter(f => f.id !== folderId);

      await riderRef.update({
        'driveFolderData.customFolders': updatedCustomFolders,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'תיקייה נמחקה בהצלחה'
      });
    }

    // POST /api/riders/delete-default-folder - מחיקת תיקייה דיפולטית (לא קבועה)
    if (url.endsWith('/delete-default-folder') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const { riderId, folderKey, folderId } = req.body;

      // בדיקה שזו לא תיקייה קבועה
      const fixedFolders = ['documentsFolderId', 'licensesFolderId'];
      if (fixedFolders.includes(folderKey)) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן למחוק תיקיות קבועות (מסמכים/רישיונות)'
        });
      }

      if (!riderId || !folderKey || !folderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה רוכב, מפתח תיקייה ומזהה תיקייה הם שדות חובה'
        });
      }

      const riderRef = db.collection('riders').doc(riderId);
      const riderDoc = await riderRef.get();

      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      await googleDriveService.deleteFile(folderId, true);

      const updateData = {
        [`driveFolderData.${folderKey}`]: null,
        [`driveFolderData.${folderKey.replace('Id', 'Link')}`]: null,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await riderRef.update(updateData);

      return res.json({
        success: true,
        message: 'תיקייה נמחקה בהצלחה'
      });
    }

    // POST /api/riders/rename-folder - שינוי שם תיקייה
    if (url.endsWith('/rename-folder') && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const { riderId, folderId, newName, folderKey, isCustom } = req.body;

      // בדיקה שזו לא תיקייה קבועה
      const fixedFolders = ['documentsFolderId', 'licensesFolderId'];
      if (folderKey && fixedFolders.includes(folderKey)) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן לשנות שם לתיקיות קבועות (מסמכים/רישיונות)'
        });
      }

      if (!riderId || !folderId || !newName) {
        return res.status(400).json({
          success: false,
          message: 'מזהה רוכב, מזהה תיקייה ושם חדש הם שדות חובה'
        });
      }

      const riderRef = db.collection('riders').doc(riderId);
      const riderDoc = await riderRef.get();

      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      await googleDriveService.renameFile(folderId, newName);

      if (isCustom) {
        const riderData = riderDoc.data();
        const customFolders = riderData.driveFolderData?.customFolders || [];
        const updatedCustomFolders = customFolders.map(f =>
          f.id === folderId ? { ...f, name: newName } : f
        );

        await riderRef.update({
          'driveFolderData.customFolders': updatedCustomFolders,
          updatedBy: user.id,
          updatedAt: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'שם התיקייה שונה בהצלחה'
      });
    }

    // POST /api/riders/:id/create-folder - יצירת מבנה תיקיות לרוכב
    if (url.match(/\/[\w-]+\/create-folder$/) && req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const match = url.match(/\/riders\/([^/]+)\/create-folder$/) || url.match(/\/([^/]+)\/create-folder$/);
      const riderIdFromUrl = match ? match[1] : null;

      if (!riderIdFromUrl) {
        return res.status(400).json({
          success: false,
          message: 'חסר מזהה רוכב'
        });
      }

      const riderDoc = await db.collection('riders').doc(riderIdFromUrl).get();
      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      const rider = riderDoc.data();
      const riderName = `${rider.firstName} ${rider.lastName}`.trim();
      if (!riderName) {
        return res.status(400).json({
          success: false,
          message: 'שם הרוכב חסר'
        });
      }

      const folderData = await googleDriveService.createRiderFolderStructure(riderName);

      // שמירת נתוני התיקיות ברוכב
      await db.collection('riders').doc(riderIdFromUrl).update({
        driveFolderData: folderData,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'מבנה תיקיות רוכב נוצר בהצלחה',
        data: folderData
      });
    }

    // ==================== End Google Drive File Operations ====================

    // Extract ID from URL for regular rider operations
    const riderId = extractIdFromUrl(req.url, 'riders');
    console.log('📍 Rider ID extracted:', riderId);

    // Single rider operations (GET/PUT/DELETE /api/riders/[id])
    if (riderId) {
      const riderRef = db.collection('riders').doc(riderId);
      const doc = await riderRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      // GET single rider
      if (req.method === 'GET') {
        await checkPermission(user, db, 'riders', 'view');

        return res.status(200).json({
          success: true,
          rider: { id: doc.id, ...doc.data() }
        });
      }

      // PUT - update rider
      if (req.method === 'PUT') {
        await checkPermission(user, db, 'riders', 'edit');

        // שליפת מצב רוכב נוכחי לבדיקת שינויים בשיוך
        const currentRiderData = doc.data();
        // נורמליזציה: מחרוזת ריקה או undefined הופכים ל-null
        const oldVehicleId = currentRiderData.assignedVehicleId || null;
        const oldAssignmentStatus = currentRiderData.assignmentStatus || 'unassigned';

        // נורמליזציה: מחרוזת ריקה או undefined הופכים ל-null
        const newVehicleId = (req.body.assignedVehicleId && req.body.assignedVehicleId !== '')
          ? req.body.assignedVehicleId
          : null;
        const newAssignmentStatus = req.body.assignmentStatus || 'unassigned';

        console.log('[RIDER UPDATE] Assignment change detection:', {
          riderId,
          oldVehicleId,
          newVehicleId,
          oldAssignmentStatus,
          newAssignmentStatus
        });

        // טיפול בשינויי שיוך כלי
        const assignmentChanged = oldAssignmentStatus !== newAssignmentStatus ||
                                 oldVehicleId !== newVehicleId;

        if (assignmentChanged) {
          console.log('[RIDER UPDATE] Assignment changed - updating vehicles');

          // אם היה כלי ישן משויך - בטל את השיוך שלו
          if (oldVehicleId && oldAssignmentStatus === 'assigned') {
            try {
              const oldVehicleRef = db.collection('vehicles').doc(oldVehicleId);
              const oldVehicleDoc = await oldVehicleRef.get();

              if (oldVehicleDoc.exists) {
                await oldVehicleRef.update({
                  assignedTo: null,
                  assignedAt: null,
                  updatedAt: new Date(),
                  updatedBy: user.id
                });
                console.log('[RIDER UPDATE] Unassigned old vehicle:', oldVehicleId);
              }
            } catch (err) {
              console.error('[RIDER UPDATE] Error unassigning old vehicle:', err);
            }
          }

          // אם יש כלי חדש משויך - שייך אותו
          if (newVehicleId && newAssignmentStatus === 'assigned') {
            try {
              const newVehicleRef = db.collection('vehicles').doc(newVehicleId);
              const newVehicleDoc = await newVehicleRef.get();

              if (!newVehicleDoc.exists) {
                return res.status(404).json({
                  success: false,
                  message: 'כלי לא נמצא'
                });
              }

              const newVehicleData = newVehicleDoc.data();

              // בדיקה שהכלי לא משויך כבר לרוכב אחר
              if (newVehicleData.assignedTo && newVehicleData.assignedTo !== riderId) {
                return res.status(400).json({
                  success: false,
                  message: 'כלי כבר משויך לרוכב אחר'
                });
              }

              await newVehicleRef.update({
                assignedTo: riderId,
                assignedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: user.id
              });
              console.log('[RIDER UPDATE] Assigned new vehicle:', newVehicleId);
            } catch (err) {
              console.error('[RIDER UPDATE] Error assigning new vehicle:', err);
              return res.status(500).json({
                success: false,
                message: 'שגיאה בשיוך כלי'
              });
            }
          }
        }

        // עדכון פרטי הרוכב
        const updateData = {
          ...req.body,
          // אם הסטטוס הוא "לא משויך", לוודא שאין vehicleId
          assignedVehicleId: newAssignmentStatus === 'unassigned' ? null : newVehicleId,
          assignmentStatus: newAssignmentStatus,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await riderRef.update(updateData);
        const updatedDoc = await riderRef.get();

        console.log('[RIDER UPDATE] Rider updated successfully:', riderId);

        return res.status(200).json({
          success: true,
          message: 'רוכב עודכן בהצלחה',
          rider: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      // DELETE rider
      if (req.method === 'DELETE') {
        await checkPermission(user, db, 'riders', 'edit');

        await riderRef.delete();

        return res.status(200).json({
          success: true,
          message: 'רוכב נמחק בהצלחה'
        });
      }
    }

    // Collection operations (GET/POST /api/riders)
    // GET - list riders
    if (req.method === 'GET') {
      const { search, riderStatus, assignmentStatus, region, page = 1, limit = 20 } = req.query;
      const limitNum = Math.min(parseInt(limit), 100); // מקסימום 100 לבקשה
      const pageNum = parseInt(page);

      let query = db.collection('riders');

      if (riderStatus) {
        query = query.where('riderStatus', '==', riderStatus);
      }
      if (assignmentStatus) {
        query = query.where('assignmentStatus', '==', assignmentStatus);
      }
      if (region) {
        query = query.where('region.district', '==', region);
      }

      // סינון לפי הרשאות - בדיקה אם המשתמש רואה רק את עצמו
      await checkPermission(user, db, 'riders', 'view');

      // אופטימיזציה: אם אין חיפוש, השתמש ב-Firestore pagination אמיתי
      if (!search) {
        // מיון לפי createdAt (חשוב ל-pagination יעיל)
        query = query.orderBy('createdAt', 'desc');

        // אם זה לא עמוד ראשון, טען רק את הכמות הנדרשת מהתחלה ודלג
        if (pageNum > 1) {
          const skipCount = (pageNum - 1) * limitNum;
          query = query.offset(skipCount);
        }

        query = query.limit(limitNum);

        const snapshot = await query.get();
        const riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // טעינת הספירה הכוללת בנפרד (יעיל יותר)
        const countSnapshot = await db.collection('riders').count().get();
        const totalCount = countSnapshot.data().count;

        return res.status(200).json({
          success: true,
          count: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          currentPage: pageNum,
          riders: riders
        });
      }

      // אם יש חיפוש - נאלצים לטעון הכל ולסנן (Firestore לא תומך בחיפוש טקסט מלא)
      const snapshot = await query.get();
      let riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const searchLower = search.toLowerCase();
      riders = riders.filter(rider =>
        rider.firstName?.toLowerCase().includes(searchLower) ||
        rider.lastName?.toLowerCase().includes(searchLower) ||
        rider.idNumber?.includes(search) ||
        rider.phone?.includes(search)
      );

      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = pageNum * limitNum;
      const paginatedRiders = riders.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        count: riders.length,
        totalPages: Math.ceil(riders.length / limitNum),
        currentPage: pageNum,
        riders: paginatedRiders
      });
    }

    // POST - create rider
    if (req.method === 'POST') {
      await checkPermission(user, db, 'riders', 'edit');

      const riderData = {
        ...req.body,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const riderRef = await db.collection('riders').add(riderData);
      const newRiderId = riderRef.id;

      console.log('[RIDER CREATE] New rider created:', newRiderId);

      // אם הרוכב החדש צריך להיות משויך לכלי - שייך אותו
      // נורמליזציה: מחרוזת ריקה או undefined הופכים ל-null
      const vehicleId = (req.body.assignedVehicleId && req.body.assignedVehicleId !== '')
        ? req.body.assignedVehicleId
        : null;
      const assignmentStatus = req.body.assignmentStatus || 'unassigned';

      if (assignmentStatus === 'assigned' && vehicleId) {
        console.log('[RIDER CREATE] Assigning vehicle to new rider:', vehicleId);

        try {
          const vehicleRef = db.collection('vehicles').doc(vehicleId);
          const vehicleDoc = await vehicleRef.get();

          if (!vehicleDoc.exists) {
            // אם הכלי לא קיים, עדכן את הרוכב לסטטוס "לא משויך"
            await riderRef.update({
              assignmentStatus: 'unassigned',
              assignedVehicleId: null
            });
            console.warn('[RIDER CREATE] Vehicle not found, rider set to unassigned');
          } else {
            const vehicleData = vehicleDoc.data();

            // בדיקה שהכלי לא משויך כבר לרוכב אחר
            if (vehicleData.assignedTo && vehicleData.assignedTo !== newRiderId) {
              await riderRef.update({
                assignmentStatus: 'unassigned',
                assignedVehicleId: null
              });
              console.warn('[RIDER CREATE] Vehicle already assigned to another rider');
            } else {
              // שיוך הכלי לרוכב החדש
              await vehicleRef.update({
                assignedTo: newRiderId,
                assignedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: user.id
              });
              console.log('[RIDER CREATE] Vehicle assigned successfully');
            }
          }
        } catch (err) {
          console.error('[RIDER CREATE] Error assigning vehicle:', err);
          // עדכן את הרוכב לסטטוס "לא משויך" במקרה של שגיאה
          await riderRef.update({
            assignmentStatus: 'unassigned',
            assignedVehicleId: null
          });
        }
      }

      const riderDoc = await riderRef.get();

      return res.status(201).json({
        success: true,
        message: 'רוכב נוצר בהצלחה',
        rider: { id: riderRef.id, ...riderDoc.data() }
      });
    }

    console.error('❌ Riders: Method not allowed:', {
      method: req.method,
      url: req.url
    });

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      details: {
        method: req.method,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });

  } catch (error) {
    console.error('❌ Riders error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
