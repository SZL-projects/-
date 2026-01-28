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
          insuranceFolderId: folderData.insuranceFolderId,
          archiveFolderId: folderData.archiveFolderId,
          extrasFolderId: folderData.extrasFolderId,
          photosFolderId: folderData.photosFolderId,
          miscFolderId: folderData.miscFolderId,
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

    // POST /api/vehicles/add-custom-folder - הוספת תיקייה מותאמת אישית
    if (url.endsWith('/add-custom-folder') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, folderName } = req.body;

      if (!vehicleId || !folderName) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי ושם תיקייה הם שדות חובה'
        });
      }

      // שליפת מידע הכלי
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicleData = vehicleDoc.data();
      const extrasFolderId = vehicleData.driveFolderData?.extrasFolderId;

      if (!extrasFolderId) {
        return res.status(400).json({
          success: false,
          message: 'לא קיים מבנה תיקיות עבור כלי זה. יש ליצור מבנה תיקיות או לרענן תיקיות קיימות.'
        });
      }

      // יצירת התיקייה החדשה בתוך תיקיית "נוספים"
      const newFolder = await googleDriveService.createFolder(folderName, extrasFolderId);

      // עדכון הכלי עם התיקייה החדשה
      const customFolders = vehicleData.driveFolderData?.customFolders || [];
      customFolders.push({
        id: newFolder.id,
        name: folderName,
        link: newFolder.webViewLink,
        createdAt: new Date(),
        createdBy: user.id
      });

      await vehicleRef.update({
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

    // POST /api/vehicles/refresh-folders - ריענון מבנה התיקיות (הוספת תיקיות חסרות)
    if (url.endsWith('/refresh-folders') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId } = req.body;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי הוא שדה חובה'
        });
      }

      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicleData = vehicleDoc.data();
      const folderData = vehicleData.driveFolderData || {};
      const mainFolderId = folderData.mainFolderId;

      if (!mainFolderId) {
        return res.status(400).json({
          success: false,
          message: 'לא קיים מבנה תיקיות עבור כלי זה. יש ליצור מבנה תיקיות חדש.'
        });
      }

      const updatedFolderData = { ...folderData };
      const foldersCreated = [];

      // בדיקה והוספת תיקיית "נוספים" אם חסרה
      let extrasFolderId = folderData.extrasFolderId;
      if (!extrasFolderId) {
        const extrasFolder = await googleDriveService.createFolder('נוספים', mainFolderId);
        updatedFolderData.extrasFolderId = extrasFolder.id;
        updatedFolderData.extrasFolderLink = extrasFolder.webViewLink;
        extrasFolderId = extrasFolder.id;
        foldersCreated.push('נוספים');
      }

      // בדיקה והוספת תיקיית תמונות בתוך "נוספים" אם חסרה
      if (!folderData.photosFolderId) {
        const photosFolder = await googleDriveService.createFolder('תמונות כלי', extrasFolderId);
        updatedFolderData.photosFolderId = photosFolder.id;
        updatedFolderData.photosFolderLink = photosFolder.webViewLink;
        foldersCreated.push('תמונות כלי');
      }

      // בדיקה והוספת תיקיית שונות בתוך "נוספים" אם חסרה
      if (!folderData.miscFolderId) {
        const miscFolder = await googleDriveService.createFolder('שונות', extrasFolderId);
        updatedFolderData.miscFolderId = miscFolder.id;
        updatedFolderData.miscFolderLink = miscFolder.webViewLink;
        foldersCreated.push('שונות');
      }

      // אתחול מערך תיקיות מותאמות אם לא קיים
      if (!updatedFolderData.customFolders) {
        updatedFolderData.customFolders = [];
      }

      // עדכון הכלי
      await vehicleRef.update({
        driveFolderData: updatedFolderData,
        extrasFolderId: updatedFolderData.extrasFolderId || null,
        photosFolderId: updatedFolderData.photosFolderId || null,
        miscFolderId: updatedFolderData.miscFolderId || null,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: foldersCreated.length > 0
          ? `התיקיות הבאות נוספו: ${foldersCreated.join(', ')}`
          : 'מבנה התיקיות עדכני, לא נדרשו שינויים',
        data: updatedFolderData,
        foldersCreated
      });
    }

    // POST /api/vehicles/delete-custom-folder - מחיקת תיקייה מותאמת אישית
    if (url.endsWith('/delete-custom-folder') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, folderId } = req.body;

      if (!vehicleId || !folderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי ומזהה תיקייה הם שדות חובה'
        });
      }

      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicleData = vehicleDoc.data();
      const customFolders = vehicleData.driveFolderData?.customFolders || [];

      // מחיקת התיקייה מ-Google Drive
      await googleDriveService.deleteFile(folderId, true);

      // הסרת התיקייה מהמערך
      const updatedCustomFolders = customFolders.filter(f => f.id !== folderId);

      await vehicleRef.update({
        'driveFolderData.customFolders': updatedCustomFolders,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'תיקייה נמחקה בהצלחה'
      });
    }

    // POST /api/vehicles/delete-default-folder - מחיקת תיקייה דיפולטית (לא קבועה)
    if (url.endsWith('/delete-default-folder') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, folderKey, folderId } = req.body;

      // בדיקה שזו לא תיקייה קבועה (ביטוחים)
      const fixedFolders = ['insuranceFolderId', 'archiveFolderId'];
      if (fixedFolders.includes(folderKey)) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן למחוק תיקיות ביטוח קבועות'
        });
      }

      if (!vehicleId || !folderKey || !folderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי, מפתח תיקייה ומזהה תיקייה הם שדות חובה'
        });
      }

      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      // מחיקת התיקייה מ-Google Drive
      await googleDriveService.deleteFile(folderId, true);

      // עדכון ה-folderData - הסרת התיקייה
      const updateData = {
        [`driveFolderData.${folderKey}`]: null,
        [`driveFolderData.${folderKey.replace('Id', 'Link')}`]: null,
        [folderKey]: null,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await vehicleRef.update(updateData);

      return res.json({
        success: true,
        message: 'תיקייה נמחקה בהצלחה'
      });
    }

    // POST /api/vehicles/rename-folder - שינוי שם תיקייה
    if (url.endsWith('/rename-folder') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, folderId, newName, folderKey, isCustom } = req.body;

      // בדיקה שזו לא תיקייה קבועה (ביטוחים)
      const fixedFolders = ['insuranceFolderId', 'archiveFolderId'];
      if (folderKey && fixedFolders.includes(folderKey)) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן לשנות שם לתיקיות ביטוח קבועות'
        });
      }

      if (!vehicleId || !folderId || !newName) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי, מזהה תיקייה ושם חדש הם שדות חובה'
        });
      }

      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      // שינוי שם התיקייה ב-Google Drive
      await googleDriveService.renameFile(folderId, newName);

      // עדכון השם ב-Firestore
      if (isCustom) {
        // תיקייה מותאמת אישית - עדכון במערך customFolders
        const vehicleData = vehicleDoc.data();
        const customFolders = vehicleData.driveFolderData?.customFolders || [];
        const updatedCustomFolders = customFolders.map(f =>
          f.id === folderId ? { ...f, name: newName } : f
        );

        await vehicleRef.update({
          'driveFolderData.customFolders': updatedCustomFolders,
          updatedBy: user.id,
          updatedAt: new Date()
        });
      }
      // תיקיות דיפולטיות לא צריכות עדכון שם ב-Firestore (השם נקבע לפי ה-label ב-frontend)

      return res.json({
        success: true,
        message: 'שם התיקייה שונה בהצלחה'
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
      const { folderId, vehicleId, viewAsRider } = req.query;

      console.log('📁 List files request:', { folderId, vehicleId, viewAsRider, userId: user.id, userRoles: user.roles || user.role });

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה תיקייה הוא שדה חובה'
        });
      }

      const files = await googleDriveService.listFiles(folderId);
      console.log('📄 Files from Drive:', files.length);

      // בדיקת תפקיד משתמש
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isAdminOrManager = userRoles.some(role =>
        ['super_admin', 'manager', 'secretary'].includes(role)
      );

      console.log('👤 User check:', { userRoles, isAdminOrManager, viewAsRider });

      // אם viewAsRider=true - רוכב רואה הכל בתיקייה הנוכחית (ביטוחים נוכחיים)
      // קבצים בארכיון (ביטוחים ישנים) לא נטענים כלל מהקומפוננט MyVehicle
      if (viewAsRider === 'true') {
        console.log('🔵 Rider view mode - showing ALL files from current folder');
        const filesWithMetadata = files.map(file => ({
          ...file,
          visibleToRider: true // כל הקבצים בתיקייה הנוכחית גלויים לרוכבים
        }));

        console.log('✅ Returning', filesWithMetadata.length, 'files for rider');
        return res.json({
          success: true,
          files: filesWithMetadata
        });
      }

      // מצב מנהל - טוען מטא-דאטה מ-Firestore לניהול נראות
      let filesWithMetadata = [];
      if (vehicleId) {
        const vehicleRef = db.collection('vehicles').doc(vehicleId);
        const vehicleDoc = await vehicleRef.get();
        const vehicleData = vehicleDoc.exists ? vehicleDoc.data() : {};
        const fileSettings = vehicleData.fileSettings || {};

        // הוספת מטא-דאטה לכל קובץ
        filesWithMetadata = files.map(file => {
          // אם יש הגדרה מפורשת לקובץ - השתמש בה, אחרת ברירת מחדל היא גלוי
          const hasExplicitSetting = fileSettings[file.id] !== undefined;
          const visibleToRider = hasExplicitSetting
            ? fileSettings[file.id].visibleToRider
            : true; // ברירת מחדל: גלוי

          return {
            ...file,
            visibleToRider
          };
        });
      } else {
        // אם אין vehicleId - כל הקבצים גלויים (למנהלים)
        filesWithMetadata = files.map(file => ({ ...file, visibleToRider: true }));
      }

      // מנהלים רואים הכל, רוכבים רק גלויים
      const filteredFiles = isAdminOrManager
        ? filesWithMetadata
        : filesWithMetadata.filter(f => f.visibleToRider);

      console.log('✅ Files after filter:', filteredFiles.length);
      console.log('📋 Sample file visibility:', filteredFiles.slice(0, 2).map(f => ({ name: f.name, visibleToRider: f.visibleToRider })));

      return res.json({
        success: true,
        files: filteredFiles
      });
    }

    // PATCH /api/vehicles/update-file-visibility
    if (url.endsWith('/update-file-visibility') && req.method === 'PATCH') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, fileId, visibleToRider } = req.body;

      if (!vehicleId || !fileId || visibleToRider === undefined) {
        return res.status(400).json({
          success: false,
          message: 'חסרים פרמטרים: vehicleId, fileId, visibleToRider'
        });
      }

      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicleData = vehicleDoc.data();
      const fileSettings = vehicleData.fileSettings || {};

      // עדכון הגדרות הקובץ
      fileSettings[fileId] = {
        ...fileSettings[fileId],
        visibleToRider,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await vehicleRef.update({
        fileSettings,
        updatedBy: user.id,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'הגדרות הקובץ עודכנו בהצלחה'
      });
    }

    // POST /api/vehicles/move-to-archive
    if (url.endsWith('/move-to-archive') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, fileId } = req.body;

      if (!vehicleId || !fileId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי ומזהה קובץ הם שדות חובה'
        });
      }

      // שליפת מידע הכלי כולל תיקיית הארכיון
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicleData = vehicleDoc.data();
      const archiveFolderId = vehicleData.archiveFolderId;

      if (!archiveFolderId) {
        return res.status(400).json({
          success: false,
          message: 'תיקיית ארכיון לא קיימת עבור כלי זה'
        });
      }

      // העברת הקובץ לתיקיית הארכיון
      await googleDriveService.moveFile(fileId, archiveFolderId);

      return res.json({
        success: true,
        message: 'הקובץ הועבר לארכיון בהצלחה'
      });
    }

    // POST /api/vehicles/move-file - העברת קובץ לתיקייה אחרת
    if (url.endsWith('/move-file') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { vehicleId, fileId, targetFolderId } = req.body;

      if (!vehicleId || !fileId || !targetFolderId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי, מזהה קובץ ומזהה תיקיית יעד הם שדות חובה'
        });
      }

      // שליפת מידע הכלי לוודא שהתיקייה שייכת לו
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      // העברת הקובץ לתיקייה החדשה
      await googleDriveService.moveFile(fileId, targetFolderId);

      return res.json({
        success: true,
        message: 'הקובץ הועבר בהצלחה'
      });
    }

    // POST /api/vehicles/refresh-drive-folders - ריענון וסידור מבנה התיקיות בדרייב
    if (url.endsWith('/refresh-drive-folders') && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager']);

      // קבלת כל הכלים והרוכבים מהמערכת
      const vehiclesSnapshot = await db.collection('vehicles').get();
      const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const ridersSnapshot = await db.collection('riders').get();
      const riders = ridersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log(`Refreshing Drive folders for ${vehicles.length} vehicles and ${riders.length} riders`);

      const results = await googleDriveService.refreshDriveFolders(vehicles, riders);

      // עדכון נתוני התיקיות בכלים שנוצרו להם תיקיות חדשות
      for (const vehicle of vehicles) {
        if (vehicle.internalNumber && !vehicle.driveFolderData?.mainFolderId) {
          try {
            const folderData = await googleDriveService.createVehicleFolderStructure(vehicle.internalNumber);
            await db.collection('vehicles').doc(vehicle.id).update({
              driveFolderData: folderData,
              updatedBy: user.id,
              updatedAt: new Date()
            });
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
            await db.collection('riders').doc(rider.id).update({
              driveFolderData: folderData,
              updatedBy: user.id,
              updatedAt: new Date()
            });
          } catch (err) {
            console.error(`Error updating rider ${rider.id} folder data:`, err);
          }
        }
      }

      return res.json({
        success: true,
        message: 'ריענון תיקיות הדרייב הושלם בהצלחה',
        data: results
      });
    }

    // DELETE /api/vehicles/delete-file
    if (url.endsWith('/delete-file') && req.method === 'DELETE') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { fileId, recursive } = req.query;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה קובץ הוא שדה חובה'
        });
      }

      // תמיכה במחיקה רקורסיבית של תיקיות
      const isRecursive = recursive === 'true';
      await googleDriveService.deleteFile(fileId, isRecursive);

      return res.json({
        success: true,
        message: isRecursive ? 'תיקייה נמחקה בהצלחה (כולל תוכן)' : 'קובץ נמחק בהצלחה'
      });
    }

    // ==================== Vehicle Assignment Endpoints ====================

    // POST /api/vehicles/:id/assign - שיוך כלי לרוכב
    if (url.match(/\/[\w-]+\/assign$/) && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      // Extract vehicleId from URL like /api/vehicles/abc123/assign or /vehicles/abc123/assign
      const match = url.match(/\/vehicles\/([^/]+)\/assign$/);
      const vehicleId = match ? match[1] : null;
      const { riderId } = req.body;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי חסר מה-URL'
        });
      }

      if (!riderId) {
        return res.status(400).json({
          success: false,
          message: 'נא לספק מזהה רוכב'
        });
      }

      // בדיקה שהכלי קיים
      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

      // בדיקה שהרוכב קיים
      const riderDoc = await db.collection('riders').doc(riderId).get();
      if (!riderDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      // בדיקה אם הכלי כבר משויך לאותו הרוכב - החזר הצלחה (idempotent)
      if (vehicle.assignedTo === riderId) {
        console.log('[ASSIGN] Vehicle already assigned to this rider - returning success');
        return res.json({
          success: true,
          message: 'הכלי כבר משויך לרוכב זה',
          vehicle: { id: vehicleDoc.id, ...vehicle }
        });
      }

      // בדיקה אם הכלי משויך לרוכב אחר
      if (vehicle.assignedTo && vehicle.assignedTo !== riderId) {
        return res.status(400).json({
          success: false,
          message: 'כלי כבר משויך לרוכב אחר. יש לבטל את השיוך הקיים תחילה.'
        });
      }

      // עדכון הכלי - הוספת שיוך
      await db.collection('vehicles').doc(vehicleId).update({
        assignedTo: riderId,
        status: 'assigned',
        assignedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id
      });

      // עדכון הרוכב - הוספת שיוך (שימוש בשני שמות השדות לתמיכה מלאה)
      await db.collection('riders').doc(riderId).update({
        assignedVehicle: vehicleId,
        assignedVehicleId: vehicleId, // שדה נוסף שה-frontend משתמש בו
        assignmentStatus: 'assigned',
        assignedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id
      });

      const updatedVehicle = await db.collection('vehicles').doc(vehicleId).get();

      return res.json({
        success: true,
        message: 'כלי שוייך בהצלחה לרוכב',
        vehicle: { id: updatedVehicle.id, ...updatedVehicle.data() }
      });
    }

    // POST /api/vehicles/:id/unassign - ביטול שיוך כלי מרוכב
    if (url.match(/\/[\w-]+\/unassign$/) && req.method === 'POST') {
      console.log('[UNASSIGN] Request received - URL:', url);
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      // Extract vehicleId from URL like /api/vehicles/abc123/unassign or /vehicles/abc123/unassign
      const match = url.match(/\/vehicles\/([^/]+)\/unassign$/);
      const vehicleId = match ? match[1] : null;
      console.log('[UNASSIGN] Extracted vehicleId:', vehicleId);

      if (!vehicleId) {
        console.log('[UNASSIGN] ERROR: No vehicleId found in URL');
        return res.status(400).json({
          success: false,
          message: 'מזהה כלי חסר מה-URL'
        });
      }

      // בדיקה שהכלי קיים
      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (!vehicleDoc.exists) {
        console.log('[UNASSIGN] ERROR: Vehicle not found');
        return res.status(404).json({
          success: false,
          message: 'כלי לא נמצא'
        });
      }

      const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
      console.log('[UNASSIGN] Vehicle found - assignedTo:', vehicle.assignedTo);

      // אם הכלי כבר לא משויך - החזר הצלחה (idempotent operation)
      if (!vehicle.assignedTo) {
        console.log('[UNASSIGN] Vehicle already unassigned - returning success');
        return res.json({
          success: true,
          message: 'הכלי כבר לא משויך',
          vehicle: { id: vehicleDoc.id, ...vehicle }
        });
      }

      const riderId = vehicle.assignedTo;
      console.log('[UNASSIGN] Proceeding to unassign from rider:', riderId);

      // עדכון הכלי - הסרת שיוך
      await db.collection('vehicles').doc(vehicleId).update({
        assignedTo: null,
        status: 'waiting_for_rider',
        assignedAt: null,
        unassignedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id
      });

      // עדכון הרוכב - הסרת שיוך (שימוש בשני שמות השדות לתמיכה מלאה)
      const riderDoc = await db.collection('riders').doc(riderId).get();
      if (riderDoc.exists) {
        console.log('[UNASSIGN] Updating rider:', riderId, 'setting assignedVehicle=null, assignedVehicleId=null');
        const updateData = {
          assignedVehicle: null,
          assignedVehicleId: null, // שדה נוסף שה-frontend משתמש בו
          assignmentStatus: 'unassigned',
          assignedAt: null,
          updatedAt: new Date(),
          updatedBy: user.id
        };
        await db.collection('riders').doc(riderId).update(updateData);
        console.log('[UNASSIGN] Rider updated successfully with:', updateData);
      } else {
        console.log('[UNASSIGN] WARNING: Rider doc not found:', riderId);
      }

      const updatedVehicle = await db.collection('vehicles').doc(vehicleId).get();

      return res.json({
        success: true,
        message: 'שיוך הכלי בוטל בהצלחה',
        vehicle: { id: updatedVehicle.id, ...updatedVehicle.data() }
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
      const { search, status, type, page = 1, limit = 20 } = req.query;
      const limitNum = Math.min(parseInt(limit), 100); // מקסימום 100 לבקשה
      const pageNum = parseInt(page);

      let query = db.collection('vehicles');

      if (status) {
        query = query.where('status', '==', status);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

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
            // רוכב עם כלי משויך - החזר רק את הכלי הזה
            const vehicleDoc = await db.collection('vehicles').doc(riderData.assignedVehicleId).get();
            if (vehicleDoc.exists) {
              return res.status(200).json({
                success: true,
                count: 1,
                totalPages: 1,
                currentPage: 1,
                vehicles: [{ id: vehicleDoc.id, ...vehicleDoc.data() }]
              });
            }
          }
        }
        // אין כלי משויך או רוכב לא נמצא - החזר מערך ריק
        return res.status(200).json({
          success: true,
          count: 0,
          totalPages: 0,
          currentPage: 1,
          vehicles: []
        });
      }

      // אופטימיזציה: אם אין חיפוש, השתמש ב-Firestore pagination אמיתי
      if (!search) {
        // מיון לפי createdAt
        query = query.orderBy('createdAt', 'desc');

        // דילוג על תוצאות קודמות
        if (pageNum > 1) {
          const skipCount = (pageNum - 1) * limitNum;
          query = query.offset(skipCount);
        }

        query = query.limit(limitNum);

        const snapshot = await query.get();
        const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // ספירה כוללת
        const countSnapshot = await db.collection('vehicles').count().get();
        const totalCount = countSnapshot.data().count;

        return res.status(200).json({
          success: true,
          count: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          currentPage: pageNum,
          vehicles: vehicles
        });
      }

      // אם יש חיפוש - טען הכל וסנן
      const snapshot = await query.get();
      let vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const searchLower = search.toLowerCase();
      vehicles = vehicles.filter(vehicle =>
        vehicle.licensePlate?.toLowerCase().includes(searchLower) ||
        vehicle.internalNumber?.toLowerCase().includes(searchLower) ||
        vehicle.manufacturer?.toLowerCase().includes(searchLower) ||
        vehicle.model?.toLowerCase().includes(searchLower)
      );

      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = pageNum * limitNum;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        count: vehicles.length,
        totalPages: Math.ceil(vehicles.length / limitNum),
        currentPage: pageNum,
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
    console.error('Vehicles API error:', error.message, error.stack);

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
