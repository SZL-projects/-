const cron = require('node-cron');
const { db } = require('../config/firebase');
const COLLECTIONS = require('../config/collections');
const { sendInsuranceExpiryEmail, sendLicenseExpiryEmail } = require('../services/emailService');

/**
 * Scheduler לשליחת התראות יומיות על תוקף ביטוח ורשיון רכב
 *
 * פועל כל יום בשעה 09:00 (שעון ישראל)
 * בודק:
 * - ביטוחים (חובה/מקיף) שפוקעים בדיוק עוד 14 יום (התראה פעם אחת)
 * - רשיונות רכב/טסט שפוקעים בדיוק עוד 30 יום (התראה פעם אחת)
 * שולח מייל נפרד לכל סוג
 */

class ExpiryReminderScheduler {
  constructor() {
    this.job = null;
  }

  /**
   * בניית מפה של vehicleId -> rider מכל הרוכבים המשובצים
   */
  async buildRiderMap() {
    const snapshot = await db.collection(COLLECTIONS.RIDERS)
      .where('assignmentStatus', '==', 'assigned')
      .get();

    const map = {};
    snapshot.forEach(doc => {
      const rider = { id: doc.id, ...doc.data() };
      if (rider.assignedVehicleId) {
        map[rider.assignedVehicleId] = rider;
      }
    });
    return map;
  }

  /**
   * איסוף כל הפריטים שעומדים לפוג בדיוק ב-14/30 ימים
   */
  async collectExpiringItems() {
    const now = new Date();

    // תאריך יעד: בדיוק 14 ימים מהיום (לביטוחים)
    const target14 = new Date(now);
    target14.setDate(target14.getDate() + 14);
    target14.setHours(0, 0, 0, 0);
    const target14End = new Date(target14);
    target14End.setHours(23, 59, 59, 999);

    // תאריך יעד: בדיוק 30 ימים מהיום (לטסט/רשיון)
    const target30 = new Date(now);
    target30.setDate(target30.getDate() + 30);
    target30.setHours(0, 0, 0, 0);
    const target30End = new Date(target30);
    target30End.setHours(23, 59, 59, 999);

    const expiringItems = [];

    try {
      // שליפת כל הכלים הפעילים מ-Firestore
      const activeSnap = await db.collection(COLLECTIONS.VEHICLES)
        .where('status', 'in', ['active', 'waiting_for_rider'])
        .get();

      const vehicles = [];
      activeSnap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

      // בניית מפת רוכבים
      const riderMap = await this.buildRiderMap();

      for (const vehicle of vehicles) {
        const rider = riderMap[vehicle.id] || null;
        const riderName = rider
          ? `${rider.firstName} ${rider.lastName}`
          : 'לא משובץ';
        const riderIdNumber = rider?.idNumber || '';
        const vehicleModel = `${vehicle.manufacturer || ''} ${vehicle.model || ''}`.trim();

        // ביטוח חובה - התראה בדיוק 14 יום לפני הפקיעה
        if (vehicle.insurance?.mandatory?.expiryDate) {
          const expiryDate = new Date(vehicle.insurance.mandatory.expiryDate);
          if (expiryDate >= target14 && expiryDate <= target14End) {
            expiringItems.push({
              type: 'insurance',
              insuranceType: 'mandatory',
              licensePlate: vehicle.licensePlate,
              vehicleId: vehicle.id,
              vehicleModel,
              expiryDate,
              daysLeft: 14,
              riderName,
              riderIdNumber,
            });
          }
        }

        // ביטוח מקיף - התראה בדיוק 14 יום לפני הפקיעה
        if (vehicle.insurance?.comprehensive?.expiryDate) {
          const expiryDate = new Date(vehicle.insurance.comprehensive.expiryDate);
          if (expiryDate >= target14 && expiryDate <= target14End) {
            expiringItems.push({
              type: 'insurance',
              insuranceType: 'comprehensive',
              licensePlate: vehicle.licensePlate,
              vehicleId: vehicle.id,
              vehicleModel,
              expiryDate,
              daysLeft: 14,
              riderName,
              riderIdNumber,
            });
          }
        }

        // רשיון רכב/טסט - התראה בדיוק 30 יום לפני הפקיעה
        if (vehicle.vehicleLicense?.expiryDate) {
          const expiryDate = new Date(vehicle.vehicleLicense.expiryDate);
          if (expiryDate >= target30 && expiryDate <= target30End) {
            expiringItems.push({
              type: 'license',
              licensePlate: vehicle.licensePlate,
              vehicleId: vehicle.id,
              vehicleModel,
              expiryDate,
              daysLeft: 30,
              riderName,
              riderIdNumber,
            });
          }
        }
      }

      return expiringItems;
    } catch (error) {
      console.error('Error collecting expiring items:', error);
      return [];
    }
  }

  /**
   * ביצוע שליחת התראות יומיות
   */
  async sendDailyReminders() {
    try {
      const now = new Date();
      console.log(`\n📅 מתחיל בדיקת תוקף יומית...`);
      console.log(`   תאריך: ${now.toLocaleDateString('he-IL')}`);

      const expiringItems = await this.collectExpiringItems();

      const insuranceItems = expiringItems.filter(i => i.type === 'insurance');
      const licenseItems = expiringItems.filter(i => i.type === 'license');

      if (insuranceItems.length === 0 && licenseItems.length === 0) {
        console.log('✅ אין ביטוחים או רשיונות שעומדים לפוג היום (14/30 ימים)');
        return;
      }

      console.log(`⚠️ נמצאו ${expiringItems.length} פריטים הדורשים התראה היום:`);
      console.log(`   - ביטוחים (14 יום): ${insuranceItems.length}`);
      console.log(`   - רשיונות/טסט (30 יום): ${licenseItems.length}`);

      // מייל נפרד לביטוחים
      if (insuranceItems.length > 0) {
        await sendInsuranceExpiryEmail(insuranceItems);
        console.log(`📧 מייל ביטוחים נשלח (${insuranceItems.length} כלים)`);
      }

      // מייל נפרד לטסט/רשיון
      if (licenseItems.length > 0) {
        await sendLicenseExpiryEmail(licenseItems);
        console.log(`📧 מייל טסט/רשיון נשלח (${licenseItems.length} כלים)`);
      }

    } catch (error) {
      console.error('❌ שגיאה בשליחת התראות תוקף:', error);
    }
  }

  /**
   * הפעלת ה-Scheduler
   * רץ כל יום בשעה 09:00
   */
  start() {
    // Cron expression: '0 9 * * *' = דקה 0, שעה 9, כל יום
    this.job = cron.schedule('0 9 * * *', () => {
      console.log('⏰ Daily Expiry Reminder Cron job triggered...');
      this.sendDailyReminders();
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });

    console.log('✅ Expiry Reminder Scheduler started - יפעל כל יום בשעה 09:00 בבוקר');

    // אם NODE_ENV=development, אפשר להריץ מייד לבדיקה
    if (process.env.ENABLE_EXPIRY_SCHEDULER_ON_START === 'true') {
      console.log('🔧 Development mode - מריץ בדיקת תוקף מיידית...');
      this.sendDailyReminders();
    }
  }

  /**
   * עצירת ה-Scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('⏹️ Expiry Reminder Scheduler stopped');
    }
  }

  /**
   * הרצה ידנית (לבדיקות)
   */
  async runNow() {
    console.log('🚀 הרצה ידנית של בדיקת תוקף...');
    await this.sendDailyReminders();
  }
}

// יצירת instance יחיד
const expiryReminderScheduler = new ExpiryReminderScheduler();

module.exports = expiryReminderScheduler;
