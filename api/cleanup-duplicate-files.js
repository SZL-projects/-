// Vercel Serverless Function - /api/cleanup-duplicate-files
// Admin endpoint to fix duplicate files issue
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');
const googleDriveService = require('./services/googleDriveService');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    // Initialize Google Drive service
    googleDriveService.setFirestore(db);
    await googleDriveService.initialize();

    // Only super_admin can run this
    checkAuthorization(user, ['super_admin']);

    if (req.method === 'POST') {
      const { vehicleId, action } = req.body;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          message: 'vehicleId is required'
        });
      }

      // Get vehicle
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: `Vehicle ${vehicleId} not found`
        });
      }

      const vehicleData = vehicleDoc.data();
      const { insuranceFolderId, archiveFolderId } = vehicleData;

      if (!insuranceFolderId || !archiveFolderId) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle missing insuranceFolderId or archiveFolderId'
        });
      }

      console.log('🧹 Cleanup starting:', {
        vehicleId,
        insuranceFolderId,
        archiveFolderId,
        action
      });

      if (action === 'list') {
        // List files in both folders
        const insuranceFiles = await googleDriveService.listFiles(insuranceFolderId);
        const archiveFiles = await googleDriveService.listFiles(archiveFolderId);

        return res.json({
          success: true,
          message: 'Files listed successfully',
          data: {
            insuranceFiles: insuranceFiles.map(f => ({ id: f.id, name: f.name })),
            archiveFiles: archiveFiles.map(f => ({ id: f.id, name: f.name })),
            insuranceCount: insuranceFiles.length,
            archiveCount: archiveFiles.length
          }
        });
      }

      if (action === 'clear-archive') {
        // Delete all files from archive folder
        const archiveFiles = await googleDriveService.listFiles(archiveFolderId);

        console.log(`🗑️ Deleting ${archiveFiles.length} files from archive...`);

        const deleteResults = [];
        for (const file of archiveFiles) {
          try {
            await googleDriveService.deleteFile(file.id);
            deleteResults.push({ id: file.id, name: file.name, status: 'deleted' });
            console.log(`✅ Deleted: ${file.name}`);
          } catch (error) {
            deleteResults.push({ id: file.id, name: file.name, status: 'error', error: error.message });
            console.error(`❌ Failed to delete: ${file.name}`, error);
          }
        }

        return res.json({
          success: true,
          message: `Deleted ${deleteResults.filter(r => r.status === 'deleted').length} files from archive`,
          data: {
            deleted: deleteResults.filter(r => r.status === 'deleted').length,
            failed: deleteResults.filter(r => r.status === 'error').length,
            results: deleteResults
          }
        });
      }

      if (action === 'remove-duplicates') {
        // Get files from both folders
        const insuranceFiles = await googleDriveService.listFiles(insuranceFolderId);
        const archiveFiles = await googleDriveService.listFiles(archiveFolderId);

        console.log(`📊 Insurance files: ${insuranceFiles.length}, Archive files: ${archiveFiles.length}`);

        // Find files that are in both folders (by checking if they have multiple parents)
        const duplicates = [];
        const movedFromArchive = [];

        for (const archiveFile of archiveFiles) {
          // Check if this file also exists in insurance folder
          const existsInInsurance = insuranceFiles.some(f => f.id === archiveFile.id);

          if (existsInInsurance) {
            duplicates.push(archiveFile);
            // Remove from archive folder only (keep in insurance)
            try {
              // Get file's current parents
              const fileInfo = await googleDriveService.drive.files.get({
                fileId: archiveFile.id,
                fields: 'parents',
                supportsAllDrives: true
              });

              // Remove only the archive folder parent
              await googleDriveService.drive.files.update({
                fileId: archiveFile.id,
                removeParents: archiveFolderId,
                fields: 'id, name, parents',
                supportsAllDrives: true
              });

              movedFromArchive.push({ id: archiveFile.id, name: archiveFile.name, status: 'removed-from-archive' });
              console.log(`✅ Removed duplicate from archive: ${archiveFile.name}`);
            } catch (error) {
              console.error(`❌ Failed to remove from archive: ${archiveFile.name}`, error);
            }
          }
        }

        return res.json({
          success: true,
          message: `Found and fixed ${duplicates.length} duplicate files`,
          data: {
            duplicatesFound: duplicates.length,
            fixedCount: movedFromArchive.length,
            results: movedFromArchive
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use: list, clear-archive, or remove-duplicates'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Cleanup error:', error);

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
