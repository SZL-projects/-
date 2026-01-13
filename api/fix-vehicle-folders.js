// Vercel Serverless Function - /api/fix-vehicle-folders
// Admin endpoint to fix missing folder IDs for a vehicle
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');

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

    // Only super_admin can run this
    checkAuthorization(user, ['super_admin']);

    if (req.method === 'POST') {
      const { vehicleId, insuranceFolderId, archiveFolderId, photosFolderId } = req.body;

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

      const currentData = vehicleDoc.data();

      // Build update object with only provided fields
      const updateData = {
        updatedBy: user.id,
        updatedAt: new Date()
      };

      if (insuranceFolderId) updateData.insuranceFolderId = insuranceFolderId;
      if (archiveFolderId) updateData.archiveFolderId = archiveFolderId;
      if (photosFolderId) updateData.photosFolderId = photosFolderId;

      console.log('🔧 Fixing vehicle folders:', {
        vehicleId,
        before: {
          insuranceFolderId: currentData.insuranceFolderId || 'MISSING',
          archiveFolderId: currentData.archiveFolderId || 'MISSING',
          photosFolderId: currentData.photosFolderId || 'MISSING'
        },
        updates: updateData
      });

      await vehicleRef.update(updateData);

      // Get updated data
      const updatedDoc = await vehicleRef.get();
      const updatedData = updatedDoc.data();

      return res.json({
        success: true,
        message: 'Vehicle folder IDs updated successfully',
        data: {
          vehicleId,
          licensePlate: updatedData.licensePlate,
          internalNumber: updatedData.internalNumber,
          insuranceFolderId: updatedData.insuranceFolderId,
          archiveFolderId: updatedData.archiveFolderId,
          photosFolderId: updatedData.photosFolderId
        }
      });
    }

    if (req.method === 'GET') {
      // List all vehicles with their folder IDs
      const vehiclesSnapshot = await db.collection('vehicles').get();
      const vehicles = vehiclesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          licensePlate: data.licensePlate,
          internalNumber: data.internalNumber,
          insuranceFolderId: data.insuranceFolderId || null,
          archiveFolderId: data.archiveFolderId || null,
          photosFolderId: data.photosFolderId || null,
          hasMissingFolders: !data.insuranceFolderId || !data.archiveFolderId || !data.photosFolderId
        };
      });

      const vehiclesWithMissingFolders = vehicles.filter(v => v.hasMissingFolders);

      return res.json({
        success: true,
        totalVehicles: vehicles.length,
        vehiclesWithMissingFolders: vehiclesWithMissingFolders.length,
        vehicles: vehiclesWithMissingFolders
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Fix vehicle folders error:', error);

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
