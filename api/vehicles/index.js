const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all vehicles
      const { search } = req.query;
      let query = db.collection('vehicles');

      if (search) {
        // Simple search - in production you'd want a better search solution
        const vehiclesSnapshot = await query.get();
        const vehicles = [];

        vehiclesSnapshot.forEach(doc => {
          const data = doc.data();
          const searchLower = search.toLowerCase();

          if (
            data.licensePlate?.toLowerCase().includes(searchLower) ||
            data.internalNumber?.toLowerCase().includes(searchLower) ||
            data.manufacturer?.toLowerCase().includes(searchLower) ||
            data.model?.toLowerCase().includes(searchLower)
          ) {
            vehicles.push({ id: doc.id, ...data });
          }
        });

        return res.status(200).json({ vehicles });
      }

      const vehiclesSnapshot = await query.get();
      const vehicles = [];
      vehiclesSnapshot.forEach(doc => {
        vehicles.push({ id: doc.id, ...doc.data() });
      });

      return res.status(200).json({ vehicles });
    }

    if (req.method === 'POST') {
      // Create new vehicle
      const vehicleData = {
        ...req.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection('vehicles').add(vehicleData);
      const newVehicle = await docRef.get();

      return res.status(201).json({
        message: 'Vehicle created successfully',
        vehicle: { id: docRef.id, ...newVehicle.data() },
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in vehicles endpoint:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
