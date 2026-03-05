// Vercel Serverless Function - /api/maintenance AND /api/garages (combined to save function count)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const googleDriveService = require('./_services/googleDriveService');
const getRawBody = require('raw-body');
const Busboy = require('busboy');
const { Readable } = require('stream');
const { setCorsHeaders } = require('./_utils/cors');
const { writeAuditLog, buildChanges } = require('./_utils/auditLog');

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT/PATCH requests (except multipart/form-data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body && !req.headers['content-type']?.includes('multipart/form-data')) {
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

    // Initialize Google Drive service with Firestore
    googleDriveService.setFirestore(db);
    await googleDriveService.initialize();

    const user = await authenticateToken(req, db);

    const url = req.url.split('?')[0];

    // ==================== MAINTENANCE TYPES ROUTES ====================
    // Check if this is a maintenance-types request
    if (url.includes('/maintenance-types')) {
      return handleMaintenanceTypesRequest(req, res, db, user, url);
    }

    // ==================== GARAGES ROUTES ====================
    // Check if this is a garages request (routed here via vercel.json rewrite)
    if (url.includes('/garages')) {
      return handleGaragesRequest(req, res, db, user, url);
    }

    // ==================== MAINTENANCE ROUTES ====================
    return handleMaintenanceRequest(req, res, db, user, url, googleDriveService);

  } catch (error) {
    console.error('API error:', error.message, error.stack);

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GARAGES HANDLER ====================
async function handleGaragesRequest(req, res, db, user, url) {
  const garageId = extractIdFromUrl(req.url, 'garages');

  // GET /api/garages/compare-prices - השוואת מחירים בין מוסכים
  if (url.endsWith('/compare-prices') && req.method === 'GET') {
    await checkPermission(user, db, 'garages', 'view');

    const { maintenanceType } = req.query;

    const [garagesSnapshot, maintenanceSnapshot] = await Promise.all([
      db.collection('garages').get(),
      (() => {
        let q = db.collection('maintenance').where('status', '==', 'completed');
        if (maintenanceType) q = q.where('maintenanceType', '==', maintenanceType);
        return q.get();
      })()
    ]);

    const garages = garagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // בניית מפה של טיפולים לפי garageId - שאילתה אחת במקום N שאילתות
    const maintenanceByGarage = {};
    maintenanceSnapshot.forEach(doc => {
      const m = doc.data();
      if (!m.garageId) return;
      if (!maintenanceByGarage[m.garageId]) maintenanceByGarage[m.garageId] = [];
      maintenanceByGarage[m.garageId].push(m);
    });

    const garagesWithPrices = garages.map(garage => {
      const maintenances = maintenanceByGarage[garage.id] || [];
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
    });

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
    await checkPermission(user, db, 'garages', 'view');

    const garageDoc = await db.collection('garages').doc(garageId).get();
    if (!garageDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'מוסך לא נמצא'
      });
    }

    const maintenanceSnapshot = await db.collection('maintenance')
      .where('garageId', '==', garageId)
      .where('status', '==', 'completed')
      .get();

    const maintenances = maintenanceSnapshot.docs.map(doc => doc.data());

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
      await checkPermission(user, db, 'garages', 'edit');

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
      await checkPermission(user, db, 'garages', 'edit');

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
    await checkPermission(user, db, 'garages', 'edit');

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
}

