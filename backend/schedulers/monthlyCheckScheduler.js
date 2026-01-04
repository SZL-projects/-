const cron = require('node-cron');
const { db } = require('../config/firebase');
const COLLECTIONS = require('../config/collections');

/**
 * Scheduler לפתיחת בקרות חודשיות אוטומטית
 *
 * פועל ב-1 לכל חודש בשעה 00:00
 * עובר על כל הרוכבים הפעילים עם כלי משויך
 * יוצר בקרה חודשית חדשה עם סטטוס 'pending'
 */

class MonthlyCheckScheduler {
  constructor() {
    this.ridersCollection = db.collection(COLLECTIONS.RIDERS);
    this.vehiclesCollection = db.collection(COLLECTIONS.VEHICLES);
    this.monthlyChecksCollection = db.collection(COLLECTIONS.MONTHLY_CHECKS);
    this.job = null;
  }

  /**
   * יצירת בקרה חודשית לרוכב
   */
  async createMonthlyCheckForRider(rider, vehicle, month, year) {
    try {
      // בדיקה אם כבר קיימת בקרה לחודש הזה
      const existing = await this.monthlyChecksCollection
        .where('riderId', '==', rider.id)
        .where('vehicleId', '==', vehicle.id)
        .where('checkDate', '>=', new Date(year, month - 1, 1))
        .where('checkDate', '<=', new Date(year, month, 0))
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log(`בקרה חודשית כבר קיימת עבור ${rider.firstName} ${rider.lastName} לחודש ${month}/${year}`);
        return null;
      }

      // יצירת בקרה חודשית חדשה
      const checkData = {
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.licensePlate || null,
        riderId: rider.id,
        riderName: `${rider.firstName} ${rider.lastName}`,
        checkDate: new Date(year, month - 1, 1), // תחילת החודש
        status: 'pending',
        formData: {},
        items: [],
        passedItems: 0,
        failedItems: 0,
        totalItems: 0,
        notes: 'בקרה חודשית אוטומטית',
        attachments: [],
        completedDate: null,
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
        updatedBy: 'system'
      };

      const docRef = await this.monthlyChecksCollection.add(checkData);
      console.log(`✅ בקרה חודשית נוצרה עבור ${rider.firstName} ${rider.lastName} (${vehicle.licensePlate})`);

      return { id: docRef.id, ...checkData };
    } catch (error) {
      console.error(`שגיאה ביצירת בקרה חודשית עבור ${rider.firstName} ${rider.lastName}:`, error.message);
      return null;
    }
  }

  /**
   * ביצוע פתיחת בקרות חודשיות לכל הרוכבים הפעילים
   */
  async openMonthlyChecks() {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // חודש נוכחי (1-12)
      const year = now.getFullYear();

      console.log(`\n🔄 מתחיל פתיחת בקרות חודשיות לחודש ${month}/${year}...`);

      // 1. קבלת כל הרוכבים הפעילים
      const ridersSnapshot = await this.ridersCollection
        .where('riderStatus', '==', 'active')
        .get();

      if (ridersSnapshot.empty) {
        console.log('⚠️ לא נמצאו רוכבים פעילים');
        return;
      }

      console.log(`📋 נמצאו ${ridersSnapshot.size} רוכבים פעילים`);

      let created = 0;
      let skipped = 0;
      let errors = 0;

      // 2. עבור כל רוכב פעיל
      for (const riderDoc of ridersSnapshot.docs) {
        const rider = { id: riderDoc.id, ...riderDoc.data() };

        // בדיקה אם הרוכב משויך לכלי
        if (rider.assignmentStatus !== 'assigned' || !rider.assignedVehicleId) {
          console.log(`⏭️ רוכב ${rider.firstName} ${rider.lastName} אינו משויך לכלי - מדלג`);
          skipped++;
          continue;
        }

        // 3. קבלת פרטי הכלי המשויך
        try {
          const vehicleDoc = await this.vehiclesCollection.doc(rider.assignedVehicleId).get();

          if (!vehicleDoc.exists) {
            console.log(`⚠️ כלי ${rider.assignedVehicleId} לא נמצא עבור ${rider.firstName} ${rider.lastName}`);
            skipped++;
            continue;
          }

          const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

          // בדיקה שהכלי פעיל
          if (vehicle.vehicleStatus !== 'active') {
            console.log(`⏭️ כלי ${vehicle.licensePlate} אינו פעיל - מדלג`);
            skipped++;
            continue;
          }

          // 4. יצירת בקרה חודשית
          const check = await this.createMonthlyCheckForRider(rider, vehicle, month, year);

          if (check) {
            created++;
          } else {
            skipped++;
          }

        } catch (error) {
          console.error(`❌ שגיאה בטיפול ברוכב ${rider.firstName} ${rider.lastName}:`, error.message);
          errors++;
        }
      }

      console.log(`\n✅ סיכום פתיחת בקרות חודשיות לחודש ${month}/${year}:`);
      console.log(`   - נוצרו: ${created} בקרות`);
      console.log(`   - דולגו: ${skipped} רוכבים`);
      console.log(`   - שגיאות: ${errors}\n`);

    } catch (error) {
      console.error('❌ שגיאה חמורה בפתיחת בקרות חודשיות:', error);
    }
  }

  /**
   * הפעלת ה-Scheduler
   * רץ ב-1 לכל חודש בשעה 00:00
   */
  start() {
    // Cron expression: '0 0 1 * *' = דקה 0, שעה 0, יום 1 בחודש
    this.job = cron.schedule('0 0 1 * *', () => {
      console.log('⏰ Cron job triggered - פותח בקרות חודשיות...');
      this.openMonthlyChecks();
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem" // אזור זמן ישראל
    });

    console.log('✅ Monthly Check Scheduler started - יפעל ב-1 לכל חודש בחצות');

    // אם NODE_ENV=development, אפשר להריץ מייד לבדיקה
    if (process.env.ENABLE_SCHEDULER_ON_START === 'true') {
      console.log('🔧 Development mode - מריץ פתיחת בקרות מיידית...');
      this.openMonthlyChecks();
    }
  }

  /**
   * עצירת ה-Scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('⏹️ Monthly Check Scheduler stopped');
    }
  }

  /**
   * הרצה ידנית (לבדיקות)
   */
  async runNow() {
    console.log('🚀 הרצה ידנית של פתיחת בקרות חודשיות...');
    await this.openMonthlyChecks();
  }
}

// יצירת instance יחיד
const monthlyCheckScheduler = new MonthlyCheckScheduler();

module.exports = monthlyCheckScheduler;
