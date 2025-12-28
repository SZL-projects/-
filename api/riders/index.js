const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { search, riderStatus, assignmentStatus, region } = req.query;

      let query = db.collection('riders');

      // Filter by rider status
      if (riderStatus) {
        query = query.where('riderStatus', '==', riderStatus);
      }

      // Filter by assignment status
      if (assignmentStatus) {
        query = query.where('assignmentStatus', '==', assignmentStatus);
      }

      // Filter by region
      if (region) {
        query = query.where('region.district', '==', region);
      }

      const snapshot = await query.get();

      let riders = [];
      snapshot.forEach(doc => {
        riders.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Client-side search for name, ID number, or phone
      if (search) {
        const searchLower = search.toLowerCase();
        riders = riders.filter(rider =>
          rider.firstName?.toLowerCase().includes(searchLower) ||
          rider.lastName?.toLowerCase().includes(searchLower) ||
          rider.idNumber?.includes(search) ||
          rider.phone?.includes(search)
        );
      }

      return res.status(200).json({
        success: true,
        riders,
        count: riders.length
      });
    }

    if (req.method === 'POST') {
      const riderData = {
        ...req.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('riders').add(riderData);

      return res.status(201).json({
        success: true,
        message: 'רוכב נוצר בהצלחה',
        riderId: docRef.id
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Error in riders API:', error);
    return res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message
    });
  }
};
