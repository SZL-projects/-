// Vercel Serverless Function - /api/reports + /api/audit-logs + /api/notifications + cron
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');
const emailService = require('./_utils/emailService');

const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
};

const countByField = (items, field) => {
  const counts = {};
  items.forEach(item => {
    const val = item[field] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

// ========== Audit Logs Handlers ==========

async function handleAuditLogsUsers(db, res) {
  const snapshot = await db.collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(1000)
    .get();

  const usersMap = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.userId && data.userName) {
      usersMap[data.userId] = {
        id: data.userId,
        name: data.userName,
      };
    }
  });

  return res.status(200).json({
    success: true,
    users: Object.values(usersMap),
  });
}

async function handleAuditLogs(req, db, res) {
  const { userId, action, entityType, search, dateFrom, dateTo, limit = 100 } = req.query;
  const limitNum = Math.min(parseInt(limit) || 100, 500);

  let query = db.collection('audit_logs').orderBy('timestamp', 'desc');

  if (userId) {
    query = query.where('userId', '==', userId);
  }
  if (action) {
    query = query.where('action', '==', action);
  }
  if (entityType) {
    query = query.where('entityType', '==', entityType);
  }

  query = query.limit(limitNum);
  const snapshot = await query.get();
  let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (search) {
    const searchLower = search.toLowerCase();
    logs = logs.filter(log =>
      log.userName?.toLowerCase().includes(searchLower) ||
      log.description?.toLowerCase().includes(searchLower) ||
      log.entityType?.toLowerCase().includes(searchLower)
    );
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    logs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() :
        log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000) :
        new Date(log.timestamp);
      return logDate >= fromDate;
    });
  }

  if (dateTo) {
    const toDateVal = new Date(dateTo);
    toDateVal.setHours(23, 59, 59, 999);
    logs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() :
        log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000) :
        new Date(log.timestamp);
      return logDate <= toDateVal;
    });
  }

  return res.status(200).json({
    success: true,
    logs,
    count: logs.length,
  });
}