// ==================== MAINTENANCE TYPES HANDLER ====================
async function handleMaintenanceTypesRequest(req, res, db, user, url) {
  const typeId = extractIdFromUrl(req.url, 'maintenance-types');

  // GET /api/maintenance-types - קבלת כל סוגי הטיפולים
  if (req.method === 'GET' && !typeId) {
    let types = [];
    try {
      const snapshot = await db.collection('maintenanceTypes').orderBy('order', 'asc').get();
      types = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // נרמול: value = key || value (תאימות לשני הפורמטים)
          value: data.value || data.key,
        };
      });
    } catch (e) {
      const snapshot = await db.collection('maintenanceTypes').get();
      types = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, value: data.value || data.key };
      });
    }

    return res.json({
      success: true,
      types,
    });
  }

  // POST /api/maintenance-types/init - הוספת סוגי ברירת מחדל חסרים (super_admin בלבד)
  if (url.includes('/init') && req.method === 'POST') {
    await checkPermission(user, db, 'maintenance', 'edit');

    const defaultTypes = [
      { key: 'routine', label: 'טיפול תקופתי', color: '#2563eb', order: 1 },
      { key: 'repair', label: 'תיקון', color: '#d97706', order: 2 },
      { key: 'emergency', label: 'חירום', color: '#dc2626', order: 3 },
      { key: 'recall', label: 'ריקול', color: '#7c3aed', order: 4 },
      { key: 'accident_repair', label: 'תיקון תאונה', color: '#dc2626', order: 5 },
      { key: 'other', label: 'אחר', color: '#64748b', order: 6 },
    ];

    // קבל את כל המפתחות הקיימים ב-DB
    const existingSnapshot = await db.collection('maintenanceTypes').get();
    const existingKeys = new Set(existingSnapshot.docs.map(d => d.data().key).filter(Boolean));

    // הוסף רק את הסוגים החסרים
    const missingTypes = defaultTypes.filter(t => !existingKeys.has(t.key));

    if (missingTypes.length === 0) {
      return res.json({ success: true, message: 'כל סוגי הטיפולים כבר קיימים', types: [] });
    }

    const batch = db.batch();
    const types = [];
    for (const type of missingTypes) {
      const ref = db.collection('maintenanceTypes').doc();
      batch.set(ref, { ...type, subTypes: [], createdBy: user.id, createdAt: new Date(), updatedAt: new Date() });
      types.push({ id: ref.id, ...type });
    }
    await batch.commit();

    return res.status(201).json({ success: true, message: `נוספו ${types.length} סוגי טיפול`, types });
  }

  // ==================== SUBTYPES ROUTES (before generic POST/PUT/DELETE) ====================

  // POST /api/maintenance-types/:id/subtypes - הוספת תת-סוג
  if (url.includes('/subtypes') && !url.includes('/subtypes/') && req.method === 'POST' && typeId) {
    await checkPermission(user, db, 'maintenance', 'edit');

    if (!req.body.label) {
      return res.status(400).json({ success: false, message: 'שם תת-הסוג הוא שדה חובה' });
    }

    const typeRef = db.collection('maintenanceTypes').doc(typeId);
    const doc = await typeRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'סוג טיפול לא נמצא' });

    const existing = doc.data().subTypes || [];
    const newSubType = { id: Date.now().toString(), label: req.body.label, order: existing.length };
    await typeRef.update({ subTypes: [...existing, newSubType], updatedAt: new Date() });
    const updated = await typeRef.get();
    return res.json({ success: true, type: { id: typeRef.id, ...updated.data() } });
  }

  // PUT /api/maintenance-types/:id/subtypes/:subId - עדכון תת-סוג
  if (url.includes('/subtypes/') && req.method === 'PUT' && typeId) {
    await checkPermission(user, db, 'maintenance', 'edit');

    const subId = url.split('/subtypes/')[1]?.split('?')[0];
    const typeRef = db.collection('maintenanceTypes').doc(typeId);
    const doc = await typeRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'סוג טיפול לא נמצא' });

    const subTypes = (doc.data().subTypes || []).map(st =>
      st.id === subId ? { ...st, label: req.body.label ?? st.label, order: req.body.order ?? st.order, id: subId } : st
    );
    await typeRef.update({ subTypes, updatedAt: new Date() });
    const updated = await typeRef.get();
    return res.json({ success: true, type: { id: typeRef.id, ...updated.data() } });
  }

  // DELETE /api/maintenance-types/:id/subtypes/:subId - מחיקת תת-סוג
  if (url.includes('/subtypes/') && req.method === 'DELETE' && typeId) {
    await checkPermission(user, db, 'maintenance', 'edit');

    const subId = url.split('/subtypes/')[1]?.split('?')[0];
    const typeRef = db.collection('maintenanceTypes').doc(typeId);
    const doc = await typeRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'סוג טיפול לא נמצא' });

    const subTypes = (doc.data().subTypes || []).filter(st => st.id !== subId);
    await typeRef.update({ subTypes, updatedAt: new Date() });
    return res.json({ success: true, message: 'תת-סוג נמחק בהצלחה' });
  }

  // ==================== MAIN TYPE CRUD ====================

  // POST /api/maintenance-types - יצירת סוג טיפול חדש
  if (req.method === 'POST' && !url.includes('/subtypes')) {
    await checkPermission(user, db, 'maintenance', 'edit');

    if (!req.body.key || !req.body.label) {
      return res.status(400).json({ success: false, message: 'מפתח ושם הסוג הם שדות חובה' });
    }

    const existingSnapshot = await db.collection('maintenanceTypes')
      .where('key', '==', req.body.key).get();
    if (!existingSnapshot.empty) {
      return res.status(400).json({ success: false, message: 'סוג טיפול עם מפתח זה כבר קיים' });
    }

    const countSnapshot = await db.collection('maintenanceTypes').get();
    const typeData = {
      key: req.body.key,
      label: req.body.label,
      color: req.body.color || '#64748b',
      order: req.body.order ?? (countSnapshot.size + 1),
      subTypes: [],
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const typeRef = await db.collection('maintenanceTypes').add(typeData);
    const typeDoc = await typeRef.get();
    return res.status(201).json({ success: true, message: 'סוג טיפול נוצר בהצלחה', type: { id: typeRef.id, ...typeDoc.data() } });
  }

  // PUT /api/maintenance-types/:id - עדכון סוג טיפול
  if (req.method === 'PUT' && typeId && !url.includes('/subtypes')) {
    await checkPermission(user, db, 'maintenance', 'edit');

    const typeRef = db.collection('maintenanceTypes').doc(typeId);
    const doc = await typeRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'סוג טיפול לא נמצא' });

    const updateData = { ...req.body, updatedBy: user.id, updatedAt: new Date() };
    delete updateData.key;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await typeRef.update(updateData);
    const updatedDoc = await typeRef.get();
    return res.json({ success: true, message: 'סוג טיפול עודכן בהצלחה', type: { id: updatedDoc.id, ...updatedDoc.data() } });
  }

  // DELETE /api/maintenance-types/:id - מחיקת סוג טיפול
  if (req.method === 'DELETE' && typeId && !url.includes('/subtypes')) {
    await checkPermission(user, db, 'maintenance', 'edit');

    const typeRef = db.collection('maintenanceTypes').doc(typeId);
    const doc = await typeRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'סוג טיפול לא נמצא' });

    const typeData = doc.data();
    const maintenanceSnapshot = await db.collection('maintenance')
      .where('maintenanceType', '==', typeData.key).limit(1).get();
    if (!maintenanceSnapshot.empty) {
      return res.status(400).json({ success: false, message: 'לא ניתן למחוק סוג טיפול שקיימים טיפולים המשתמשים בו' });
    }

    await typeRef.delete();
    return res.json({ success: true, message: 'סוג טיפול נמחק בהצלחה' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// ==================== MAINTENANCE HANDLER ====================
async function handleMaintenanceRequest(req, res, db, user, url, googleDriveService) {
  const maintenanceId = extractIdFromUrl(req.url, 'maintenance');

  // GET /api/maintenance/statistics - סטטיסטיקות טיפולים
  if (url.endsWith('/statistics') && req.method === 'GET') {
    await checkPermission(user, db, 'maintenance', 'view');

    const { vehicleId } = req.query;

    let query = db.collection('maintenance');

    if (vehicleId) {
      query = query.where('vehicleId', '==', vehicleId);
    }

    const snapshot = await query.get();
    const maintenances = snapshot.docs.map(doc => doc.data());

    const totalCount = maintenances.length;
    const completedCount = maintenances.filter(m => m.status === 'completed').length;
    const pendingCount = maintenances.filter(m => m.status === 'pending').length;
    const pendingApprovalCount = maintenances.filter(m => m.status === 'pending_approval').length;
    const scheduledCount = maintenances.filter(m => m.status === 'scheduled').length;
    const inProgressCount = maintenances.filter(m => m.status === 'in_progress').length;

    const completedMaintenances = maintenances.filter(m => m.status === 'completed' && m.costs?.totalCost);
    const totalCost = completedMaintenances.reduce((sum, m) => sum + (m.costs?.totalCost || 0), 0);
    const averageCost = completedMaintenances.length > 0
      ? Math.round(totalCost / completedMaintenances.length)
      : 0;

    const byType = {};
    maintenances.forEach(m => {
      const type = m.maintenanceType || 'other';
      if (!byType[type]) {
        byType[type] = { count: 0, totalCost: 0 };
      }
      byType[type].count++;
      if (m.costs?.totalCost) {
        byType[type].totalCost += m.costs.totalCost;
      }
    });

    return res.json({
      success: true,
      statistics: {
        totalCount,
        completedCount,
        pendingCount,
        pendingApprovalCount,
        scheduledCount,
        inProgressCount,
        totalCost,
        averageCost,
        byType
      }
    });
  }

  // GET /api/maintenance/vehicle/:vehicleId
  if (url.includes('/vehicle/') && req.method === 'GET') {
    const match = url.match(/\/vehicle\/([^/]+)/);
    const vehicleId = match ? match[1] : null;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה כלי חסר'
      });
    }

    // בדיקת הרשאות - self רואה רק טיפולי הכלי שלו
    const permLevel = await checkPermission(user, db, 'maintenance', 'view');
    if (permLevel === 'self' && user.riderId) {
      const riderDoc = await db.collection('riders').doc(user.riderId).get();
      if (riderDoc.exists) {
        const riderData = riderDoc.data();
        if (riderData.assignedVehicleId !== vehicleId) {
          return res.status(403).json({
            success: false,
            message: 'אין הרשאה לצפות בטיפולי כלי זה'
          });
        }
      }
    }

    const { limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit), 200);

    // fallback בלי orderBy אם חסר אינדקס ב-Firestore
    let maintenances = [];
    try {
      const snapshot = await db.collection('maintenance')
        .where('vehicleId', '==', vehicleId)
        .orderBy('createdAt', 'desc')
        .limit(limitNum)
        .get();
      maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (queryError) {
      console.warn('Maintenance query with orderBy failed, trying without:', queryError.message);
      const snapshot = await db.collection('maintenance')
        .where('vehicleId', '==', vehicleId)
        .limit(limitNum)
        .get();
      maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      maintenances.sort((a, b) => {
        const dateA = a.createdAt?.seconds || a.createdAt?._seconds || 0;
        const dateB = b.createdAt?.seconds || b.createdAt?._seconds || 0;
        return dateB - dateA;
      });
    }

    return res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  }

  // GET /api/maintenance/rider/:riderId
  if (url.includes('/rider/') && req.method === 'GET') {
    const match = url.match(/\/rider\/([^/]+)/);
    const riderId = match ? match[1] : null;

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה רוכב חסר'
      });
    }

    const { limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit), 200);

    const snapshot = await db.collection('maintenance')
      .where('riderId', '==', riderId)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .get();

    const maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  }

  // GET /api/maintenance/fault/:faultId
  if (url.includes('/fault/') && req.method === 'GET') {
    const match = url.match(/\/fault\/([^/]+)/);
    const faultId = match ? match[1] : null;

    if (!faultId) {
      return res.status(400).json({
        success: false,
        message: 'מזהה תקלה חסר'
      });
    }

    const snapshot = await db.collection('maintenance')
      .where('faultId', '==', faultId)
      .get();

    const maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  }

  // POST /api/maintenance/upload-file
  if (url.endsWith('/upload-file') && req.method === 'POST') {
    return new Promise(async (resolve, reject) => {
      try {
        const rawBody = await getRawBody(req, {
          length: req.headers['content-length'],
          limit: '10mb'
        });

        const bufferStream = Readable.from(rawBody);
        const busboy = Busboy({ headers: req.headers });

        let fileBuffer = null;
        let fileName = '';
        let mimeType = '';
        let vehicleId = '';
        let maintenanceIdField = '';
        let fileReceived = false;

        busboy.on('file', (fieldname, file, info) => {
          try {
            fileName = Buffer.from(info.filename, 'latin1').toString('utf8');
          } catch (e) {
            fileName = info.filename;
          }
          mimeType = info.mimeType;
          fileReceived = true;

          const chunks = [];
          file.on('data', (data) => chunks.push(data));
          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });

        busboy.on('field', (fieldname, value) => {
          if (fieldname === 'vehicleId') vehicleId = value;
          if (fieldname === 'maintenanceId') maintenanceIdField = value;
        });

        busboy.on('finish', async () => {
          try {
            if (!fileReceived || !fileBuffer) {
              res.status(400).json({
                success: false,
                message: 'לא הועלה קובץ'
              });
              return reject(new Error('No file uploaded'));
            }

            if (!vehicleId) {
              res.status(400).json({
                success: false,
                message: 'מזהה רכב הוא שדה חובה'
              });
              return reject(new Error('No vehicleId provided'));
            }

            const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
            if (!vehicleDoc.exists) {
              res.status(404).json({
                success: false,
                message: 'רכב לא נמצא'
              });
              return reject(new Error('Vehicle not found'));
            }

            const vehicleData = vehicleDoc.data();
            let maintenanceFolderId = vehicleData.driveFolderData?.maintenanceFolderId || vehicleData.folders?.maintenance;

            if (!maintenanceFolderId && vehicleData.driveFolderData?.mainFolderId) {
              const maintenanceFolder = await googleDriveService.createFolder(
                'טיפולים',
                vehicleData.driveFolderData.mainFolderId
              );
              maintenanceFolderId = maintenanceFolder.id;

              await db.collection('vehicles').doc(vehicleId).update({
                'driveFolderData.maintenanceFolderId': maintenanceFolderId,
                'driveFolderData.maintenanceFolderLink': maintenanceFolder.webViewLink,
                updatedAt: new Date()
              });
            }

            const targetFolderId = maintenanceFolderId || vehicleData.driveFolderData?.mainFolderId;

            if (!targetFolderId) {
              res.status(400).json({
                success: false,
                message: 'לא נמצאה תיקיית Google Drive עבור הרכב'
              });
              return reject(new Error('No Drive folder found'));
            }

            const fileData = await googleDriveService.uploadFile(
              fileName,
              fileBuffer,
              targetFolderId,
              mimeType
            );

            res.json({
              success: true,
              message: 'קובץ הועלה בהצלחה',
              file: fileData
            });

            resolve();
          } catch (error) {
            console.error('Error in busboy finish handler:', error);
            res.status(500).json({
              success: false,
              message: error.message
            });
            reject(error);
          }
        });

        busboy.on('error', (error) => {
          console.error('Busboy error:', error);
          res.status(500).json({
            success: false,
            message: 'שגיאה בעיבוד הקובץ: ' + error.message
          });
          reject(error);
        });

        bufferStream.pipe(busboy);
      } catch (error) {
        console.error('Error setting up busboy:', error);
        res.status(500).json({
          success: false,
          message: 'שגיאה באתחול העלאת הקובץ: ' + error.message
        });
        reject(error);
      }
    });
  }

  // PUT /api/maintenance/:id/complete
  if (maintenanceId && url.includes('/complete') && req.method === 'PUT') {
    await checkPermission(user, db, 'maintenance', 'edit');

    if (!req.body.costs || req.body.costs.totalCost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'עלות כוללת היא שדה חובה בסגירת טיפול'
      });
    }

    const maintenanceRef = db.collection('maintenance').doc(maintenanceId);
    const doc = await maintenanceRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'טיפול לא נמצא'
      });
    }

    const updateData = {
      ...req.body,
      status: 'completed',
      completedAt: new Date(),
      completedBy: user.id,
      updatedBy: user.id,
      updatedAt: new Date()
    };

    await maintenanceRef.update(updateData);
    const updatedDoc = await maintenanceRef.get();

    return res.json({
      success: true,
      message: 'טיפול נסגר בהצלחה',
      maintenance: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  }

  // Single maintenance operations by ID
  if (maintenanceId && !url.includes('/vehicle/') && !url.includes('/rider/') && !url.includes('/fault/') && !url.includes('/statistics') && !url.includes('/complete') && !url.includes('/upload-file')) {
    const maintenanceRef = db.collection('maintenance').doc(maintenanceId);
    const doc = await maintenanceRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'טיפול לא נמצא'
      });
    }

    if (req.method === 'GET') {
      return res.json({
        success: true,
        maintenance: { id: doc.id, ...doc.data() }
      });
    }

    if (req.method === 'PUT') {
      await checkPermission(user, db, 'maintenance', 'edit');

      const existingMaintenanceData = doc.data();
      // תמיכה גם בפורמט garage object וגם garageId/garageName
      const garageData = req.body.garage || {};

      const updateData = {
        ...req.body,
        // וידוא שהמוסך נשמר בפורמט הנכון
        garage: {
          id: garageData.id || req.body.garageId || null,
          name: garageData.name || req.body.garageName || '',
          phone: garageData.phone || '',
          address: garageData.address || '',
        },
        garageId: garageData.id || req.body.garageId || null,
        garageName: garageData.name || req.body.garageName || '',
        // וידוא תאריך בפורמט נכון
        maintenanceDate: req.body.maintenanceDate ? new Date(req.body.maintenanceDate) : undefined,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      // הסרת שדות undefined
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      await maintenanceRef.update(updateData);
      const updatedDoc = await maintenanceRef.get();
      const maintDiff = buildChanges(existingMaintenanceData, req.body);
      await writeAuditLog(db, user, { action: 'update', entityType: 'maintenance', entityId: maintenanceId, entityName: updatedDoc.data().maintenanceNumber || 'טיפול', changes: maintDiff, description: 'טיפול עודכן' });

      return res.json({
        success: true,
        message: 'טיפול עודכן בהצלחה',
        maintenance: { id: updatedDoc.id, ...updatedDoc.data() }
      });
    }

    if (req.method === 'DELETE') {
      await checkPermission(user, db, 'maintenance', 'edit');

      // מחיקת קבצים מ-Google Drive לפני מחיקת הטיפול
      const maintenanceData = doc.data();
      if (maintenanceData.documents && maintenanceData.documents.length > 0) {
        for (const document of maintenanceData.documents) {
          if (document.fileId) {
            try {
              await googleDriveService.deleteFile(document.fileId);
            } catch (deleteErr) {
              console.error(`Error deleting file ${document.fileId} from Drive:`, deleteErr.message);
              // ממשיכים למחוק את שאר הקבצים גם אם אחד נכשל
            }
          }
        }
      }

      const deletedMaintData = maintenanceData;
      await maintenanceRef.delete();
      await writeAuditLog(db, user, { action: 'delete', entityType: 'maintenance', entityId: maintenanceId, entityName: deletedMaintData.maintenanceNumber || 'טיפול', description: 'טיפול נמחק' });

      return res.json({
        success: true,
        message: 'טיפול נמחק בהצלחה'
      });
    }
  }

  // Collection operations
  if (req.method === 'GET') {
    const { search, status, maintenanceType, vehicleId, riderId, paidBy, garageId, limit = 100 } = req.query;
    const limitNum = Math.min(parseInt(limit), 500);

    let query = db.collection('maintenance');

    if (status) {
      query = query.where('status', '==', status);
    }
    if (maintenanceType) {
      query = query.where('maintenanceType', '==', maintenanceType);
    }
    if (vehicleId) {
      query = query.where('vehicleId', '==', vehicleId);
    }
    if (riderId) {
      query = query.where('riderId', '==', riderId);
    }
    if (paidBy) {
      query = query.where('paidBy', '==', paidBy);
    }
    if (garageId) {
      query = query.where('garageId', '==', garageId);
    }

    const snapshot = await query.limit(limitNum).get();
    let maintenances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const searchLower = search.toLowerCase();
      maintenances = maintenances.filter(m =>
        m.description?.toLowerCase().includes(searchLower) ||
        m.garageName?.toLowerCase().includes(searchLower) ||
        m.notes?.toLowerCase().includes(searchLower)
      );
    }

    return res.json({
      success: true,
      count: maintenances.length,
      maintenances
    });
  }

  if (req.method === 'POST') {
    if (!req.body.vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'כלי הוא שדה חובה'
      });
    }
    if (!req.body.description) {
      return res.status(400).json({
        success: false,
        message: 'תיאור הטיפול הוא שדה חובה'
      });
    }

    // בדיקה האם הרוכב מדווח על הטיפול
    const isRiderSubmission = user.role === 'rider' || (user.roles && user.roles.includes('rider'));

    // תמיכה גם בפורמט garage object וגם garageId/garageName
    const garageData = req.body.garage || {};

    const maintenanceData = {
      vehicleId: req.body.vehicleId,
      vehiclePlate: req.body.vehiclePlate || '',
      riderId: req.body.riderId || null,
      riderName: req.body.riderName || '',
      description: req.body.description,
      maintenanceType: req.body.maintenanceType || 'other',
      maintenanceDate: req.body.maintenanceDate ? new Date(req.body.maintenanceDate) : new Date(),
      kilometersAtMaintenance: req.body.kilometersAtMaintenance || null,
      // שמירת מוסך כאובייקט מלא
      garage: {
        id: garageData.id || req.body.garageId || null,
        name: garageData.name || req.body.garageName || '',
        phone: garageData.phone || '',
        address: garageData.address || '',
      },
      garageId: garageData.id || req.body.garageId || null,
      garageName: garageData.name || req.body.garageName || '',
      scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : null,
      faultId: req.body.faultId || null,
      relatedFaultId: req.body.relatedFaultId || null,
      notes: req.body.notes || '',
      costs: req.body.costs || {},
      paidBy: req.body.paidBy || null,
      replacedParts: req.body.replacedParts || [],
      documents: req.body.documents || [],
      files: req.body.files || [],
      // אם רוכב מדווח - סטטוס ממתין לאישור
      status: isRiderSubmission ? 'pending_approval' : (req.body.status || 'scheduled'),
      submittedByRider: isRiderSubmission,
      reportedBy: user.id,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const maintenanceRef = await db.collection('maintenance').add(maintenanceData);
    const maintenanceDoc = await maintenanceRef.get();
    await writeAuditLog(db, user, { action: 'create', entityType: 'maintenance', entityId: maintenanceRef.id, entityName: maintenanceDoc.data().maintenanceNumber || 'טיפול חדש', description: 'טיפול חדש נוצר' });

    return res.status(201).json({
      success: true,
      message: 'טיפול נוצר בהצלחה',
      maintenance: { id: maintenanceRef.id, ...maintenanceDoc.data() }
    });
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}
