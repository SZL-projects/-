const cron = require('node-cron');
const { db } = require('../config/firebase');
const COLLECTIONS = require('../config/collections');
const emailService = require('../services/emailService');

/**
 * Scheduler לשליחת תזכורות יומיות לבקרות חודשיות
 *
 * פועל כל יום בשעה 09:00 (שעון ישראל)
 * בודק בקרות חודשיות עם סטטוס 'pending'
 * שולח תזכורת מייל לרוכבים שעדיין לא מילאו את הטופס
 */

class DailyReminderScheduler {
  constructor() {
    this.ridersCollection = db.collection(COLLECTIONS.RIDERS);
    this.vehiclesCollection = db.collection(COLLECTIONS.VEHICLES);
    this.monthlyChecksCollection = db.collection(COLLECTIONS.MONTHLY_CHECKS);
    this.job = null;
  }

  /**
   * שליחת תזכורת לרוכב
   */
  async sendReminderToRider(check, rider, vehicle) {
    try {
      if (!rider.email) {
        console.log(`⚠️ אין כתובת מייל עבור ${rider.firstName} ${rider.lastName}`);
        return false;
      }

      await emailService.sendMonthlyCheckReminder(rider, vehicle);
      console.log(`📧 תזכורת נשלחה ל-${rider.email} (${vehicle.licensePlate})`);

      // עדכון תאריך שליחת התזכורת האחרונה
      await this.monthlyChecksCollection.doc(check.id).update({
        lastReminderSent: new Date(),
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`❌ שגיאה בשליחת תזכורת ל-${rider.email}:`, error.message);
      return false;
    }
  }

  /**
   * ביצוע שליחת תזכורות יומיות
   */
  async sendDailyReminders() {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // תחילת החודש הנוכחי
      const monthStart = new Date(currentYear, currentMonth, 1);
      // סוף החודש הנוכחי
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      console.log(`\n🔔 מתחיל שליחת תזכורות יומיות לבקרות חודשיות...`);
      console.log(`   תאריך: ${now.toLocaleDateString('he-IL')}`);
      console.log(`   חודש: ${currentMonth + 1}/${currentYear}`);

      // 1. שליפת כל הבקרות החודשיות הממתינות לחודש הנוכחי
      const pendingChecksSnapshot = await this.monthlyChecksCollection
        .where('status', '==', 'pending')
        .where('checkDate', '>=', monthStart)
        .where('checkDate', '<=', monthEnd)
        .get();

      if (pendingChecksSnapshot.empty) {
        console.log('✅ אין בקרות ממתינות - כל הרוכבים מילאו את הטופס!');
        return;
      }

      console.log(`📋 נמצאו ${pendingChecksSnapshot.size} בקרות ממתינות`);

      let remindersSent = 0;
      let skipped = 0;
      let errors = 0;

      // 2. עבור כל בקרה ממתינה
      for (const checkDoc of pendingChecksSnapshot.docs) {
        const check = { id: checkDoc.id, ...checkDoc.data() };

        // בדיקה אם כבר נשלחה תזכורת היום (למניעת כפילויות)
        if (check.lastReminderSent) {
          const lastReminderDate = check.lastReminderSent.toDate();
          const isSameDay = lastReminderDate.toDateString() === now.toDateString();

          if (isSameDay) {
            console.log(`⏭️ כבר נשלחה תזכורת היום עבור ${check.riderName} - מדלג`);
            skipped++;
            continue;
          }
        }

        // 3. שליפת פרטי הרוכב
        try {
          const riderDoc = await this.ridersCollection.doc(check.riderId).get();

          if (!riderDoc.exists) {
            console.log(`⚠️ רוכב ${check.riderId} לא נמצא`);
            skipped++;
            continue;
          }

          const rider = { id: riderDoc.id, ...riderDoc.data() };

          // 4. שליפת פרטי הכלי
          const vehicleDoc = await this.vehiclesCollection.doc(check.vehicleId).get();

          if (!vehicleDoc.exists) {
            console.log(`⚠️ כלי ${check.vehicleId} לא נמצא`);
            skipped++;
            continue;
          }

          const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

          // 5. שליחת תזכורת
          const sent = await this.sendReminderToRider(check, rider, vehicle);

          if (sent) {
            remindersSent++;
          } else {
            errors++;
          }

        } catch (error) {
          console.error(`❌ שגיאה בטיפול בבקרה ${check.id}:`, error.message);
          errors++;
        }
      }

      console.log(`\n✅ סיכום תזכורות יומיות:`);
      console.log(`   - תזכורות שנשלחו: ${remindersSent}`);
      console.log(`   - דולגו: ${skipped}`);
      console.log(`   - שגיאות: ${errors}\n`);

    } catch (error) {
      console.error('❌ שגיאה חמורה בשליחת תזכורות יומיות:', error);
    }
  }

  /**
   * הפעלת ה-Scheduler
   * רץ כל יום בשעה 09:00
   */
  start() {
    // Cron expression: '0 9 * * *' = דקה 0, שעה 9, כל יום
    this.job = cron.schedule('0 9 * * *', () => {
      console.log('⏰ Daily Reminder Cron job triggered...');
      this.sendDailyReminders();
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem" // אזור זמן ישראל
    });

    console.log('✅ Daily Reminder Scheduler started - יפעל כל יום בשעה 09:00 בבוקר');

    // אם NODE_ENV=development, אפשר להריץ מייד לבדיקה
    if (process.env.ENABLE_SCHEDULER_ON_START === 'true') {
      console.log('🔧 Development mode - מריץ תזכורות מיידית...');
      this.sendDailyReminders();
    }
  }

  /**
   * עצירת ה-Scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('⏹️ Daily Reminder Scheduler stopped');
    }
  }

  /**
   * הרצה ידנית (לבדיקות)
   */
  async runNow() {
    console.log('🚀 הרצה ידנית של תזכורות יומיות...');
    await this.sendDailyReminders();
  }
}

// יצירת instance יחיד
const dailyReminderScheduler = new DailyReminderScheduler();

module.exports = dailyReminderScheduler;
