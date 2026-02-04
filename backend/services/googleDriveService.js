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
    // Cache לתיקיות הראשיות
    this.vehiclesFolderId = null;
    this.ridersFolderId = null;
  }

  // אתחול ה-Drive API
  async initialize() {
    try {
      // אפשרויות לאימות:
      // 1. Service Account (מומלץ לשרת)
      // 2. OAuth2 (למשתמשים)

      // בדיקה אם יש Service Account credentials
      const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
        : null;

      if (!credentials) {
        console.warn('Google Drive credentials not found. Set GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
        return false;
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      this.drive = google.drive({ version: 'v3', auth });

      // הגדרת תיקיית ROOT (אם קיימת במשתני סביבה)
      this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '186mat7V_XgO02xkmIqjQXeZDs26S1SFY';

      this.initialized = true;
      console.log('Google Drive service initialized successfully');
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
    // חיפוש קודם
    const existingFolder = await this.findFolderByName(folderName, parentId);
    if (existingFolder) {
      return existingFolder;
    }
    // יצירה אם לא קיימת
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
  // vehicleIdentifier - מספר פנימי של הכלי
  async createVehicleFolderStructure(vehicleIdentifier) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // קבלת/יצירת תיקיית "כלים" הראשית
      const vehiclesFolderId = await this.getOrCreateVehiclesFolder();
      console.log(`Using vehicles folder: ${vehiclesFolderId}`);

      // תיקייה ראשית של הכלי - בתוך תיקיית "כלים"
      const mainFolder = await this.findOrCreateFolder(vehicleIdentifier, vehiclesFolderId);
      console.log(`Created/Found main folder: ${mainFolder.name} (${mainFolder.id}) in vehicles folder`);

      // תיקיית ביטוחים
      const insuranceFolder = await this.findOrCreateFolder('ביטוחים', mainFolder.id);
      console.log(`Created/Found insurance folder: ${insuranceFolder.name} (${insuranceFolder.id})`);

      // תיקיית טיפולים
      const maintenanceFolder = await this.findOrCreateFolder('טיפולים', mainFolder.id);
      console.log(`Created/Found maintenance folder: ${maintenanceFolder.name} (${maintenanceFolder.id})`);

      // תיקיית תמונות
      const photosFolder = await this.findOrCreateFolder('תמונות כלי', mainFolder.id);
      console.log(`Created/Found photos folder: ${photosFolder.name} (${photosFolder.id})`);

      return {
        mainFolderId: mainFolder.id,
        mainFolderLink: mainFolder.webViewLink,
        insuranceFolderId: insuranceFolder.id,
        insuranceFolderLink: insuranceFolder.webViewLink,
        maintenanceFolderId: maintenanceFolder.id,
        maintenanceFolderLink: maintenanceFolder.webViewLink,
        photosFolderId: photosFolder.id,
        photosFolderLink: photosFolder.webViewLink
      };
    } catch (error) {
      console.error('Error creating vehicle folder structure:', error);
      throw error;
    }
  }

  // יצירת תיקיית רוכב בתוך תיקיית הביטוחים (לשימוש פנימי בכלי)
  async createRiderFolder(riderName, insuranceFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const riderFolder = await this.findOrCreateFolder(riderName, insuranceFolderId);

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
  // riderName - שם מלא של הרוכב
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

      // תיקיית מסמכים
      const documentsFolder = await this.findOrCreateFolder('מסמכים', mainFolder.id);
      console.log(`Created/Found documents folder: ${documentsFolder.name} (${documentsFolder.id})`);

      // תיקיית רישיונות
      const licensesFolder = await this.findOrCreateFolder('רישיונות', mainFolder.id);
      console.log(`Created/Found licenses folder: ${licensesFolder.name} (${licensesFolder.id})`);

      return {
        mainFolderId: mainFolder.id,
        mainFolderLink: mainFolder.webViewLink,
        documentsFolderId: documentsFolder.id,
        documentsFolderLink: documentsFolder.webViewLink,
        licensesFolderId: licensesFolder.id,
        licensesFolderLink: licensesFolder.webViewLink
      };
    } catch (error) {
      console.error('Error creating rider folder structure:', error);
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

      // המרת Buffer ל-stream
      const bufferStream = new Readable();
      bufferStream.push(fileContent);
      bufferStream.push(null); // מסמן סוף ה-stream

      const fileMetadata = {
        name: fileName,
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

  // מחיקת קובץ
  async deleteFile(fileId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true
      });

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Error deleting file:', error);
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
      // קבלת המידע על התיקייה הנוכחית כולל ההורים
      const file = await this.drive.files.get({
        fileId: folderId,
        fields: 'parents',
        supportsAllDrives: true
      });

      const previousParents = file.data.parents ? file.data.parents.join(',') : '';

      // העברה לתיקייה החדשה
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

  // ריענון וסידור מבנה התיקיות בדרייב
  // vehicles - מערך של כלים מהמערכת {internalNumber, driveFolderData}
  // riders - מערך של רוכבים מהמערכת {firstName, lastName, driveFolderData}
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
      // 1. יצירת/וידוא תיקיות ראשיות
      console.log('Starting Drive folders refresh...');

      // בדיקה אם תיקיית "כלים" כבר קיימת
      let vehiclesFolder = await this.findFolderByName(ROOT_FOLDER_NAMES.VEHICLES, this.rootFolderId);
      if (!vehiclesFolder) {
        vehiclesFolder = await this.createFolder(ROOT_FOLDER_NAMES.VEHICLES, this.rootFolderId);
        results.vehiclesFolderCreated = true;
        console.log('Created vehicles root folder');
      }
      this.vehiclesFolderId = vehiclesFolder.id;

      // בדיקה אם תיקיית "רוכבים" כבר קיימת
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
          if (!vehicle.internalNumber) {
            console.log(`Skipping vehicle without internal number`);
            continue;
          }

          results.vehiclesProcessed++;

          // בדיקה אם יש כבר תיקייה בדרייב
          if (vehicle.driveFolderData?.mainFolderId) {
            // בדיקה אם התיקייה קיימת תחת "כלים"
            const existingInVehicles = await this.findFolderByName(vehicle.internalNumber, vehiclesFolder.id);
            if (!existingInVehicles) {
              // התיקייה לא תחת "כלים" - ננסה להעביר או ליצור מחדש
              try {
                await this.moveFolder(vehicle.driveFolderData.mainFolderId, vehiclesFolder.id);
                results.vehiclesMoved++;
                console.log(`Moved vehicle folder ${vehicle.internalNumber} to vehicles folder`);
              } catch (moveError) {
                // אם ההעברה נכשלה, ניצור מבנה חדש
                console.log(`Could not move folder, creating new structure for ${vehicle.internalNumber}`);
                await this.createVehicleFolderStructure(vehicle.internalNumber);
                results.vehiclesCreated++;
              }
            }
          } else {
            // אין תיקייה - ניצור חדשה
            await this.createVehicleFolderStructure(vehicle.internalNumber);
            results.vehiclesCreated++;
            console.log(`Created new folder structure for vehicle ${vehicle.internalNumber}`);
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
          if (!riderName) {
            console.log(`Skipping rider without name`);
            continue;
          }

          results.ridersProcessed++;

          // בדיקה אם יש כבר תיקייה בדרייב
          if (rider.driveFolderData?.mainFolderId) {
            // בדיקה אם התיקייה קיימת תחת "רוכבים"
            const existingInRiders = await this.findFolderByName(riderName, ridersFolder.id);
            if (!existingInRiders) {
              // התיקייה לא תחת "רוכבים" - ננסה להעביר או ליצור מחדש
              try {
                await this.moveFolder(rider.driveFolderData.mainFolderId, ridersFolder.id);
                results.ridersMoved++;
                console.log(`Moved rider folder ${riderName} to riders folder`);
              } catch (moveError) {
                // אם ההעברה נכשלה, ניצור מבנה חדש
                console.log(`Could not move folder, creating new structure for ${riderName}`);
                await this.createRiderFolderStructure(riderName);
                results.ridersCreated++;
              }
            }
          } else {
            // אין תיקייה - ניצור חדשה
            await this.createRiderFolderStructure(riderName);
            results.ridersCreated++;
            console.log(`Created new folder structure for rider ${riderName}`);
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

  // קבלת מבנה התיקיות הנוכחי בדרייב
  async getDriveFolderStructure() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // חיפוש תיקיות ראשיות
      const vehiclesFolder = await this.findFolderByName(ROOT_FOLDER_NAMES.VEHICLES, this.rootFolderId);
      const ridersFolder = await this.findFolderByName(ROOT_FOLDER_NAMES.RIDERS, this.rootFolderId);

      const structure = {
        rootFolderId: this.rootFolderId,
        vehiclesFolder: vehiclesFolder ? {
          id: vehiclesFolder.id,
          name: vehiclesFolder.name,
          link: vehiclesFolder.webViewLink,
          subfolders: await this.listFolders(vehiclesFolder.id)
        } : null,
        ridersFolder: ridersFolder ? {
          id: ridersFolder.id,
          name: ridersFolder.name,
          link: ridersFolder.webViewLink,
          subfolders: await this.listFolders(ridersFolder.id)
        } : null
      };

      return structure;
    } catch (error) {
      console.error('Error getting Drive folder structure:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
