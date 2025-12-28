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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Vehicle ID is required' });
  }

  try {
    const vehicleRef = db.collection('vehicles').doc(id);

    if (req.method === 'GET') {
      // Get vehicle by ID
      const doc = await vehicleRef.get();

      if (!doc.exists) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      return res.status(200).json({
        vehicle: { id: doc.id, ...doc.data() },
      });
    }

    if (req.method === 'PUT') {
      // Update vehicle
      const doc = await vehicleRef.get();

      if (!doc.exists) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const updateData = {
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await vehicleRef.update(updateData);
      const updatedDoc = await vehicleRef.get();

      return res.status(200).json({
        message: 'Vehicle updated successfully',
        vehicle: { id: updatedDoc.id, ...updatedDoc.data() },
      });
    }

    if (req.method === 'DELETE') {
      // Delete vehicle
      const doc = await vehicleRef.get();

      if (!doc.exists) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      await vehicleRef.delete();

      return res.status(200).json({
        message: 'Vehicle deleted successfully',
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in vehicle endpoint:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
