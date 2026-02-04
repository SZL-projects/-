const { google } = require('googleapis');
const path = require('path');

// שמות התיקיות הראשיות
const ROOT_FOLDER_NAMES = {
  VEHICLES: 'כלים',
  RIDERS: 'רוכבים'
};

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
    this.rootFolderId = null;
    this.db = null;
    // Cache לתיקיות הראשיות
    this.vehiclesFolderId = null;
    this.ridersFolderId = null;
  }

  // הגדרת Firestore instance
  setFirestore(db) {
    this.db = db;
  }

  // קבלת OAuth2 client עם טוקנים מ-Firestore
  async getOAuth2Client() {
    if (!this.db) {
      throw new Error('Firestore not initialized. Call setFirestore(db) first.');
    }

    const settingsRef = this.db.collection('settings').doc('googleDrive');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists || !settingsDoc.data().tokens) {
      throw new Error('Google Drive לא מאומת. יש להתחבר דרך ממשק הניהול.');
    }

    const tokens = settingsDoc.data().tokens;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://tzi-log-yedidim.vercel.app/api/drive/oauth2callback'
    );

    oauth2Client.setCredentials(tokens);

    // בדוק אם הטוקן פג תוקף ורענן אותו
    // המר Firestore Timestamp למספר אם צריך
    const expiryDate = tokens.expiry_date?.toMillis ? tokens.expiry_date.toMillis() : tokens.expiry_date;
    const now = Date.now();

    // הוסף 5 דקות buffer - רענן 5 דקות לפני שפג תוקף
    const needsRefresh = !expiryDate || expiryDate < (now + 5 * 60 * 1000);

    if (needsRefresh) {
      console.log('Access token needs refresh. Expiry:', expiryDate, 'Now:', now);
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('New credentials received:', {
          has_access_token: !!credentials.access_token,
          has_refresh_token: !!credentials.refresh_token,
          expiry_date: credentials.expiry_date
        });

        const updatedTokens = {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token, // שמור refresh_token הישן אם לא קיבלנו חדש
          scope: credentials.scope || tokens.scope,
          token_type: credentials.token_type || tokens.token_type,
          expiry_date: credentials.expiry_date
        };

        await settingsRef.update({
          tokens: updatedTokens,
          updatedAt: new Date()
        });

        oauth2Client.setCredentials(updatedTokens);
        console.log('Access token refreshed successfully');
      } catch (error) {
        console.error('Failed to refresh access token:', error);
        // אם הרענון נכשל, נסה להשתמש בטוקן הקיים ונקווה שעדיין תקף
        console.log('Attempting to continue with existing token...');
      }
    }

    // טיפול באוטומטי ברענון טוקן עתידי
    oauth2Client.on('tokens', async (newTokens) => {
      console.log('Auto-refreshing Google Drive tokens...');

      const updatedTokens = {
        ...tokens,
        ...newTokens
      };

      await settingsRef.update({
        tokens: updatedTokens,
        updatedAt: new Date()
      });
    });

    return oauth2Client;
  }

  // אתחול ה-Drive API
  async initialize() {
    try {
      // יצירת OAuth2 client עם הטוקנים השמורים
      const auth = await this.getOAuth2Client();

      this.drive = google.drive({ version: 'v3', auth });

      // הגדרת תיקיית ROOT (אם קיימת במשתני סביבה)
      this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '186mat7V_XgO02xkmIqjQXeZDs26S1SFY';

      this.initialized = true;
      console.log('Google Drive service initialized successfully with OAuth2');
      console.log('Root folder ID:', this.rootFolderId);
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
      return false;
    }
  }

  // מתן הרשאות לתיקייה/קובץ
  async shareFile(fileId, emailAddress = null, role = 'writer') {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // אם לא צוין email, תן הרשאות לכולם עם הלינק
      const permission = emailAddress
        ? {
            type: 'user',
            role: role, // owner, organizer, fileOrganizer, writer, commenter, reader
            emailAddress: emailAddress
          }
        : {
            type: 'anyone',
            role: 'reader' // כולם יכולים לקרוא
          };

      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: permission,
        fields: 'id',
        supportsAllDrives: true
      });

      console.log(`Shared file ${fileId} with ${emailAddress || 'anyone'}`);
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  // חיפוש תיקייה לפי שם בתוך תיקיית אב
  async findFolderByName(folderName, parentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const response = await this.drive.files.list({
        q: `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, webViewLink)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0];
      }
      return null;
    } catch (error) {
      console.error('Error finding folder:', error);
      throw error;
    }
  }

  // חיפוש או יצירת תיקייה (אם לא קיימת)
  async findOrCreateFolder(folderName, parentId, shareWithEmail = null) {
    const existingFolder = await this.findFolderByName(folderName, parentId);
    if (existingFolder) {
      return existingFolder;
    }
    return await this.createFolder(folderName, parentId, shareWithEmail);
  }

  // קבלת/יצירת תיקיית כלים הראשית
  async getOrCreateVehiclesFolder() {
    if (this.vehiclesFolderId) {
      return this.vehiclesFolderId;
    }

    const folder = await this.findOrCreateFolder(ROOT_FOLDER_NAMES.VEHICLES, this.rootFolderId);
    this.vehiclesFolderId = folder.id;
    return folder.id;
  }

  // קבלת/יצירת תיקיית רוכבים הראשית
  async getOrCreateRidersFolder() {
    if (this.ridersFolderId) {
      return this.ridersFolderId;
    }

    const folder = await this.findOrCreateFolder(ROOT_FOLDER_NAMES.RIDERS, this.rootFolderId);
    this.ridersFolderId = folder.id;
    return folder.id;
  }

  // קבלת כל התיקיות בתיקיית אב
  async listFolders(parentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const response = await this.drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, webViewLink)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing folders:', error);
      throw error;
    }
  }

  // העברת תיקייה לתיקיית יעד אחרת
  async moveFolder(folderId, newParentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const file = await this.drive.files.get({
        fileId: folderId,
        fields: 'parents',
        supportsAllDrives: true
      });

      const previousParents = file.data.parents ? file.data.parents.join(',') : '';

      const response = await this.drive.files.update({
        fileId: folderId,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true
      });

      console.log(`Moved folder ${folderId} to ${newParentId}`);
      return response.data;
    } catch (error) {
      console.error('Error moving folder:', error);
      throw error;
    }
  }

  // יצירת תיקייה
  async createFolder(folderName, parentId = null, shareWithEmail = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      // שיתוף התיקייה
      if (shareWithEmail) {
        await this.shareFile(response.data.id, shareWithEmail, 'writer');
      } else {
        // תן הרשאות לכולם עם הלינק
        await this.shareFile(response.data.id, null, 'reader');
      }

      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // יצירת מבנה תיקיות לכלי
  async createVehicleFolderStructure(vehicleIdentifier) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // תיקייה ראשית של הכלי - בתוך תיקיית ה-ROOT
      const mainFolder = await this.createFolder(vehicleIdentifier, this.rootFolderId);
      console.log(`Created main folder: ${mainFolder.name} (${mainFolder.id}) in root folder ${this.rootFolderId}`);

      // תיקיית ביטוחים נוכחיים
      const insuranceFolder = await this.createFolder('ביטוחים נוכחיים', mainFolder.id);
      console.log(`Created insurance folder: ${insuranceFolder.name} (${insuranceFolder.id})`);

      // תיקיית ביטוחים ישנים (ארכיון)
      const archiveFolder = await this.createFolder('ביטוחים ישנים', mainFolder.id);
      console.log(`Created archive folder: ${archiveFolder.name} (${archiveFolder.id})`);

      // תיקיית טיפולים
      const maintenanceFolder = await this.createFolder('טיפולים', mainFolder.id);
      console.log(`Created maintenance folder: ${maintenanceFolder.name} (${maintenanceFolder.id})`);

      // תיקיית "נוספים" - מכילה את כל התיקיות הלא-קבועות
      const extrasFolder = await this.createFolder('נוספים', mainFolder.id);
      console.log(`Created extras folder: ${extrasFolder.name} (${extrasFolder.id})`);

      // תיקיית תמונות - בתוך "נוספים"
      const photosFolder = await this.createFolder('תמונות כלי', extrasFolder.id);
      console.log(`Created photos folder: ${photosFolder.name} (${photosFolder.id})`);

      // תיקיית שונות - בתוך "נוספים"
      const miscFolder = await this.createFolder('שונות', extrasFolder.id);
      console.log(`Created misc folder: ${miscFolder.name} (${miscFolder.id})`);

      return {
        mainFolderId: mainFolder.id,
        mainFolderLink: mainFolder.webViewLink,
        insuranceFolderId: insuranceFolder.id,
        insuranceFolderLink: insuranceFolder.webViewLink,
        archiveFolderId: archiveFolder.id,
        archiveFolderLink: archiveFolder.webViewLink,
        maintenanceFolderId: maintenanceFolder.id,
        maintenanceFolderLink: maintenanceFolder.webViewLink,
        extrasFolderId: extrasFolder.id,
        extrasFolderLink: extrasFolder.webViewLink,
        photosFolderId: photosFolder.id,
        photosFolderLink: photosFolder.webViewLink,
        miscFolderId: miscFolder.id,
        miscFolderLink: miscFolder.webViewLink,
        customFolders: [] // מערך לתיקיות מותאמות אישית (בתוך "נוספים")
      };
    } catch (error) {
      console.error('Error creating vehicle folder structure:', error);
      throw error;
    }
  }

  // יצירת תיקיית רוכב בתוך תיקיית הביטוחים
  async createRiderFolder(riderName, insuranceFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const riderFolder = await this.createFolder(riderName, insuranceFolderId);

      return {
        riderId: riderFolder.id,
        riderLink: riderFolder.webViewLink
      };
    } catch (error) {
      console.error('Error creating rider folder:', error);
      throw error;
    }
  }

  // יצירת מבנה תיקיות לרוכב (תיקייה עצמאית תחת "רוכבים")
  async createRiderFolderStructure(riderName) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // קבלת/יצירת תיקיית "רוכבים" הראשית
      const ridersFolderId = await this.getOrCreateRidersFolder();
      console.log(`Using riders folder: ${ridersFolderId}`);

      // תיקייה ראשית של הרוכב - בתוך תיקיית "רוכבים"
      const mainFolder = await this.findOrCreateFolder(riderName, ridersFolderId);
      console.log(`Created/Found rider main folder: ${mainFolder.name} (${mainFolder.id})`);

      // תיקיית מסמכים (קבועה)
      const documentsFolder = await this.findOrCreateFolder('מסמכים', mainFolder.id);
      console.log(`Created/Found documents folder: ${documentsFolder.name} (${documentsFolder.id})`);

      // תיקיית רישיונות (קבועה)
      const licensesFolder = await this.findOrCreateFolder('רישיונות', mainFolder.id);
      console.log(`Created/Found licenses folder: ${licensesFolder.name} (${licensesFolder.id})`);

      // תיקיית "נוספים" - מכילה תיקיות מותאמות אישית
      const extrasFolder = await this.findOrCreateFolder('נוספים', mainFolder.id);
      console.log(`Created/Found extras folder: ${extrasFolder.name} (${extrasFolder.id})`);

      return {
        mainFolderId: mainFolder.id,
        mainFolderLink: mainFolder.webViewLink,
        documentsFolderId: documentsFolder.id,
        documentsFolderLink: documentsFolder.webViewLink,
        licensesFolderId: licensesFolder.id,
        licensesFolderLink: licensesFolder.webViewLink,
        extrasFolderId: extrasFolder.id,
        extrasFolderLink: extrasFolder.webViewLink,
        customFolders: [] // מערך לתיקיות מותאמות אישית (בתוך "נוספים")
      };
    } catch (error) {
      console.error('Error creating rider folder structure:', error);
      throw error;
    }
  }

  // ריענון וסידור מבנה התיקיות בדרייב
  async refreshDriveFolders(vehicles = [], riders = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    const results = {
      vehiclesFolderCreated: false,
      ridersFolderCreated: false,
      vehiclesProcessed: 0,
      ridersProcessed: 0,
      vehiclesMoved: 0,
      ridersMoved: 0,
      vehiclesCreated: 0,
      ridersCreated: 0,
      errors: []
    };

    try {
      console.log('Starting Drive folders refresh...');

      // 1. יצירת/וידוא תיקיות ראשיות
      let vehiclesFolder = await this.findFolderByName(ROOT_FOLDER_NAMES.VEHICLES, this.rootFolderId);
      if (!vehiclesFolder) {
        vehiclesFolder = await this.createFolder(ROOT_FOLDER_NAMES.VEHICLES, this.rootFolderId);
        results.vehiclesFolderCreated = true;
        console.log('Created vehicles root folder');
      }
      this.vehiclesFolderId = vehiclesFolder.id;

      let ridersFolder = await this.findFolderByName(ROOT_FOLDER_NAMES.RIDERS, this.rootFolderId);
      if (!ridersFolder) {
        ridersFolder = await this.createFolder(ROOT_FOLDER_NAMES.RIDERS, this.rootFolderId);
        results.ridersFolderCreated = true;
        console.log('Created riders root folder');
      }
      this.ridersFolderId = ridersFolder.id;

      // 2. עיבוד כלים
      console.log(`Processing ${vehicles.length} vehicles...`);
      for (const vehicle of vehicles) {
        try {
          if (!vehicle.internalNumber) continue;
          results.vehiclesProcessed++;

          if (vehicle.driveFolderData?.mainFolderId) {
            const existingInVehicles = await this.findFolderByName(vehicle.internalNumber, vehiclesFolder.id);
            if (!existingInVehicles) {
              try {
                await this.moveFolder(vehicle.driveFolderData.mainFolderId, vehiclesFolder.id);
                results.vehiclesMoved++;
                console.log(`Moved vehicle folder ${vehicle.internalNumber} to vehicles folder`);
              } catch (moveError) {
                console.log(`Could not move folder, creating new structure for ${vehicle.internalNumber}`);
                results.vehiclesCreated++;
              }
            }
          } else {
            results.vehiclesCreated++;
            console.log(`Vehicle ${vehicle.internalNumber} needs new folder structure`);
          }
        } catch (vehicleError) {
          console.error(`Error processing vehicle ${vehicle.internalNumber}:`, vehicleError);
          results.errors.push({ type: 'vehicle', identifier: vehicle.internalNumber, error: vehicleError.message });
        }
      }

      // 3. עיבוד רוכבים
      console.log(`Processing ${riders.length} riders...`);
      for (const rider of riders) {
        try {
          const riderName = `${rider.firstName} ${rider.lastName}`.trim();
          if (!riderName) continue;
          results.ridersProcessed++;

          if (rider.driveFolderData?.mainFolderId) {
            const existingInRiders = await this.findFolderByName(riderName, ridersFolder.id);
            if (!existingInRiders) {
              try {
                await this.moveFolder(rider.driveFolderData.mainFolderId, ridersFolder.id);
                results.ridersMoved++;
                console.log(`Moved rider folder ${riderName} to riders folder`);
              } catch (moveError) {
                console.log(`Could not move folder, creating new structure for ${riderName}`);
                results.ridersCreated++;
              }
            }
          } else {
            results.ridersCreated++;
            console.log(`Rider ${riderName} needs new folder structure`);
          }
        } catch (riderError) {
          console.error(`Error processing rider ${rider.firstName} ${rider.lastName}:`, riderError);
          results.errors.push({ type: 'rider', identifier: `${rider.firstName} ${rider.lastName}`, error: riderError.message });
        }
      }

      console.log('Drive folders refresh completed:', results);
      return results;
    } catch (error) {
      console.error('Error refreshing Drive folders:', error);
      throw error;
    }
  }

  // העלאת קובץ
  async uploadFile(fileName, fileContent, folderId, mimeType) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const { Readable } = require('stream');

      // וודא שהשם בקידוד UTF-8 תקין
      const safeFileName = Buffer.from(fileName, 'utf-8').toString('utf-8');
      console.log('Original fileName:', fileName);
      console.log('Safe fileName:', safeFileName);

      // המרת Buffer ל-stream
      const bufferStream = new Readable();
      bufferStream.push(fileContent);
      bufferStream.push(null); // מסמן סוף ה-stream

      const fileMetadata = {
        name: safeFileName,
        parents: [folderId]
      };

      const media = {
        mimeType: mimeType,
        body: bufferStream
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size, createdTime, mimeType',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      console.log('File uploaded to Drive with name:', response.data.name);

      // שיתוף הקובץ
      await this.shareFile(response.data.id, null, 'reader');

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // קבלת רשימת קבצים בתיקייה
  async listFiles(folderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
        orderBy: 'createdTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      return response.data.files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // מחיקת קובץ או תיקייה (מטפל ב-multiple parents)
  async deleteFile(fileId, recursive = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // אם recursive=true, נמחק קודם את כל הקבצים בתוך התיקייה
      if (recursive) {
        console.log(`🗑️ Starting recursive delete for folder: ${fileId}`);

        // קבלת כל הקבצים והתיקיות בתוך התיקייה הזו
        const files = await this.listFiles(fileId);

        console.log(`Found ${files.length} items to delete`);

        // מחיקת כל קובץ/תיקייה רקורסיבית
        for (const file of files) {
          try {
            // בדיקה אם זו תיקייה
            const fileInfo = await this.drive.files.get({
              fileId: file.id,
              fields: 'mimeType, parents',
              supportsAllDrives: true
            });

            const isFolder = fileInfo.data.mimeType === 'application/vnd.google-apps.folder';

            if (isFolder) {
              // תיקייה - מחיקה רקורסיבית
              await this.deleteFile(file.id, true);
            } else {
              // קובץ - בדיקה אם יש לו multiple parents
              const parents = fileInfo.data.parents || [];

              if (parents.length > 1) {
                // יש יותר מ-parent אחד - נסיר רק את הקישור לתיקייה הזו
                console.log(`File ${file.name} has multiple parents, removing link only`);
                await this.drive.files.update({
                  fileId: file.id,
                  removeParents: fileId,
                  fields: 'id, name, parents',
                  supportsAllDrives: true
                });
              } else {
                // parent יחיד - מחיקה מלאה
                await this.drive.files.delete({
                  fileId: file.id,
                  supportsAllDrives: true
                });
              }
            }

            console.log(`✅ Deleted: ${file.name}`);
          } catch (err) {
            console.error(`❌ Failed to delete ${file.name}:`, err.message);
            // ממשיכים למחוק את השאר גם אם נכשל אחד
          }
        }
      }

      // מחיקת התיקייה/קובץ עצמו
      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true
      });

      console.log(`✅ Deleted folder/file: ${fileId}`);
      return { success: true, message: 'File/folder deleted successfully' };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // העברת קובץ לתיקייה אחרת
  async moveFile(fileId, newParentFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // קבלת המידע הנוכחי של הקובץ כולל התיקייה הנוכחית
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'parents',
        supportsAllDrives: true
      });

      const previousParents = file.data.parents?.join(',') || '';

      // העברת הקובץ לתיקייה החדשה
      const response = await this.drive.files.update({
        fileId: fileId,
        addParents: newParentFolderId,
        removeParents: previousParents,
        fields: 'id, name, parents, webViewLink',
        supportsAllDrives: true
      });

      console.log(`File ${fileId} moved to folder ${newParentFolderId}`);
      return response.data;
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  }

  // שינוי שם קובץ או תיקייה
  async renameFile(fileId, newName) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const response = await this.drive.files.update({
        fileId: fileId,
        requestBody: {
          name: newName
        },
        fields: 'id, name, webViewLink',
        supportsAllDrives: true
      });

      console.log(`Renamed file ${fileId} to ${newName}`);
      return response.data;
    } catch (error) {
      console.error('Error renaming file:', error);
      throw error;
    }
  }

  // קבלת קישור לתיקייה
  async getFolderLink(folderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'webViewLink'
      });

      return response.data.webViewLink;
    } catch (error) {
      console.error('Error getting folder link:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
