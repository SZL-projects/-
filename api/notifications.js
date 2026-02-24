// Vercel Serverless Function - /api/notifications
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // שליפת כלים פעילים
    const [activeSnap, waitingSnap] = await Promise.all([
      db.collection('vehicles').where('status', '==', 'active').get(),
      db.collection('vehicles').where('status', '==', 'waiting_for_rider').get(),
    ]);

    const vehicles = [];
    activeSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
    waitingSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

    const alerts = [];

    for (const vehicle of vehicles) {
      // ביטוח חובה
      if (vehicle.insurance?.mandatory?.expiryDate) {
        const expiry = toDate(vehicle.insurance.mandatory.expiryDate);
        if (expiry && expiry >= now && expiry <= in14Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `ins-mandatory-${vehicle.id}`,
            type: 'insurance',
            subType: 'mandatory',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: expiry.toISOString(),
            daysLeft,
          });
        }
      }

      // ביטוח מקיף
      if (vehicle.insurance?.comprehensive?.expiryDate) {
        const expiry = toDate(vehicle.insurance.comprehensive.expiryDate);
        if (expiry && expiry >= now && expiry <= in14Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `ins-comprehensive-${vehicle.id}`,
            type: 'insurance',
            subType: 'comprehensive',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: expiry.toISOString(),
            daysLeft,
          });
        }
      }

      // רשיון/טסט
      if (vehicle.vehicleLicense?.expiryDate) {
        const expiry = toDate(vehicle.vehicleLicense.expiryDate);
        if (expiry && expiry >= now && expiry <= in30Days) {
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `license-${vehicle.id}`,
            type: 'license',
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            expiryDate: expiry.toISOString(),
            daysLeft,
          });
        }
      }
    }

    alerts.sort((a, b) => a.daysLeft - b.daysLeft);

    return res.status(200).json({ success: true, alerts, count: alerts.length });

  } catch (error) {
    console.error('Notifications error:', error);
    if (error.message?.includes('token') || error.message?.includes('Token')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val._seconds) return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
