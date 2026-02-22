const express = require('express');
const router = express.Router();
const VehicleModel = require('../models/firestore/VehicleModel');
const { protect } = require('../middleware/auth-firebase');

const vehicleModel = new VehicleModel();

// כל הנתיבים מוגנים
router.use(protect);

/**
 * GET /api/notifications/alerts
 * מחזיר התראות פעילות: ביטוחים שפוקעים ב-14 יום הקרובים ורשיונות ב-30 יום הקרובים
 */
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // שליפת כל הכלים הפעילים (ללא מגבלת limit)
    const vehicles = await vehicleModel.getAll({ status: 'active' }, 500);
    const waitingVehicles = await vehicleModel.getAll({ status: 'waiting_for_rider' }, 500);
    const allVehicles = [...vehicles, ...waitingVehicles];

    const alerts = [];

    for (const vehicle of allVehicles) {
      // ביטוח חובה - פוקע תוך 14 יום
      if (vehicle.insurance?.mandatory?.expiryDate) {
        const expiry = new Date(vehicle.insurance.mandatory.expiryDate);
        if (expiry >= now && expiry <= in14Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `ins-mandatory-${vehicle.id}`,
            type: 'insurance',
            subType: 'mandatory',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: vehicle.insurance.mandatory.expiryDate,
            daysLeft,
            label: `ביטוח חובה - ${vehicle.licensePlate}`,
          });
        }
      }

      // ביטוח מקיף - פוקע תוך 14 יום
      if (vehicle.insurance?.comprehensive?.expiryDate) {
        const expiry = new Date(vehicle.insurance.comprehensive.expiryDate);
        if (expiry >= now && expiry <= in14Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `ins-comprehensive-${vehicle.id}`,
            type: 'insurance',
            subType: 'comprehensive',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: vehicle.insurance.comprehensive.expiryDate,
            daysLeft,
            label: `ביטוח מקיף - ${vehicle.licensePlate}`,
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

    res.json({ success: true, alerts, count: alerts.length });
  } catch (error) {
    console.error('Error fetching notification alerts:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת ההתראות' });
  }
});

module.exports = router;
