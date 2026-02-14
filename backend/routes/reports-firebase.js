const express = require('express');
const router = express.Router();
const VehicleModel = require('../models/firestore/VehicleModel');
const RiderModel = require('../models/firestore/RiderModel');
const FaultModel = require('../models/firestore/FaultModel');
const TaskModel = require('../models/firestore/TaskModel');
const MaintenanceModel = require('../models/firestore/MaintenanceModel');
const MonthlyCheckModel = require('../models/firestore/MonthlyCheckModel');
const InsuranceClaimModel = require('../models/firestore/InsuranceClaimModel');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

// פונקציית עזר - חיפוש חודש עברי
const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// פונקציית עזר - המרת timestamp ל-Date
const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
};

// פונקציית עזר - ספירה לפי שדה
const countByField = (items, field) => {
  const counts = {};
  items.forEach(item => {
    const val = item[field] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

// @route   GET /api/reports/summary
// @desc    סיכום כללי מכל הקולקציות
// @access  Private
router.get('/summary', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const [vehicles, riders, faults, tasks, maintenance, monthlyChecks, claims] = await Promise.all([
      VehicleModel.getAll({}, 10000),
      RiderModel.getAll({}, 10000),
      FaultModel.getAll({}, 10000),
      TaskModel.getAll({}, 10000),
      MaintenanceModel.getAll({}, 10000),
      MonthlyCheckModel.getAll({}, 10000),
      InsuranceClaimModel.getAll({}, 10000),
    ]);

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

    res.json({
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/monthly-trends
// @desc    מגמות חודשיות
// @access  Private
router.get('/monthly-trends', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;

    const [faults, tasks, maintenance, monthlyChecks, claims] = await Promise.all([
      FaultModel.getAll({}, 10000),
      TaskModel.getAll({}, 10000),
      MaintenanceModel.getAll({}, 10000),
      MonthlyCheckModel.getAll({}, 10000),
      InsuranceClaimModel.getAll({}, 10000),
    ]);

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

    res.json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/vehicles
// @desc    פילוח כלים
// @access  Private
router.get('/vehicles', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const vehicles = await VehicleModel.getAll({}, 10000);

    res.json({
      success: true,
      byType: countByField(vehicles, 'vehicleType'),
      byStatus: countByField(vehicles, 'status'),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/faults
// @desc    פילוח תקלות
// @access  Private
router.get('/faults', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const faults = await FaultModel.getAll({}, 10000);

    res.json({
      success: true,
      bySeverity: countByField(faults, 'severity'),
      byStatus: countByField(faults, 'status'),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/maintenance
// @desc    פילוח טיפולים ועלויות
// @access  Private
router.get('/maintenance', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const maintenance = await MaintenanceModel.getAll({}, 10000);

    let totalCost = 0;
    const costByType = {};
    maintenance.forEach(m => {
      const cost = m.costs?.totalCost || 0;
      totalCost += cost;
      const type = m.maintenanceType || 'other';
      costByType[type] = (costByType[type] || 0) + cost;
    });

    // עלויות לפי חודש (6 חודשים אחרונים)
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

    res.json({
      success: true,
      byType: countByField(maintenance, 'maintenanceType'),
      totalCost,
      costByType: Object.entries(costByType).map(([name, value]) => ({ name, value })),
      costByMonth,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/tasks
// @desc    פילוח משימות
// @access  Private
router.get('/tasks', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const tasks = await TaskModel.getAll({}, 10000);

    res.json({
      success: true,
      byStatus: countByField(tasks, 'status'),
      byPriority: countByField(tasks, 'priority'),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/insurance
// @desc    פילוח תביעות ביטוח
// @access  Private
router.get('/insurance', checkPermission('reports', 'view'), async (req, res) => {
  try {
    const claims = await InsuranceClaimModel.getAll({}, 10000);

    let totalClaimAmount = 0;
    let totalApprovedAmount = 0;
    let totalPaidAmount = 0;
    claims.forEach(c => {
      totalClaimAmount += c.claimAmount || 0;
      totalApprovedAmount += c.approvedAmount || 0;
      totalPaidAmount += c.paidAmount || 0;
    });

    res.json({
      success: true,
      byStatus: countByField(claims, 'status'),
      byEventType: countByField(claims, 'eventType'),
      totalClaimAmount,
      totalApprovedAmount,
      totalPaidAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
