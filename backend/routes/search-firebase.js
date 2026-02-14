const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth-firebase');
const PermissionModel = require('../models/firestore/PermissionModel');
const RiderModel = require('../models/firestore/RiderModel');
const VehicleModel = require('../models/firestore/VehicleModel');
const FaultModel = require('../models/firestore/FaultModel');
const TaskModel = require('../models/firestore/TaskModel');
const MaintenanceModel = require('../models/firestore/MaintenanceModel');
const GarageModel = require('../models/firestore/GarageModel');
const InsuranceClaimModel = require('../models/firestore/InsuranceClaimModel');
const UserModel = require('../models/firestore/UserModel');

// כל הנתיבים דורשים אימות
router.use(protect);

// הגדרת ישויות לחיפוש
const entityConfigs = [
  {
    key: 'riders',
    permissionKey: 'riders',
    search: (term, limit) => RiderModel.search(term, {}, limit),
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
    search: (term, limit) => VehicleModel.search(term, {}, limit),
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
    search: (term, limit) => FaultModel.search(term, {}, limit),
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
    search: (term, limit) => TaskModel.search(term, {}, limit),
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
    search: (term, limit) => MaintenanceModel.search(term, {}, limit),
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
    search: (term, limit) => GarageModel.search(term, {}),
    normalize: (garage) => ({
      id: garage.id,
      type: 'garages',
      title: garage.name || 'מוסך',
      subtitle: [garage.city, garage.contactPerson, garage.phone].filter(Boolean).join(' | '),
      url: '/garages',
    }),
  },
  {
    key: 'insurance_claims',
    permissionKey: 'insurance_claims',
    search: (term, limit) => InsuranceClaimModel.search(term, {}, limit),
    normalize: (claim) => ({
      id: claim.id,
      type: 'insurance_claims',
      title: claim.claimNumber || claim.description?.substring(0, 60) || 'תביעת ביטוח',
      subtitle: [claim.vehiclePlate, claim.insuranceCompany, claim.status].filter(Boolean).join(' | '),
      url: '/insurance-claims',
    }),
  },
  {
    key: 'users',
    permissionKey: 'users',
    search: (term, limit) => UserModel.search(term, {}, limit),
    normalize: (user) => ({
      id: user.id,
      type: 'users',
      title: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '',
      subtitle: [user.email, user.role].filter(Boolean).join(' | '),
      url: '/users',
    }),
  },
];

// @route   GET /api/search?q=<term>&limit=5
// @desc    חיפוש גלובלי בכל הישויות המורשות
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    const limitPerType = Math.min(parseInt(limit) || 5, 10);

    // מינימום 2 תווים
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, results: {}, totalCount: 0 });
    }

    const searchTerm = q.trim();
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];

    // בדיקת הרשאות לכל ישות במקביל
    const permissionChecks = await Promise.all(
      entityConfigs.map(async (config) => {
        const { allowed } = await PermissionModel.checkAccess(userRoles, config.permissionKey, 'view');
        return { ...config, allowed };
      })
    );

    const allowedEntities = permissionChecks.filter((e) => e.allowed);

    // חיפוש במקביל בכל הישויות המורשות
    const searchPromises = allowedEntities.map(async (entity) => {
      try {
        const rawResults = await entity.search(searchTerm, limitPerType);
        return {
          key: entity.key,
          items: rawResults.slice(0, limitPerType).map(entity.normalize),
        };
      } catch (err) {
        console.error(`Search error in ${entity.key}:`, err.message);
        return { key: entity.key, items: [] };
      }
    });

    const settledResults = await Promise.allSettled(searchPromises);

    // בניית אובייקט תוצאות מקובצות לפי סוג
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

    res.json({ success: true, results, totalCount });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בחיפוש' });
  }
});

module.exports = router;
