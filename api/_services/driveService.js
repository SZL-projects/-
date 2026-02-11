const { google } = require('googleapis');

class DriveService {
  constructor() {
    this.drive = null;
    this.rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    this.initializeDrive();
  }

  initializeDrive() {
    try {
      if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT) {
        console.error('GOOGLE_DRIVE_SERVICE_ACCOUNT not found');
        return;
      }

      const serviceAccount = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT);

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Error initializing Drive:', error);
    }
  }

  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId || this.rootFolderId],
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name',
      });

      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async findFolder(folderName, parentFolderId = null) {
    try {
      const parent = parentFolderId || this.rootFolderId;

      const response = await this.drive.files.list({
        q: `name='${folderName}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
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

  async getOrCreateFolder(folderName, parentFolderId = null) {
    try {
      const existingFolder = await this.findFolder(folderName, parentFolderId);

      if (existingFolder) {
        return existingFolder;
      }

      return await this.createFolder(folderName, parentFolderId);
    } catch (error) {
      console.error('Error in getOrCreateFolder:', error);
      throw error;
    }
  }

  async createVehicleFolderStructure(vehicleNumber) {
    try {
      const vehiclesFolder = await this.getOrCreateFolder('כלים');

      const vehicleFolder = await this.getOrCreateFolder(
        `אופנוע ${vehicleNumber}`,
        vehiclesFolder.id
      );

      const categories = ['ביטוח', 'רישיון', 'תמונות', 'דוחות'];
      const categoryFolders = {};

      for (const category of categories) {
        const folder = await this.getOrCreateFolder(category, vehicleFolder.id);
        categoryFolders[category] = folder.id;
      }

      return {
        vehicleFolderId: vehicleFolder.id,
        categoryFolders,
      };
    } catch (error) {
      console.error('Error creating vehicle folder structure:', error);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: fileBuffer,
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink',
      });

      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async listFiles(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, thumbnailLink)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

module.exports = new DriveService();
