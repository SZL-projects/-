// Vercel Serverless Function - /api/garages (all garage endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');
const getRawBody = require('raw-body');

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
    try {
      const rawBody = await getRawBody(req);
      const bodyText = rawBody.toString();
      req.body = bodyText && bodyText.trim() !== '' ? JSON.parse(bodyText) : {};
    } catch (e) {
      console.error('Body parsing error:', e.message);
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const url = req.url.split('?')[0];
    const garageId = extractIdFromUrl(req.url, 'garages');

    // ==================== Special Routes ====================

    // GET /api/garages/compare-prices - השוואת מחירים בין מוסכים
    if (url.endsWith('/compare-prices') && req.method === 'GET') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const { maintenanceType } = req.query;

      // שליפת כל המוסכים
      const garagesSnapshot = await db.collection('garages').get();
      const garages = garagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // חישוב סטטיסטיקות מחירים לכל מוסך
      const garagesWithPrices = await Promise.all(garages.map(async (garage) => {
        let maintenanceQuery = db.collection('maintenance')
          .where('garageId', '==', garage.id)
          .where('status', '==', 'completed');

        if (maintenanceType) {
          maintenanceQuery = maintenanceQuery.where('maintenanceType', '==', maintenanceType);
        }

        const maintenanceSnapshot = await maintenanceQuery.get();
        const maintenances = maintenanceSnapshot.docs.map(doc => doc.data());

        // חישוב ממוצע מחירים
        const prices = maintenances
          .filter(m => m.costs?.totalCost)
          .map(m => m.costs.totalCost);

        const avgPrice = prices.length > 0
          ? prices.reduce((sum, p) => sum + p, 0) / prices.length
          : null;

        return {
          id: garage.id,
          name: garage.name,
          city: garage.city,
          totalMaintenances: maintenances.length,
          averagePrice: avgPrice ? Math.round(avgPrice) : null,
          minPrice: prices.length > 0 ? Math.min(...prices) : null,
          maxPrice: prices.length > 0 ? Math.max(...prices) : null
        };
      }));

      // מיון לפי מחיר ממוצע (הזולים קודם)
      const sortedGarages = garagesWithPrices
        .filter(g => g.averagePrice !== null)
        .sort((a, b) => a.averagePrice - b.averagePrice);

      return res.json({
        success: true,
        garages: sortedGarages,
        maintenanceType: maintenanceType || 'all'
      });
    }

    // GET /api/garages/:id/statistics - סטטיסטיקות מוסך
    if (garageId && url.includes('/statistics') && req.method === 'GET') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const garageDoc = await db.collection('garages').doc(garageId).get();
      if (!garageDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'מוסך לא נמצא'
        });
      }

      // סטטיסטיקות לפי סוג טיפול
      const maintenanceSnapshot = await db.collection('maintenance')
        .where('garageId', '==', garageId)
        .where('status', '==', 'completed')
        .get();

      const maintenances = maintenanceSnapshot.docs.map(doc => doc.data());

      // קיבוץ לפי סוג טיפול
      const byType = {};
      maintenances.forEach(m => {
        const type = m.maintenanceType || 'other';
        if (!byType[type]) {
          byType[type] = { count: 0, totalCost: 0, prices: [] };
        }
        byType[type].count++;
        if (m.costs?.totalCost) {
          byType[type].totalCost += m.costs.totalCost;
          byType[type].prices.push(m.costs.totalCost);
        }
      });

      // חישוב ממוצעים
      const statistics = Object.entries(byType).map(([type, data]) => ({
        maintenanceType: type,
        count: data.count,
        totalCost: data.totalCost,
        averagePrice: data.prices.length > 0
          ? Math.round(data.totalCost / data.prices.length)
          : null
      }));

      return res.json({
        success: true,
        garageId,
        totalMaintenances: maintenances.length,
        statistics
      });
    }

    // ==================== CRUD Operations ====================

    // Single garage operations by ID
    if (garageId && !url.includes('/compare-prices') && !url.includes('/statistics')) {
      const garageRef = db.collection('garages').doc(garageId);
      const doc = await garageRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'מוסך לא נמצא'
        });
      }

      if (req.method === 'GET') {
        return res.json({
          success: true,
          garage: { id: doc.id, ...doc.data() }
        });
      }

      if (req.method === 'PUT') {
        checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await garageRef.update(updateData);
        const updatedDoc = await garageRef.get();

        return res.json({
          success: true,
          message: 'מוסך עודכן בהצלחה',
          garage: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin', 'manager']);

        await garageRef.delete();

        return res.json({
          success: true,
          message: 'מוסך נמחק בהצלחה'
        });
      }
    }

    // Collection operations
    if (req.method === 'GET') {
      const { search, city, limit = 100 } = req.query;
      const limitNum = Math.min(parseInt(limit), 500);

      let query = db.collection('garages');

      if (city) {
        query = query.where('city', '==', city);
      }

      const snapshot = await query.limit(limitNum).get();
      let garages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // סינון לפי חיפוש
      if (search) {
        const searchLower = search.toLowerCase();
        garages = garages.filter(garage =>
          garage.name?.toLowerCase().includes(searchLower) ||
          garage.city?.toLowerCase().includes(searchLower) ||
          garage.phone?.includes(search) ||
          garage.contactName?.toLowerCase().includes(searchLower)
        );
      }

      return res.json({
        success: true,
        count: garages.length,
        garages
      });
    }

    if (req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      // ולידציה בסיסית
      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          message: 'שם המוסך הוא שדה חובה'
        });
      }

      const garageData = {
        name: req.body.name,
        city: req.body.city || '',
        address: req.body.address || '',
        phone: req.body.phone || '',
        contactName: req.body.contactName || '',
        email: req.body.email || '',
        specialties: req.body.specialties || [],
        notes: req.body.notes || '',
        isActive: true,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const garageRef = await db.collection('garages').add(garageData);
      const garageDoc = await garageRef.get();

      return res.status(201).json({
        success: true,
        message: 'מוסך נוצר בהצלחה',
        garage: { id: garageRef.id, ...garageDoc.data() }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Garages API error:', error.message, error.stack);

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
