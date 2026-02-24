// Vercel Cron Job - /api/cron/expiry-reminders
// מופעל כל יום בשעה 09:00 שעון ישראל (07:00 UTC)
// שולח התראות ביטוח 14 יום לפני פקיעה ורשיון/טסט 30 יום לפני פקיעה

const { initFirebase } = require('../_utils/firebase');
const emailService = require('../_utils/emailService');

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val._seconds) return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = async (req, res) => {
  // אבטחה: Vercel שולח header מיוחד לבקשות cron
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const hasCronSecret = process.env.CRON_SECRET && req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !hasCronSecret) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { db } = initFirebase();
    const now = new Date();

    console.log(`[Cron] מתחיל בדיקת תוקף - ${now.toLocaleDateString('he-IL')}`);

    // תאריכי יעד מדויקים (כל היום)
    const target14Start = new Date(now); target14Start.setDate(target14Start.getDate() + 14); target14Start.setHours(0,0,0,0);
    const target14End = new Date(target14Start); target14End.setHours(23,59,59,999);
    const target30Start = new Date(now); target30Start.setDate(target30Start.getDate() + 30); target30Start.setHours(0,0,0,0);
    const target30End = new Date(target30Start); target30End.setHours(23,59,59,999);

    // שליפת כלים ורוכבים
    const [activeSnap, waitingSnap, ridersSnap] = await Promise.all([
      db.collection('vehicles').where('status', '==', 'active').get(),
      db.collection('vehicles').where('status', '==', 'waiting_for_rider').get(),
      db.collection('riders').where('assignmentStatus', '==', 'assigned').get(),
    ]);

    const vehicles = [];
    activeSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
    waitingSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

    // מפת vehicleId -> rider
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

      // ביטוח חובה
      const mandatoryExpiry = toDate(vehicle.insurance?.mandatory?.expiryDate);
      if (mandatoryExpiry && mandatoryExpiry >= target14Start && mandatoryExpiry <= target14End) {
        insuranceItems.push({ licensePlate: vehicle.licensePlate, vehicleModel, riderName, riderIdNumber, expiryDate: mandatoryExpiry, insuranceType: 'mandatory' });
      }

      // ביטוח מקיף
      const comprehensiveExpiry = toDate(vehicle.insurance?.comprehensive?.expiryDate);
      if (comprehensiveExpiry && comprehensiveExpiry >= target14Start && comprehensiveExpiry <= target14End) {
        insuranceItems.push({ licensePlate: vehicle.licensePlate, vehicleModel, riderName, riderIdNumber, expiryDate: comprehensiveExpiry, insuranceType: 'comprehensive' });
      }

      // רשיון/טסט
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
};