// ========== Main Handler ==========

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlWithoutQuery = req.url.split('?')[0];

  // ========== Server Time (ללא אימות משתמש) ==========
  if (urlWithoutQuery.includes('server-time')) {
    return res.status(200).json({ success: true, timestamp: Date.now() });
  }

  // ========== Cron: Expiry Reminders (ללא אימות משתמש) ==========
  if (urlWithoutQuery.includes('cron-reminders')) {
    try {
      const { db } = initFirebase();
      const now = new Date();
      console.log(`[Cron] מתחיל בדיקת תוקף - ${now.toLocaleDateString('he-IL')}`);

      // גבולות יום ישראלי (UTC+2): חצות IST = 22:00 UTC של היום הקודם, סוף יום IST = 21:59:59 UTC
      const target14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const target14Start = new Date(target14); target14Start.setUTCHours(22, 0, 0, 0); target14Start.setUTCDate(target14Start.getUTCDate() - 1);
      const target14End = new Date(target14); target14End.setUTCHours(21, 59, 59, 999);
      const target30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const target30Start = new Date(target30); target30Start.setUTCHours(22, 0, 0, 0); target30Start.setUTCDate(target30Start.getUTCDate() - 1);
      const target30End = new Date(target30); target30End.setUTCHours(21, 59, 59, 999);

      const [activeSnap, waitingSnap, ridersSnap] = await Promise.all([
        db.collection('vehicles').where('status', '==', 'active').get(),
        db.collection('vehicles').where('status', '==', 'waiting_for_rider').get(),
        db.collection('riders').where('assignmentStatus', '==', 'assigned').get(),
      ]);

      const vehicles = [];
      activeSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
      waitingSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

      const riderMap = {};
      ridersSnap.forEach(doc => {
        const rider = { id: doc.id, ...doc.data() };
        if (rider.assignedVehicleId) riderMap[rider.assignedVehicleId] = rider;
      });

      const insuranceItems = [];
      const licenseItems = [];

      for (const vehicle of vehicles) {
        const rider = riderMap[vehicle.id] || null;
        const riderName = rider ? `${rider.firstName} ${rider.lastName}` : 'לא משובץ';
        const riderIdNumber = rider?.idNumber || '';
        const vehicleModel = `${vehicle.manufacturer || ''} ${vehicle.model || ''}`.trim();

        const mandatoryExpiry = toDate(vehicle.insurance?.mandatory?.expiryDate);
        if (mandatoryExpiry && mandatoryExpiry >= target14Start && mandatoryExpiry <= target14End) {
          insuranceItems.push({ licensePlate: vehicle.licensePlate, vehicleModel, riderName, riderIdNumber, expiryDate: mandatoryExpiry, insuranceType: 'mandatory' });
        }
        const licenseExpiry = toDate(vehicle.vehicleLicense?.expiryDate);
        if (licenseExpiry && licenseExpiry >= target30Start && licenseExpiry <= target30End) {
          licenseItems.push({ licensePlate: vehicle.licensePlate, vehicleModel, riderName, riderIdNumber, expiryDate: licenseExpiry });
        }
      }

      const results = { insurance: 0, license: 0 };
      if (insuranceItems.length > 0) {
        await emailService.sendInsuranceExpiryEmail(insuranceItems);
        results.insurance = insuranceItems.length;
        console.log(`[Cron] מייל ביטוח נשלח - ${insuranceItems.length} כלים`);
      }
      if (licenseItems.length > 0) {
        await emailService.sendLicenseExpiryEmail(licenseItems);
        results.license = licenseItems.length;
        console.log(`[Cron] מייל טסט/רשיון נשלח - ${licenseItems.length} כלים`);
      }
      if (insuranceItems.length === 0 && licenseItems.length === 0) {
        console.log('[Cron] אין התראות להיום');
      }
      return res.status(200).json({ success: true, ...results });
    } catch (error) {
      console.error('[Cron] שגיאה:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    // ========== Notifications Routes ==========
    if (urlWithoutQuery.includes('notifications')) {
      // בדיקת הרשאה לכלים - סינון לפי רמת גישה
      let vehiclePermLevel = 'none';
      try {
        vehiclePermLevel = await checkPermission(user, db, 'vehicles', 'view');
      } catch (e) {
        // אין הרשאה לכלים - החזר רשימה ריקה
        return res.status(200).json({ success: true, alerts: [], count: 0 });
      }

      const now = new Date();
      // גבולות יום ישראלי (UTC+2) - חלון בדיוק של יום 14 / 30
      const ins14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const ins14Start = new Date(ins14); ins14Start.setUTCHours(22, 0, 0, 0); ins14Start.setUTCDate(ins14Start.getUTCDate() - 1);
      const ins14End = new Date(ins14); ins14End.setUTCHours(21, 59, 59, 999);
      const lic30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const lic30Start = new Date(lic30); lic30Start.setUTCHours(22, 0, 0, 0); lic30Start.setUTCDate(lic30Start.getUTCDate() - 1);
      const lic30End = new Date(lic30); lic30End.setUTCHours(21, 59, 59, 999);

      const [activeSnap, waitingSnap] = await Promise.all([
        db.collection('vehicles').where('status', '==', 'active').get(),
        db.collection('vehicles').where('status', '==', 'waiting_for_rider').get(),
      ]);

      let allVehicles = [
        ...activeSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        ...waitingSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      ];

      // אם הרשאת 'self' - סנן רק לרכבים שהמשתמש משויך אליהם
      if (vehiclePermLevel === 'self') {
        const userVehicleAccess = Array.isArray(user.vehicleAccess) ? user.vehicleAccess : [];
        if (userVehicleAccess.length === 0) {
          return res.status(200).json({ success: true, alerts: [], count: 0 });
        }
        allVehicles = allVehicles.filter(v => userVehicleAccess.includes(v.id));
      }

      const alerts = [];
      for (const vehicle of allVehicles) {
        if (vehicle.insurance?.mandatory?.expiryDate) {
          const expiry = toDate(vehicle.insurance.mandatory.expiryDate);
          if (expiry && expiry >= ins14Start && expiry <= ins14End) {
            alerts.push({
              id: `ins-mandatory-${vehicle.id}`,
              type: 'insurance', subType: 'mandatory',
              vehicleId: vehicle.id, licensePlate: vehicle.licensePlate,
              expiryDate: expiry.toISOString(),
              daysLeft: 14,
              label: `ביטוח חובה - ${vehicle.licensePlate}`,
            });
          }
        }
        if (vehicle.insurance?.comprehensive?.expiryDate) {
          const expiry = toDate(vehicle.insurance.comprehensive.expiryDate);
          if (expiry && expiry >= ins14Start && expiry <= ins14End) {
            alerts.push({
              id: `ins-comprehensive-${vehicle.id}`,
              type: 'insurance', subType: 'comprehensive',
              vehicleId: vehicle.id, licensePlate: vehicle.licensePlate,
              expiryDate: expiry.toISOString(),
              daysLeft: 14,
              label: `ביטוח מקיף - ${vehicle.licensePlate}`,
            });
          }
        }
        if (vehicle.vehicleLicense?.expiryDate) {
          const expiry = toDate(vehicle.vehicleLicense.expiryDate);
          if (expiry && expiry >= lic30Start && expiry <= lic30End) {
            alerts.push({
              id: `license-${vehicle.id}`,
              type: 'license',
              vehicleId: vehicle.id, licensePlate: vehicle.licensePlate,
              expiryDate: expiry.toISOString(),
              daysLeft: 30,
              label: `טסט/רשיון - ${vehicle.licensePlate}`,
            });
          }
        }
      }
      alerts.sort((a, b) => a.daysLeft - b.daysLeft);
      return res.status(200).json({ success: true, alerts, count: alerts.length });
    }

    // ========== Audit Logs Routes ==========
    if (urlWithoutQuery.includes('audit-logs')) {
      await checkPermission(user, db, 'audit_logs', 'view');

      let subRoute = null;
      let match = urlWithoutQuery.match(/\/api\/audit-logs\/([^/]+)/);
      if (!match) match = urlWithoutQuery.match(/\/audit-logs\/([^/]+)/);
      if (match) subRoute = match[1];

      if (subRoute === 'users') {
        return handleAuditLogsUsers(db, res);
      }
      return handleAuditLogs(req, db, res);
    }

    // ========== Reports Routes ==========
    await checkPermission(user, db, 'reports', 'view');

    let subRoute = null;
    let match = urlWithoutQuery.match(/\/api\/reports\/([^/]+)/);
    if (!match) match = urlWithoutQuery.match(/\/reports\/([^/]+)/);
    if (!match) match = urlWithoutQuery.match(/^\/([^/]+)/);
    if (match) subRoute = match[1];

    // GET /api/reports/summary
    if (subRoute === 'summary') {
      const [vehiclesSnap, ridersSnap, faultsSnap, tasksSnap, maintenanceSnap, checksSnap, claimsSnap] = await Promise.all([
        db.collection('vehicles').get(),
        db.collection('riders').get(),
        db.collection('faults').get(),
        db.collection('tasks').get(),
        db.collection('maintenance').get(),
        db.collection('monthlyChecks').get(),
        db.collection('insuranceClaims').get(),
      ]);

      const vehicles = vehiclesSnap.docs.map(d => d.data());
      const riders = ridersSnap.docs.map(d => d.data());
      const faults = faultsSnap.docs.map(d => d.data());
      const tasks = tasksSnap.docs.map(d => d.data());
      const maintenance = maintenanceSnap.docs.map(d => d.data());
      const monthlyChecks = checksSnap.docs.map(d => d.data());
      const claims = claimsSnap.docs.map(d => d.data());

      const activeVehicles = vehicles.filter(v => v.status === 'active').length;
      const activeRiders = riders.filter(r => r.riderStatus === 'active' || r.status === 'active').length;
      const openFaults = faults.filter(f => f.status === 'open' || f.status === 'in_progress').length;
      const activeTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length;

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const monthlyChecksThisMonth = monthlyChecks.filter(mc => {
        const d = toDate(mc.createdAt);
        return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      let totalMaintenanceCost = 0;
      maintenance.forEach(m => { totalMaintenanceCost += m.costs?.totalCost || 0; });

      const pendingClaims = claims.filter(c => !['closed', 'rejected'].includes(c.status)).length;
      let totalClaimAmount = 0;
      claims.forEach(c => { totalClaimAmount += c.claimAmount || 0; });

      return res.status(200).json({
        success: true,
        summary: {
          totalVehicles: vehicles.length,
          activeVehicles,
          totalRiders: riders.length,
          activeRiders,
          openFaults,
          activeTasks,
          monthlyChecksThisMonth,
          totalMaintenanceCost,
          pendingClaims,
          totalClaimAmount,
          totalMaintenance: maintenance.length,
          totalFaults: faults.length,
        }
      });
    }

    // GET /api/reports/monthly-trends
    if (subRoute === 'monthly-trends') {
      const months = parseInt(req.query.months) || 6;

      const [faultsSnap, tasksSnap, maintenanceSnap, checksSnap, claimsSnap] = await Promise.all([
        db.collection('faults').get(),
        db.collection('tasks').get(),
        db.collection('maintenance').get(),
        db.collection('monthlyChecks').get(),
        db.collection('insuranceClaims').get(),
      ]);

      const faults = faultsSnap.docs.map(d => d.data());
      const tasks = tasksSnap.docs.map(d => d.data());
      const maintenance = maintenanceSnap.docs.map(d => d.data());
      const monthlyChecks = checksSnap.docs.map(d => d.data());
      const claims = claimsSnap.docs.map(d => d.data());

      const now = new Date();
      const trends = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();

        const inMonth = (item, dateField) => {
          const d = toDate(item[dateField] || item.createdAt);
          return d && d.getMonth() === month && d.getFullYear() === year;
        };

        trends.push({
          month: hebrewMonths[month],
          year,
          tasks: tasks.filter(t => inMonth(t, 'createdAt')).length,
          faults: faults.filter(f => inMonth(f, 'reportedDate')).length,
          checks: monthlyChecks.filter(mc => inMonth(mc, 'createdAt')).length,
          maintenance: maintenance.filter(m => inMonth(m, 'maintenanceDate')).length,
          claims: claims.filter(c => inMonth(c, 'eventDate')).length,
        });
      }

      return res.status(200).json({ success: true, trends });
    }

    // GET /api/reports/vehicles
    if (subRoute === 'vehicles') {
      const snapshot = await db.collection('vehicles').get();
      const vehicles = snapshot.docs.map(d => d.data());

      return res.status(200).json({
        success: true,
        byType: countByField(vehicles, 'vehicleType'),
        byStatus: countByField(vehicles, 'status'),
      });
    }

    // GET /api/reports/faults
    if (subRoute === 'faults') {
      const snapshot = await db.collection('faults').get();
      const faults = snapshot.docs.map(d => d.data());

      return res.status(200).json({
        success: true,
        bySeverity: countByField(faults, 'severity'),
        byStatus: countByField(faults, 'status'),
      });
    }

    // GET /api/reports/maintenance
    if (subRoute === 'maintenance') {
      const snapshot = await db.collection('maintenance').get();
      const maintenance = snapshot.docs.map(d => d.data());

      let totalCost = 0;
      const costByType = {};
      maintenance.forEach(m => {
        const cost = m.costs?.totalCost || 0;
        totalCost += cost;
        const type = m.maintenanceType || 'other';
        costByType[type] = (costByType[type] || 0) + cost;
      });

      const now = new Date();
      const costByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();
        let monthCost = 0;
        maintenance.forEach(m => {
          const d = toDate(m.maintenanceDate || m.createdAt);
          if (d && d.getMonth() === month && d.getFullYear() === year) {
            monthCost += m.costs?.totalCost || 0;
          }
        });
        costByMonth.push({ month: hebrewMonths[month], year, cost: monthCost });
      }

      return res.status(200).json({
        success: true,
        byType: countByField(maintenance, 'maintenanceType'),
        totalCost,
        costByType: Object.entries(costByType).map(([name, value]) => ({ name, value })),
        costByMonth,
      });
    }

    // GET /api/reports/tasks
    if (subRoute === 'tasks') {
      const snapshot = await db.collection('tasks').get();
      const tasks = snapshot.docs.map(d => d.data());

      return res.status(200).json({
        success: true,
        byStatus: countByField(tasks, 'status'),
        byPriority: countByField(tasks, 'priority'),
      });
    }

    // GET /api/reports/insurance
    if (subRoute === 'insurance') {
      const snapshot = await db.collection('insuranceClaims').get();
      const claims = snapshot.docs.map(d => d.data());

      let totalClaimAmount = 0;
      let totalApprovedAmount = 0;
      let totalPaidAmount = 0;
      claims.forEach(c => {
        totalClaimAmount += c.claimAmount || 0;
        totalApprovedAmount += c.approvedAmount || 0;
        totalPaidAmount += c.paidAmount || 0;
      });

      return res.status(200).json({
        success: true,
        byStatus: countByField(claims, 'status'),
        byEventType: countByField(claims, 'eventType'),
        totalClaimAmount,
        totalApprovedAmount,
        totalPaidAmount,
      });
    }

    return res.status(404).json({ success: false, message: 'Report type not found' });

  } catch (error) {
    console.error('Reports/AuditLogs error:', error);

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};
