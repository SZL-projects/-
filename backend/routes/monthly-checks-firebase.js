const express = require('express');
const router = express.Router();
const MonthlyCheckModel = require('../models/firestore/MonthlyCheckModel');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');
const { db } = require('../config/firebase');
const COLLECTIONS = require('../config/collections');
const emailService = require('../services/emailService');
const { logAudit } = require('../middleware/auditLogger');

// כל הנתיבים מוגנים - דורשים אימות
router.use(protect);

// @route   GET /api/monthly-checks
// @desc    קבלת רשימת בקרות חודשיות
// @access  Private
router.get('/', checkPermission('monthly_checks', 'view'), async (req, res) => {
  try {
    const { search, status, vehicleId, riderId, limit = 100 } = req.query;

    let checks;
    let filters = {};

    // סינונים
    if (status) {
      filters.status = status;
    }
    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }
    if (riderId) {
      filters.riderId = riderId;
    }

    // אם יש חיפוש
    if (search) {
      checks = await MonthlyCheckModel.search(search, filters, parseInt(limit));
    } else {
      checks = await MonthlyCheckModel.getAll(filters, parseInt(limit));
    }

    res.json({
      success: true,
      count: checks.length,
      monthlyChecks: checks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/monthly-checks/:id
// @desc    קבלת בקרה חודשית לפי ID
// @access  Private
router.get('/:id', checkPermission('monthly_checks', 'view'), async (req, res) => {
  try {
    const check = await MonthlyCheckModel.findById(req.params.id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'בקרה חודשית לא נמצאה'
      });
    }

    res.json({
      success: true,
      monthlyCheck: check
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/monthly-checks
// @desc    יצירת בקרה חודשית חדשה או בקרות מרובות
// @access  Private (למנהלים ומעלה ליצירה מרובה)
router.post('/', checkPermission('monthly_checks', 'edit'), async (req, res) => {
  try {
    // אם מתקבל riderIds - זה יצירה מרובה (רק למנהלים)
    if (req.body.riderIds && Array.isArray(req.body.riderIds)) {
      // בדיקת הרשאות - רק מנהל ומעלה
      if (req.permissionLevel === 'self') {
        return res.status(403).json({
          success: false,
          message: 'אין הרשאה לפתיחת בקרות מרובות'
        });
      }

      const { riderIds, month, year } = req.body;
      const createdChecks = [];
      const errors = [];

      // פתיחת בקרות לכל הרוכבים הנבחרים
      for (const riderId of riderIds) {
        try {
          // מציאת הרוכב
          const riderDoc = await db.collection(COLLECTIONS.RIDERS).doc(riderId).get();
          if (!riderDoc.exists) {
            errors.push({ riderId, error: 'רוכב לא נמצא' });
            continue;
          }
          const rider = { id: riderDoc.id, ...riderDoc.data() };

          // מציאת הכלי המשויך
          const vehiclesSnapshot = await db.collection(COLLECTIONS.VEHICLES)
            .where('assignedTo', '==', riderId)
            .limit(1)
            .get();

          if (vehiclesSnapshot.empty) {
            errors.push({ riderId, error: 'לרוכב אין כלי משויך' });
            continue;
          }

          const vehicleDoc = vehiclesSnapshot.docs[0];
          const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

          // בדיקה אם כבר קיימת בקרה לחודש זה
          const now = new Date();
          const checkMonth = month || now.getMonth() + 1;
          const checkYear = year || now.getFullYear();
          const monthStart = new Date(checkYear, checkMonth - 1, 1);
          const monthEnd = new Date(checkYear, checkMonth, 0, 23, 59, 59);

          const existingCheckSnapshot = await db.collection(COLLECTIONS.MONTHLY_CHECKS)
            .where('riderId', '==', riderId)
            .where('vehicleId', '==', vehicle.id)
            .where('checkDate', '>=', monthStart)
            .where('checkDate', '<=', monthEnd)
            .limit(1)
            .get();

          if (!existingCheckSnapshot.empty) {
            errors.push({ riderId, error: 'כבר קיימת בקרה לחודש זה' });
            continue;
          }

          // יצירת בקרה חודשית
          const checkData = {
            riderId: rider.id,
            riderName: `${rider.firstName} ${rider.lastName}`,
            vehicleId: vehicle.id,
            vehicleLicensePlate: vehicle.licensePlate,
            vehiclePlate: vehicle.licensePlate,
            checkDate: new Date(checkYear, checkMonth - 1, 1),
            status: 'pending',
            checkResults: {},
            createdAt: new Date(),
            createdBy: req.user.id,
            updatedAt: new Date(),
            updatedBy: req.user.id
          };

          const docRef = await db.collection(COLLECTIONS.MONTHLY_CHECKS).add(checkData);
          createdChecks.push({ id: docRef.id, ...checkData });

          // שליחת מייל הודעה לרוכב
          try {
            if (rider.email) {
              await emailService.sendMonthlyCheckReminder(rider, vehicle);
            }
          } catch (emailError) {
            console.error(`שגיאה בשליחת מייל ל-${rider.email}:`, emailError.message);
          }
        } catch (error) {
          errors.push({ riderId, error: error.message });
        }
      }

      for (const created of createdChecks) {
        await logAudit(req, {
          action: 'create',
          entityType: 'monthly_check',
          entityId: created.id,
          entityName: 'בקרה חודשית',
          description: `בקרה חודשית חדשה נוצרה`
        });
      }

      res.status(201).json({
        success: true,
        message: `נוצרו ${createdChecks.length} בקרות חודשיות`,
        checks: createdChecks,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      // יצירה בודדת (רוכב יוצר לעצמו)
      const check = await MonthlyCheckModel.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        monthlyCheck: check
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/monthly-checks/:id
// @desc    עדכון בקרה חודשית
// @access  Private
router.put('/:id', checkPermission('monthly_checks', 'edit'), async (req, res) => {
  try {
    const check = await MonthlyCheckModel.update(req.params.id, req.body, req.user.id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'בקרה חודשית לא נמצאה'
      });
    }

    // אם הבקרה הושלמה (status = completed)
    if (req.body.status === 'completed') {
      // 1. עדכון קילומטרז בכלי
      if (req.body.currentKm && check.vehicleId) {
        try {
          await db.collection(COLLECTIONS.VEHICLES).doc(check.vehicleId).update({
            currentKilometers: parseInt(req.body.currentKm),
            lastKilometerUpdate: new Date(),
            updatedAt: new Date()
          });
          console.log(`✅ קילומטרז עודכן לכלי ${check.vehicleId}: ${req.body.currentKm} ק"מ`);
        } catch (kmError) {
          console.error('❌ שגיאה בעדכון קילומטרז:', kmError.message);
        }
      }

      // 2. בדיקה אם יש תקלות ושליחת מייל למנהל
      const hasDefects = checkForDefects(req.body.checkResults);

      if (hasDefects.found) {
        try {
          // קבלת פרטי הרוכב והכלי לשליחת המייל
          const riderDoc = await db.collection(COLLECTIONS.RIDERS).doc(check.riderId).get();
          const vehicleDoc = await db.collection(COLLECTIONS.VEHICLES).doc(check.vehicleId).get();

          if (riderDoc.exists && vehicleDoc.exists) {
            const rider = { id: riderDoc.id, ...riderDoc.data() };
            const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

            // שליחת מייל למנהל
            await sendDefectAlert(rider, vehicle, hasDefects.defects, req.body);
            console.log(`📧 התראת תקלה נשלחה למנהל`);
          }
        } catch (emailError) {
          console.error('❌ שגיאה בשליחת התראת תקלה:', emailError.message);
        }
      }
    }

    res.json({
      success: true,
      monthlyCheck: check
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * בדיקה אם יש תקלות בבקרה
 */
function checkForDefects(checkResults) {
  if (!checkResults) {
    return { found: false, defects: [] };
  }

  const defects = [];

  // בדיקת שמן
  if (checkResults.oilCheck === 'not_ok' || checkResults.oilCheck === 'low') {
    defects.push({
      field: 'שמן',
      value: checkResults.oilCheck === 'not_ok' ? 'לא תקין' : 'נמוך'
    });
  }

  // בדיקת מים
  if (checkResults.waterCheck === 'not_ok' || checkResults.waterCheck === 'low') {
    defects.push({
      field: 'מים',
      value: checkResults.waterCheck === 'not_ok' ? 'לא תקין' : 'נמוך'
    });
  }

  // בדיקות כלליות
  if (checkResults.brakesCondition === 'poor') {
    defects.push({ field: 'בלמים', value: 'לא תקין' });
  }
  if (checkResults.lightsCondition === 'poor') {
    defects.push({ field: 'פנסים', value: 'לא תקין' });
  }
  if (checkResults.mirrorsCondition === 'poor') {
    defects.push({ field: 'מראות', value: 'לא תקין' });
  }
  if (checkResults.helmetCondition === 'poor') {
    defects.push({ field: 'קסדה', value: 'לא תקינה' });
  }

  // בדיקת ברגי ארגז / שרשרת
  if (checkResults.boxScrewsTightening === 'not_done') {
    defects.push({ field: 'חיזוק ברגי ארגז', value: 'לא בוצע' });
  }
  if (checkResults.boxRailLubrication === 'not_done') {
    defects.push({ field: 'שימון מסילות ארגז', value: 'לא בוצע' });
  }
  if (checkResults.chainLubrication === 'not_done') {
    defects.push({ field: 'שימון שרשרת', value: 'לא בוצע' });
  }

  return {
    found: defects.length > 0,
    defects
  };
}

/**
 * שליחת התראת תקלה למנהל
 */
async function sendDefectAlert(rider, vehicle, defects, checkData) {
  // כתובת מייל של המנהל - כרגע למשתמש "אבי"
  // בעתיד ניתן לשנות למשתנה סביבה או הגדרה במערכת
  const managerEmail = process.env.MANAGER_EMAIL || 'manager@example.com';

  const defectsList = defects.map(d => `<li><strong>${d.field}:</strong> ${d.value}</li>`).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #f44336;
          text-align: center;
        }
        .alert-box {
          background-color: #ffebee;
          border-right: 4px solid #f44336;
          padding: 15px;
          margin: 20px 0;
        }
        .defects-list {
          background-color: #fff3e0;
          border-right: 4px solid #ff9800;
          padding: 15px;
          margin: 20px 0;
        }
        p {
          color: #333;
          line-height: 1.6;
          font-size: 16px;
        }
        ul {
          list-style: none;
          padding-right: 0;
        }
        li {
          padding: 5px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚠️ התראה: תקלות בבקרה חודשית</h1>
        <p>שלום,</p>
        <p>התקבלה בקרה חודשית עם תקלות שדורשות תשומת לב.</p>

        <div class="alert-box">
          <p><strong>פרטי הכלי:</strong></p>
          <p>מספר רישוי: <strong>${vehicle.licensePlate || vehicle.internalNumber}</strong></p>
          <p>יצרן ודגם: <strong>${vehicle.manufacturer} ${vehicle.model}</strong></p>
          <p>רוכב: <strong>${rider.firstName} ${rider.lastName}</strong></p>
          <p>קילומטרז': <strong>${checkData.currentKm?.toLocaleString('he-IL') || '0'} ק"מ</strong></p>
        </div>

        <div class="defects-list">
          <p><strong>תקלות שדווחו:</strong></p>
          <ul>
            ${defectsList}
          </ul>
        </div>

        ${checkData.issues ? `
        <div class="alert-box">
          <p><strong>הערות נוספות מהרוכב:</strong></p>
          <p>${checkData.issues}</p>
        </div>
        ` : ''}

        <p>מומלץ לטפל בתקלות בהקדם האפשרי.</p>

        <div class="footer">
          <p>© ${new Date().getFullYear()} צי לוג ידידים</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await emailService.sendEmail({
    email: managerEmail,
    subject: `⚠️ תקלות בבקרה חודשית - ${vehicle.licensePlate}`,
    html
  });
}

// @route   DELETE /api/monthly-checks/:id
// @desc    מחיקת בקרה חודשית
// @access  Private (מנהל-על בלבד)
router.delete('/:id', checkPermission('monthly_checks', 'edit'), async (req, res) => {
  try {
    await MonthlyCheckModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'בקרה חודשית נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/monthly-checks/:id/send-notification
// @desc    שליחה ידנית של הודעה לרוכב למילוי בקרה חודשית
// @access  Private (מנהל/מנהל-על)
router.post('/:id/send-notification', checkPermission('monthly_checks', 'edit'), async (req, res) => {
  try {
    // 1. קבלת הבקרה החודשית
    const check = await MonthlyCheckModel.findById(req.params.id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'בקרה חודשית לא נמצאה'
      });
    }

    // 2. בדיקה שהבקרה ממתינה (pending)
    if (check.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'לא ניתן לשלוח הודעה - הבקרה כבר בוצעה או בתהליך'
      });
    }

    // 3. קבלת פרטי הרוכב
    const riderDoc = await db.collection(COLLECTIONS.RIDERS).doc(check.riderId).get();

    if (!riderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    const rider = { id: riderDoc.id, ...riderDoc.data() };

    if (!rider.email) {
      return res.status(400).json({
        success: false,
        message: 'לרוכב אין כתובת מייל במערכת'
      });
    }

    // 4. קבלת פרטי הכלי
    const vehicleDoc = await db.collection(COLLECTIONS.VEHICLES).doc(check.vehicleId).get();

    if (!vehicleDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'כלי לא נמצא'
      });
    }

    const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

    // 5. שליחת מייל תזכורת
    await emailService.sendMonthlyCheckReminder(rider, vehicle);

    // 6. עדכון תאריך שליחת הודעה אחרונה
    await db.collection(COLLECTIONS.MONTHLY_CHECKS).doc(req.params.id).update({
      lastReminderSent: new Date(),
      manualReminderSentBy: req.user.id,
      updatedAt: new Date(),
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: `הודעה נשלחה בהצלחה ל-${rider.email}`
    });
  } catch (error) {
    console.error('Error sending manual notification:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליחת הודעה: ' + error.message
    });
  }
});

module.exports = router;
