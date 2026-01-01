const { google } = require('googleapis');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
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
      this.initialized = true;
      console.log('Google Drive service initialized successfully');
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
        fields: 'id'
      });

      console.log(`Shared file ${fileId} with ${emailAddress || 'anyone'}`);
    } catch (error) {
      console.error('Error sharing file:', error);
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
        fields: 'id, name, webViewLink'
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
      // תיקייה ראשית של הכלי
      const mainFolder = await this.createFolder(vehicleIdentifier);
      console.log(`Created main folder: ${mainFolder.name} (${mainFolder.id})`);

      // תיקיית ביטוחים
      const insuranceFolder = await this.createFolder('ביטוחים', mainFolder.id);
      console.log(`Created insurance folder: ${insuranceFolder.name} (${insuranceFolder.id})`);

      // תיקיית תמונות
      const photosFolder = await this.createFolder('תמונות כלי', mainFolder.id);
      console.log(`Created photos folder: ${photosFolder.name} (${photosFolder.id})`);

      return {
        mainFolderId: mainFolder.id,
        mainFolderLink: mainFolder.webViewLink,
        insuranceFolderId: insuranceFolder.id,
        insuranceFolderLink: insuranceFolder.webViewLink,
        photosFolderId: photosFolder.id,
        photosFolderLink: photosFolder.webViewLink
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

  // העלאת קובץ
  async uploadFile(fileName, fileContent, folderId, mimeType) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: mimeType,
        body: fileContent
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size, createdTime, mimeType'
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
        orderBy: 'createdTime desc'
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
        fileId: fileId
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
}

module.exports = new GoogleDriveService();
