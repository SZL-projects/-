// Vercel Serverless Function - /api/faults
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

  // Parse body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    const getRawBody = require('raw-body');
    try {
      const rawBody = await getRawBody(req);
      req.body = JSON.parse(rawBody.toString());
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const faultId = extractIdFromUrl(req.url, 'faults');

    // Single fault operations
    if (faultId) {
      const faultRef = db.collection('faults').doc(faultId);
      const doc = await faultRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'תקלה לא נמצאה'
        });
      }

      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          fault: { id: doc.id, ...doc.data() }
        });
      }

      if (req.method === 'PUT') {
        checkAuthorization(user, ['super_admin', 'manager', 'logistics']);

        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await faultRef.update(updateData);
        const updatedDoc = await faultRef.get();

        return res.status(200).json({
          success: true,
          message: 'תקלה עודכנה בהצלחה',
          fault: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin']);

        await faultRef.delete();

        return res.status(200).json({
          success: true,
          message: 'תקלה נמחקה בהצלחה'
        });
      }
    }

    // Collection operations
    if (req.method === 'GET') {
      const { search, severity, status, vehicleId, riderId, page = 1, limit = 100 } = req.query;

      let query = db.collection('faults');

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

      // סינון לפי תפקיד - רוכב רואה רק תקלות של הכלי שלו
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isAdminOrManager = userRoles.some(role =>
        ['super_admin', 'manager', 'secretary'].includes(role)
      );

      if (!isAdminOrManager && user.riderId) {
        // נמצא את הרוכב כדי לקבל את assignedVehicleId
        const riderSnapshot = await db.collection('riders').doc(user.riderId).get();
        if (riderSnapshot.exists) {
          const riderData = riderSnapshot.data();
          if (riderData.assignedVehicleId) {
            query = query.where('vehicleId', '==', riderData.assignedVehicleId);
          } else {
            // אין כלי משויך - מחזיר מערך ריק
            return res.status(200).json({
              success: true,
              count: 0,
              faults: []
            });
          }
        }
      }

      const snapshot = await query.limit(parseInt(limit)).get();
      let faults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
