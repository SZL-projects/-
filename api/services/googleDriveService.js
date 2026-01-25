const { google } = require('googleapis');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
    this.rootFolderId = null;
    this.db = null;
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

      // תיקיית תמונות
      const photosFolder = await this.createFolder('תמונות כלי', mainFolder.id);
      console.log(`Created photos folder: ${photosFolder.name} (${photosFolder.id})`);

      // תיקיית שונות
      const miscFolder = await this.createFolder('שונות', mainFolder.id);
      console.log(`Created misc folder: ${miscFolder.name} (${miscFolder.id})`);

      return {
        mainFolderId: mainFolder.id,
        mainFolderLink: mainFolder.webViewLink,
        insuranceFolderId: insuranceFolder.id,
        insuranceFolderLink: insuranceFolder.webViewLink,
        archiveFolderId: archiveFolder.id,
        archiveFolderLink: archiveFolder.webViewLink,
        photosFolderId: photosFolder.id,
        photosFolderLink: photosFolder.webViewLink,
        miscFolderId: miscFolder.id,
        miscFolderLink: miscFolder.webViewLink,
        customFolders: [] // מערך לתיקיות מותאמות אישית
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
