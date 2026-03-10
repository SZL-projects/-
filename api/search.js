// Vercel Serverless Function - /api/search
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');

// הגדרות ישויות לחיפוש
const ENTITY_CONFIGS = [
  {
    key: 'riders',
    permissionKey: 'riders',
    collection: 'riders',
    normalize: (rider) => ({
      id: rider.id,
      type: 'riders',
      title: `${rider.firstName || ''} ${rider.lastName || ''}`.trim(),
      subtitle: rider.idNumber ? `ת.ז. ${rider.idNumber}` : rider.phone || '',
      url: `/riders/${rider.id}`,
    }),
  },
  {
    key: 'vehicles',
    permissionKey: 'vehicles',
    collection: 'vehicles',
    normalize: (vehicle) => ({
      id: vehicle.id,
      type: 'vehicles',
      title: vehicle.licensePlate || '',
      subtitle: [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' '),
      url: `/vehicles/${vehicle.id}`,
    }),
  },
  {
    key: 'faults',
    permissionKey: 'faults',
    collection: 'faults',
    normalize: (fault) => ({
      id: fault.id,
      type: 'faults',
      title: fault.description?.substring(0, 60) || 'תקלה',
      subtitle: [fault.vehiclePlate, fault.riderName].filter(Boolean).join(' | '),
      url: '/faults',
    }),
  },
  {
    key: 'tasks',
    permissionKey: 'tasks',
    collection: 'tasks',
    normalize: (task) => ({
      id: task.id,
      type: 'tasks',
      title: task.title || 'משימה',
      subtitle: task.description?.substring(0, 60) || '',
      url: '/tasks',
    }),
  },
  {
    key: 'maintenance',
    permissionKey: 'maintenance',
    collection: 'maintenance',
    normalize: (m) => ({
      id: m.id,
      type: 'maintenance',
      title: m.maintenanceNumber || m.description?.substring(0, 60) || 'טיפול',
      subtitle: [m.vehiclePlate, m.riderName].filter(Boolean).join(' | '),
      url: '/maintenance',
    }),
  },
  {
    key: 'garages',
    permissionKey: 'garages',
    collection: 'garages',
    normalize: (garage) => ({
      id: garage.id,
      type: 'garages',
      title: garage.name || 'מוסך',
      subtitle: [garage.city, garage.contactPerson, garage.phone].filter(Boolean).join(' | '),
      url: '/garages',
    }),
  },
  {
    key: 'users',
    permissionKey: 'users',
    collection: 'users',
    normalize: (user) => ({
      id: user.id,
      type: 'users',
      title: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '',
      subtitle: [user.email, user.role].filter(Boolean).join(' | '),
      url: '/users',
    }),
  },
  {
    key: 'insurance_claims',
    permissionKey: 'insurance_claims',
    collection: 'insurance_claims',
    normalize: (claim) => ({
      id: claim.id,
      type: 'insurance_claims',
      title: claim.claimNumber || claim.externalClaimNumber || 'תביעת ביטוח',
      subtitle: [claim.vehiclePlate, claim.riderName, claim.description?.substring(0, 40)].filter(Boolean).join(' | '),
      url: '/insurance-claims',
    }),
  },
];

// פונקציות חיפוש לכל ישות
async function searchRiders(db, term, limit) {
  const lowerTerm = term.toLowerCase();
  const riders = [];
  const seen = new Set();

  const addRider = (doc) => {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      riders.push({ id: doc.id, ...doc.data() });
    }
  };

  // ת"ז: prefix query עובד מצוין - מחרוזת מספרית עקבית
  if (/^\d/.test(term)) {
    const idSnap = await db.collection('riders')
      .where('idNumber', '>=', term)
      .where('idNumber', '<=', term + '\uf8ff')
      .limit(limit)
      .get();
    idSnap.forEach(doc => addRider(doc));
    if (riders.length > 0) return riders.slice(0, limit);
  }

  // טלפון: prefix query עובד מצוין - מחרוזת מספרית עקבית
  if (/^05/.test(term)) {
    const phoneSnap = await db.collection('riders')
      .where('phone', '>=', term)
      .where('phone', '<=', term + '\uf8ff')
      .limit(limit)
      .get();
    phoneSnap.forEach(doc => addRider(doc));
    if (riders.length > 0) return riders.slice(0, limit);
  }

  // שם: Firestore לא תומך ב-substring search.
  // prefix query על שם כושל כשהמשתמש מקליד שם מלא (למשל "איתמר ע") כי
  // "איתמר" < "איתמר ע" - לא נכנס לטווח. לכן תמיד נשתמש ב-full scan.
  const allSnap = await db.collection('riders').limit(500).get();
  allSnap.forEach(doc => {
    const data = doc.data();
    const fn = (data.firstName || '').trim().toLowerCase();
    const ln = (data.lastName || '').trim().toLowerCase();
    const fullName = `${fn} ${ln}`;
    if (
      fn.includes(lowerTerm) ||
      ln.includes(lowerTerm) ||
      fullName.includes(lowerTerm)
    ) {
      addRider(doc);
    }
  });

  return riders.slice(0, limit);
}

