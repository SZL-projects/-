const express = require('express');
const router = express.Router();
const vehicleModel = require('../models/firestore/VehicleModel');
const FaultModel = require('../models/firestore/FaultModel');
const { protect } = require('../middleware/auth-firebase');
const PermissionModel = require('../models/firestore/PermissionModel');

// כל הנתיבים מוגנים
router.use(protect);

/**
 * GET /api/notifications/alerts
 * מחזיר התראות פעילות: ביטוחים שפוקעים ב-14 יום הקרובים ורשיונות ב-30 יום הקרובים
 * סינון לפי הרשאות המשתמש:
 *   - view/edit: כל ההתראות
 *   - self: רק ההתראות של הרכב שלו
 *   - none: אין התראות
 */
router.get('/alerts', async (req, res) => {
  try {
    // בדיקת רמת הרשאה לכלים
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const { allowed, level } = await PermissionModel.checkAccess(userRoles, 'vehicles', 'view');

    // אם אין הרשאה כלל - החזר רשימה ריקה
    if (!allowed && level === 'none') {
      return res.json({ success: true, alerts: [], count: 0 });
    }

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // שליפת כל הכלים הפעילים (ללא מגבלת limit)
    const vehicles = await vehicleModel.getAll({ status: 'active' }, 500);
    const waitingVehicles = await vehicleModel.getAll({ status: 'waiting_for_rider' }, 500);
    let allVehicles = [...vehicles, ...waitingVehicles];

    // אם הרשאת 'self' - סנן רק לרכבים שהמשתמש משויך אליהם
    if (level === 'self') {
      const userVehicleAccess = Array.isArray(req.user.vehicleAccess) ? req.user.vehicleAccess : [];
      if (userVehicleAccess.length === 0) {
        return res.json({ success: true, alerts: [], count: 0 });
      }
      allVehicles = allVehicles.filter(v => userVehicleAccess.includes(v.id));
    }

    const alerts = [];

    for (const vehicle of allVehicles) {
      // ביטוח - פוקע תוך 14 יום
      if (vehicle.insurance?.mandatory?.expiryDate) {
        const expiry = new Date(vehicle.insurance.mandatory.expiryDate);
        if (expiry >= now && expiry <= in14Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `ins-${vehicle.id}`,
            type: 'insurance',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: vehicle.insurance.mandatory.expiryDate,
            daysLeft,
            label: `ביטוח - ${vehicle.licensePlate}`,
          });
        }
      }

      // רשיון רכב/טסט - פוקע תוך 30 יום
      if (vehicle.vehicleLicense?.expiryDate) {
        const expiry = new Date(vehicle.vehicleLicense.expiryDate);
        if (expiry >= now && expiry <= in30Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `license-${vehicle.id}`,
            type: 'license',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: vehicle.vehicleLicense.expiryDate,
            daysLeft,
            label: `טסט/רשיון - ${vehicle.licensePlate}`,
          });
        }
      }
    }

    // מיון: הדחוף ביותר ראשון
    alerts.sort((a, b) => a.daysLeft - b.daysLeft);

    // הוספת תקלות פתוחות ובטיפול (למנהלים בלבד)
    const userRolesFault = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const { allowed: faultAllowed, level: faultLevel } = await PermissionModel.checkAccess(userRolesFault, 'faults', 'view');

    if (faultAllowed && faultLevel !== 'self' && faultLevel !== 'none') {
      try {
        // שליפה ללא פילטר סטטוס (כדי להימנע מ-composite index ב-Firestore) + סינון בזיכרון
        const allFetchedFaults = await FaultModel.getAll({}, 100);
        const activeFaults = allFetchedFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
        const faultAlerts = activeFaults.map(fault => ({
          id: `fault-${fault.id || fault._id}`,
          type: 'fault',
          faultId: fault.id || fault._id,
          vehicleId: fault.vehicleId,
          licensePlate: fault.vehicleLicensePlate || fault.vehicleNumber || '-',
          severity: fault.severity,
          status: fault.status,
          title: fault.title || fault.description?.substring(0, 50) || 'תקלה',
          label: `תקלה: ${fault.title || fault.description?.substring(0, 40) || 'תקלה'} - ${fault.vehicleLicensePlate || '-'}`,
          canRide: fault.canRide,
          createdAt: fault.reportedDate || fault.createdAt,
        }));
        alerts.push(...faultAlerts);
      } catch (faultErr) {
        console.error('Error fetching fault alerts:', faultErr);
      }
    }

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.json({ success: true, alerts, count: alerts.length });
  } catch (error) {
    console.error('Error fetching notification alerts:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת ההתראות' });
  }
});

module.exports = router;
