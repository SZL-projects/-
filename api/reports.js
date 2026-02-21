// Vercel Serverless Function - /api/reports + /api/audit-logs
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');

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
  const snapshot = await db.collection('auditLogs')
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

  let query = db.collection('auditLogs').orderBy('timestamp', 'desc');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const urlWithoutQuery = req.url.split('?')[0];

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
