// Vercel Serverless Function - /api/notifications
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = initFirebase();
    await authenticateToken(req, db);

    // GET /api/notifications/alerts
    const url = req.url.split('?')[0];
    if ((url.endsWith('/alerts') || url === '/alerts') && req.method === 'GET') {
      const now = new Date();
      const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // שליפת כלים פעילים ומחכים לרוכב
      const [activeSnap, waitingSnap] = await Promise.all([
        db.collection('vehicles').where('status', '==', 'active').get(),
        db.collection('vehicles').where('status', '==', 'waiting_for_rider').get(),
      ]);

      const allVehicles = [
        ...activeSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        ...waitingSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      ];

      const alerts = [];

      for (const vehicle of allVehicles) {
        // ביטוח חובה - פוקע תוך 14 יום
        if (vehicle.insurance?.mandatory?.expiryDate) {
          const expiry = new Date(vehicle.insurance.mandatory.expiryDate);
          if (expiry >= now && expiry <= in14Days) {
            alerts.push({
              id: `ins-mandatory-${vehicle.id}`,
              type: 'insurance',
              subType: 'mandatory',
              vehicleId: vehicle.id,
              licensePlate: vehicle.licensePlate,
              expiryDate: vehicle.insurance.mandatory.expiryDate,
              daysLeft: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)),
              label: `ביטוח חובה - ${vehicle.licensePlate}`,
            });
          }
        }

        // ביטוח מקיף - פוקע תוך 14 יום
        if (vehicle.insurance?.comprehensive?.expiryDate) {
          const expiry = new Date(vehicle.insurance.comprehensive.expiryDate);
          if (expiry >= now && expiry <= in14Days) {
            alerts.push({
              id: `ins-comprehensive-${vehicle.id}`,
              type: 'insurance',
              subType: 'comprehensive',
              vehicleId: vehicle.id,
              licensePlate: vehicle.licensePlate,
              expiryDate: vehicle.insurance.comprehensive.expiryDate,
              daysLeft: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)),
              label: `ביטוח מקיף - ${vehicle.licensePlate}`,
            });
          }
        }

        // רשיון רכב/טסט - פוקע תוך 30 יום
        if (vehicle.vehicleLicense?.expiryDate) {
          const expiry = new Date(vehicle.vehicleLicense.expiryDate);
          if (expiry >= now && expiry <= in30Days) {
            alerts.push({
              id: `license-${vehicle.id}`,
              type: 'license',
              vehicleId: vehicle.id,
              licensePlate: vehicle.licensePlate,
              expiryDate: vehicle.vehicleLicense.expiryDate,
              daysLeft: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)),
              label: `טסט/רשיון - ${vehicle.licensePlate}`,
            });
          }
        }
      }

      // מיון: הדחוף ביותר ראשון
      alerts.sort((a, b) => a.daysLeft - b.daysLeft);

      return res.status(200).json({ success: true, alerts, count: alerts.length });
    }

    return res.status(404).json({ success: false, message: 'נתיב לא נמצא' });

  } catch (error) {
    if (error.message?.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    console.error('Notifications error:', error);
    res.status(500).json({ success: false, message: 'שגיאת שרת' });
  }
};
