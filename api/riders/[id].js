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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID לא סופק'
    });
  }

  try {
    const riderRef = db.collection('riders').doc(id);

    if (req.method === 'GET') {
      const doc = await riderRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      return res.status(200).json({
        success: true,
        rider: {
          id: doc.id,
          ...doc.data()
        }
      });
    }

    if (req.method === 'PUT') {
      const doc = await riderRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      const updateData = {
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await riderRef.update(updateData);

      return res.status(200).json({
        success: true,
        message: 'רוכב עודכן בהצלחה'
      });
    }

    if (req.method === 'DELETE') {
      const doc = await riderRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      await riderRef.delete();

      return res.status(200).json({
        success: true,
        message: 'רוכב נמחק בהצלחה'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Error in rider API:', error);
    return res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message
    });
  }
};
