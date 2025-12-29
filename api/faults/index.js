// Vercel Serverless Function - /api/faults
const { initFirebase } = require('../_utils/firebase');
const { authenticateToken } = require('../_utils/auth');

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

    // GET - קבלת רשימת תקלות
    if (req.method === 'GET') {
      const { search, severity, status, vehicleId, riderId, page = 1, limit = 100 } = req.query;

      let query = db.collection('faults');

      // סינונים
      if (severity) {
        query = query.where('severity', '==', severity);
      }
      if (status) {
        query = query.where('status', '==', status);
      }
      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }
      if (riderId) {
        query = query.where('reportedBy', '==', riderId);
      }

      const snapshot = await query.limit(parseInt(limit)).get();
      let faults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // חיפוש טקסט חופשי
      if (search) {
        const searchLower = search.toLowerCase();
        faults = faults.filter(fault =>
          fault.description?.toLowerCase().includes(searchLower) ||
          fault.faultType?.toLowerCase().includes(searchLower)
        );
      }

      return res.status(200).json({
        success: true,
        count: faults.length,
        faults
      });
    }

    // POST - דיווח תקלה חדשה
    if (req.method === 'POST') {
      const faultData = {
        ...req.body,
        reportedBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const faultRef = await db.collection('faults').add(faultData);
      const faultDoc = await faultRef.get();

      return res.status(201).json({
        success: true,
        message: 'תקלה דווחה בהצלחה',
        fault: { id: faultRef.id, ...faultDoc.data() }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Faults error:', error);

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
