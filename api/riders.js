// Vercel Serverless Function - /api/riders (all rider endpoints)
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
    console.log('👤 Riders Request:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.authorization
    });

    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    // Extract ID from URL
    const riderId = extractIdFromUrl(req.url, 'riders');
    console.log('📍 Rider ID extracted:', riderId);

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
      const { search, riderStatus, assignmentStatus, region, page = 1, limit = 20 } = req.query;
      const limitNum = Math.min(parseInt(limit), 100); // מקסימום 100 לבקשה
      const pageNum = parseInt(page);

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

      // סינון לפי תפקיד - רוכב רואה רק את עצמו
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isRider = userRoles.includes('rider');
      const isAdminOrManager = userRoles.some(role =>
        ['super_admin', 'manager', 'secretary'].includes(role)
      );

      if (isRider && !isAdminOrManager && user.riderId) {
        query = query.where('__name__', '==', user.riderId);
      }

      // אופטימיזציה: אם אין חיפוש, השתמש ב-Firestore pagination אמיתי
      if (!search) {
        // מיון לפי createdAt (חשוב ל-pagination יעיל)
        query = query.orderBy('createdAt', 'desc');

        // אם זה לא עמוד ראשון, טען רק את הכמות הנדרשת מהתחלה ודלג
        if (pageNum > 1) {
          const skipCount = (pageNum - 1) * limitNum;
          query = query.offset(skipCount);
        }

        query = query.limit(limitNum);

        const snapshot = await query.get();
        const riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // טעינת הספירה הכוללת בנפרד (יעיל יותר)
        const countSnapshot = await db.collection('riders').count().get();
        const totalCount = countSnapshot.data().count;

        return res.status(200).json({
          success: true,
          count: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          currentPage: pageNum,
          riders: riders
        });
      }

      // אם יש חיפוש - נאלצים לטעון הכל ולסנן (Firestore לא תומך בחיפוש טקסט מלא)
      const snapshot = await query.get();
      let riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const searchLower = search.toLowerCase();
      riders = riders.filter(rider =>
        rider.firstName?.toLowerCase().includes(searchLower) ||
        rider.lastName?.toLowerCase().includes(searchLower) ||
        rider.idNumber?.includes(search) ||
        rider.phone?.includes(search)
      );

      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = pageNum * limitNum;
      const paginatedRiders = riders.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        count: riders.length,
        totalPages: Math.ceil(riders.length / limitNum),
        currentPage: pageNum,
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

    console.error('❌ Riders: Method not allowed:', {
      method: req.method,
      url: req.url,
      riderId
    });

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      details: {
        method: req.method,
        allowedMethods: riderId ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST']
      }
    });

  } catch (error) {
    console.error('❌ Riders error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: 'שגיאת הרשאה',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
