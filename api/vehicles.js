// Vercel Serverless Function - /api/vehicles (all vehicle endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    // Extract ID from URL
    const vehicleId = extractIdFromUrl(req.url, 'vehicles');

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
        checkAuthorization(user, ['super_admin', 'manager', 'logistics']);

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
      const { search, status, page = 1, limit = 50 } = req.query;

      let query = db.collection('vehicles');

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      let vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
      checkAuthorization(user, ['super_admin', 'manager', 'logistics']);

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
