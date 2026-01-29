const cron = require('node-cron');
const Vehicle = require('../models/Vehicle');
const emailService = require('../services/emailService');

/**
 * Scheduler לשליחת התראות שבועיות על תוקף ביטוח ורשיון רכב
 *
 * פועל כל יום ראשון בשעה 09:00 (שעון ישראל)
 * בודק:
 * - ביטוחים (חובה/מקיף) שפוקעים תוך 14 יום
 * - רשיונות רכב שפוקעים תוך 30 יום
 * שולח מייל מרוכז למייל המערכת
 */

class ExpiryReminderScheduler {
  constructor() {
    this.job = null;
  }

  /**
   * איסוף כל הפריטים שעומדים לפוג
   */
  async collectExpiringItems() {
    const now = new Date();
    const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const expiringItems = [];

    try {
      // שליפת כל הכלים הפעילים
      const vehicles = await Vehicle.find({
        status: { $in: ['active', 'waiting_for_rider'] }
      }).lean();

      for (const vehicle of vehicles) {
        // בדיקת ביטוח חובה
        if (vehicle.insurance?.mandatory?.expiryDate) {
          const expiryDate = new Date(vehicle.insurance.mandatory.expiryDate);
          if (expiryDate >= now && expiryDate <= fourteenDaysFromNow) {
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            expiringItems.push({
              type: 'insurance',
              insuranceType: 'mandatory',
              licensePlate: vehicle.licensePlate,
              vehicleId: vehicle._id,
              expiryDate: expiryDate,
              daysLeft: daysLeft
            });
          }
        }

        // בדיקת ביטוח מקיף
        if (vehicle.insurance?.comprehensive?.expiryDate) {
          const expiryDate = new Date(vehicle.insurance.comprehensive.expiryDate);
          if (expiryDate >= now && expiryDate <= fourteenDaysFromNow) {
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            expiringItems.push({
              type: 'insurance',
              insuranceType: 'comprehensive',
              licensePlate: vehicle.licensePlate,
              vehicleId: vehicle._id,
              expiryDate: expiryDate,
              daysLeft: daysLeft
            });
          }
        }

        // בדיקת רשיון רכב
        if (vehicle.vehicleLicense?.expiryDate) {
          const expiryDate = new Date(vehicle.vehicleLicense.expiryDate);
          if (expiryDate >= now && expiryDate <= thirtyDaysFromNow) {
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            expiringItems.push({
              type: 'license',
              licensePlate: vehicle.licensePlate,
              vehicleId: vehicle._id,
              expiryDate: expiryDate,
              daysLeft: daysLeft
            });
          }
        }
      }

      // מיון לפי ימים שנותרו (הדחוף ביותר קודם)
      expiringItems.sort((a, b) => a.daysLeft - b.daysLeft);

      return expiringItems;
    } catch (error) {
      console.error('Error collecting expiring items:', error);
      return [];
    }
  }

  /**
   * ביצוע שליחת התראות שבועיות
   */
  async sendWeeklyReminders() {
    try {
      const now = new Date();
      console.log(`\n📅 מתחיל בדיקת תוקף שבועית...`);
      console.log(`   תאריך: ${now.toLocaleDateString('he-IL')}`);

      const expiringItems = await this.collectExpiringItems();

      if (expiringItems.length === 0) {
        console.log('✅ אין ביטוחים או רשיונות שעומדים לפוג בקרוב');
        return;
      }

      const insuranceCount = expiringItems.filter(i => i.type === 'insurance').length;
      const licenseCount = expiringItems.filter(i => i.type === 'license').length;

      console.log(`⚠️ נמצאו ${expiringItems.length} פריטים שעומדים לפוג:`);
      console.log(`   - ביטוחים: ${insuranceCount}`);
      console.log(`   - רשיונות רכב: ${licenseCount}`);

      // שליחת מייל
      await emailService.sendExpiryReminderEmail(expiringItems);
      console.log(`📧 מייל התראה נשלח בהצלחה למייל המערכת`);

    } catch (error) {
      console.error('❌ שגיאה בשליחת התראות תוקף:', error);
    }
  }

  /**
   * הפעלת ה-Scheduler
   * רץ כל יום ראשון בשעה 09:00
   */
  start() {
    // Cron expression: '0 9 * * 0' = דקה 0, שעה 9, כל יום ראשון
    this.job = cron.schedule('0 9 * * 0', () => {
      console.log('⏰ Weekly Expiry Reminder Cron job triggered...');
      this.sendWeeklyReminders();
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });

    console.log('✅ Expiry Reminder Scheduler started - יפעל כל יום ראשון בשעה 09:00 בבוקר');

    // אם NODE_ENV=development, אפשר להריץ מייד לבדיקה
    if (process.env.ENABLE_EXPIRY_SCHEDULER_ON_START === 'true') {
      console.log('🔧 Development mode - מריץ בדיקת תוקף מיידית...');
      this.sendWeeklyReminders();
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
    await this.sendWeeklyReminders();
  }
}

// יצירת instance יחיד
const expiryReminderScheduler = new ExpiryReminderScheduler();

module.exports = expiryReminderScheduler;