async function searchVehicles(db, term, limit) {
  let vehicles = [];
  const upperSearch = term.toUpperCase();
  const strippedSearch = upperSearch.replace(/-/g, '');

  // חיפוש לפי מספר רישוי
  const plateSnap = await db.collection('vehicles')
    .where('licensePlate', '>=', upperSearch)
    .where('licensePlate', '<=', upperSearch + '\uf8ff')
    .limit(limit)
    .get();
  plateSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

  // חיפוש לפי מספר פנימי
  if (vehicles.length < limit) {
    const internalSnap = await db.collection('vehicles')
      .where('internalNumber', '>=', term)
      .where('internalNumber', '<=', term + '\uf8ff')
      .limit(limit)
      .get();
    internalSnap.forEach(doc => {
      if (!vehicles.find(v => v.id === doc.id)) {
        vehicles.push({ id: doc.id, ...doc.data() });
      }
    });
  }

  // חיפוש לפי יצרן/דגם ומספר רישוי מנורמל (ללא קווים)
  if (vehicles.length === 0) {
    const allSnap = await db.collection('vehicles').limit(100).get();
    const lowerSearch = term.toLowerCase();
    allSnap.forEach(doc => {
      const data = doc.data();
      if (
        data.manufacturer?.toLowerCase().includes(lowerSearch) ||
        data.model?.toLowerCase().includes(lowerSearch) ||
        (strippedSearch.length >= 2 &&
          data.licensePlate?.replace(/-/g, '').toUpperCase().includes(strippedSearch))
      ) {
        vehicles.push({ id: doc.id, ...data });
      }
    });
  }

  return vehicles.slice(0, limit);
}

// fullNamePairs: זוגות [fieldFirst, fieldLast] לבדיקת שם מלא משולב.
// נדרש כשהשם מפוצל לשני שדות (firstName + lastName) ולא שמור כשדה יחיד.
async function searchCollection(db, collectionName, fields, term, limit, fullNamePairs = []) {
  const allSnap = await db.collection(collectionName).limit(200).get();
  const searchLower = term.toLowerCase();
  const results = [];

  allSnap.forEach(doc => {
    const data = doc.data();

    const matchField = fields.some(field => {
      const value = field.includes('.')
        ? field.split('.').reduce((obj, key) => obj?.[key], data)
        : data[field];
      return value?.toLowerCase?.()?.includes(searchLower);
    });

    const matchFullName = fullNamePairs.some(([f1, f2]) => {
      const f1val = (data[f1] || '').trim().toLowerCase();
      const f2val = (data[f2] || '').trim().toLowerCase();
      const fullName = `${f1val} ${f2val}`;
      return f1val.includes(searchLower) || f2val.includes(searchLower) || fullName.includes(searchLower);
    });

    if (matchField || matchFullName) {
      results.push({ id: doc.id, ...data });
    }
  });

  return results.slice(0, limit);
}

const SEARCH_FUNCTIONS = {
  riders: (db, term, limit) => searchRiders(db, term, limit),
  vehicles: (db, term, limit) => searchVehicles(db, term, limit),
  faults: (db, term, limit) => searchCollection(db, 'faults', ['description', 'vehiclePlate', 'riderName', 'notes'], term, limit),
  tasks: (db, term, limit) => searchCollection(db, 'tasks', ['title', 'description', 'riderName', 'vehiclePlate'], term, limit),
  maintenance: (db, term, limit) => searchCollection(db, 'maintenance', ['maintenanceNumber', 'description', 'vehiclePlate', 'riderName', 'garage.name', 'notes'], term, limit),
  garages: (db, term, limit) => searchCollection(db, 'garages', ['name', 'city', 'contactPerson', 'phone'], term, limit),
  users: (db, term, limit) => searchCollection(db, 'users', ['username', 'email', 'firstName', 'lastName'], term, limit, [['firstName', 'lastName']]),
  insurance_claims: (db, term, limit) => searchCollection(db, 'insurance_claims', ['claimNumber', 'externalClaimNumber', 'description', 'vehiclePlate', 'riderName'], term, limit),
};

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const { q, limit = 5 } = req.query;
    const limitPerType = Math.min(parseInt(limit) || 5, 10);

    // מינימום 2 תווים
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, results: {}, totalCount: 0 });
    }

    const searchTerm = q.trim();
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

    // בדיקת הרשאות וחיפוש במקביל
    const searchPromises = ENTITY_CONFIGS.map(async (config) => {
      try {
        // בדיקת הרשאה
        await checkPermission(user, db, config.permissionKey, 'view');

        // חיפוש
        const rawResults = await SEARCH_FUNCTIONS[config.key](db, searchTerm, limitPerType);
        return {
          key: config.key,
          items: rawResults.slice(0, limitPerType).map(config.normalize),
        };
      } catch (err) {
        return { key: config.key, items: [] };
      }
    });

    const settledResults = await Promise.allSettled(searchPromises);

    // בניית אובייקט תוצאות
    const results = {};
    let totalCount = 0;

    settledResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { key, items } = result.value;
        if (items.length > 0) {
          results[key] = items;
          totalCount += items.length;
        }
      }
    });

    return res.status(200).json({ success: true, results, totalCount });
  } catch (error) {
    console.error('Search error:', error);

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: 'שגיאה בחיפוש' });
  }
};
