// Vercel Serverless Function - /api/riders (all rider endpoints)
const { initFirebase } = require('./_utils/firebase');
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

    // Extract ID from URL if exists (/api/riders/[id])
    const pathMatch = req.url.match(/\/api\/riders\/([^?]+)/);
    const riderId = pathMatch ? pathMatch[1] : null;

    // Single rider operations (GET/PUT/DELETE /api/riders/[id])
    if (riderId) {
      const riderRef = db.collection('riders').doc(riderId);
      const doc = await riderRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'רוכב לא נמצא'
        });
      }

      // GET single rider
      if (req.method === 'GET') {
        if (user.role === 'rider' && user.riderId !== riderId) {
          return res.status(403).json({
            success: false,
            message: 'אין הרשאה לצפות ברוכב זה'
          });
        }

        return res.status(200).json({
          success: true,
          rider: { id: doc.id, ...doc.data() }
        });
      }

      // PUT - update rider
      if (req.method === 'PUT') {
        checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await riderRef.update(updateData);
        const updatedDoc = await riderRef.get();

        return res.status(200).json({
          success: true,
          message: 'רוכב עודכן בהצלחה',
          rider: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      // DELETE rider
      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin']);

        await riderRef.delete();

        return res.status(200).json({
          success: true,
          message: 'רוכב נמחק בהצלחה'
        });
      }
    }

    // Collection operations (GET/POST /api/riders)
    // GET - list riders
    if (req.method === 'GET') {
      const { search, riderStatus, assignmentStatus, region, page = 1, limit = 50 } = req.query;

      let query = db.collection('riders');

      if (riderStatus) {
        query = query.where('riderStatus', '==', riderStatus);
      }
      if (assignmentStatus) {
        query = query.where('assignmentStatus', '==', assignmentStatus);
      }
      if (region) {
        query = query.where('region.district', '==', region);
      }
      if (user.role === 'rider' && user.riderId) {
        query = query.where('__name__', '==', user.riderId);
      }

      const snapshot = await query.get();
      let riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (search) {
        const searchLower = search.toLowerCase();
        riders = riders.filter(rider =>
          rider.firstName?.toLowerCase().includes(searchLower) ||
          rider.lastName?.toLowerCase().includes(searchLower) ||
          rider.idNumber?.includes(search) ||
          rider.phone?.includes(search)
        );
      }

      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedRiders = riders.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        count: riders.length,
        totalPages: Math.ceil(riders.length / limit),
        currentPage: parseInt(page),
        riders: paginatedRiders
      });
    }

    // POST - create rider
    if (req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const riderData = {
        ...req.body,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const riderRef = await db.collection('riders').add(riderData);
      const riderDoc = await riderRef.get();

      return res.status(201).json({
        success: true,
        message: 'רוכב נוצר בהצלחה',
        rider: { id: riderRef.id, ...riderDoc.data() }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Riders error:', error);

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
