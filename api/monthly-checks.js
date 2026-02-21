// Vercel Serverless Function - /api/monthly-checks (all monthly check endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const { sendMonthlyCheckReminder, sendCheckIssuesAlert } = require('./_utils/emailService');
const { setCorsHeaders } = require('./_utils/cors');

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    const getRawBody = require('raw-body');
    try {
      const rawBody = await getRawBody(req);
      req.body = JSON.parse(rawBody.toString());
    } catch (e) {
      req.body = {};
    }
  }

  try {
    console.log('📋 Monthly Checks Request [v3 - Debug Send Notification]:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.authorization,
      fullUrl: req.url,
      isSendNotification: req.url.includes('/send-notification')
    });

    const { db, admin } = initFirebase();
    const user = await authenticateToken(req, db);

    // Extract ID from URL
    const checkId = extractIdFromUrl(req.url, 'monthly-checks');
    console.log('📍 Check ID extracted:', checkId, 'from URL:', req.url);

    // Single check operations (GET/PUT/DELETE /api/monthly-checks/[id])
    if (checkId) {
      // Special endpoint: send-notification
      if (req.url.includes('/send-notification') && req.method === 'POST') {
        await checkPermission(user, db, 'monthly_checks', 'edit');

        const checkRef = db.collection('monthly_checks').doc(checkId);
        const checkDoc = await checkRef.get();

        if (!checkDoc.exists) {
          return res.status(404).json({
            success: false,
            message: 'בקרה חודשית לא נמצאה'
          });
        }

        const check = checkDoc.data();

        // בדיקה שהבקרה ממתינה
        if (check.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'לא ניתן לשלוח הודעה - הבקרה כבר בוצעה או בתהליך'
          });
        }

        // קבלת פרטי הרוכב לשליחת המייל
        let riderEmail = null;
        let riderName = check.riderName || 'רוכב';

        if (check.riderId) {
          const riderDoc = await db.collection('riders').doc(check.riderId).get();
          if (riderDoc.exists) {
            const riderData = riderDoc.data();
            riderEmail = riderData.email;
            riderName = `${riderData.firstName || ''} ${riderData.lastName || ''}`.trim() || riderName;
          }
        }

        // שליחת מייל לרוכב
        let emailSent = false;
        let emailError = null;

        // פורמט תאריך הבקרה
        const checkDate = check.checkDate?.toDate ? check.checkDate.toDate() : new Date(check.checkDate);
        const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        const monthName = monthNames[checkDate.getMonth()];
        const year = checkDate.getFullYear();

        console.log('📧 [SEND NOTIFICATION] Attempting to send email:', {
          riderEmail,
          riderName,
          checkId,
          vehiclePlate: check.vehicleLicensePlate || check.vehiclePlate,
          monthName,
          year
        });

        if (riderEmail) {
          try {
            console.log('📧 [SEND NOTIFICATION] Calling sendMonthlyCheckReminder via SMTP...');

            await sendMonthlyCheckReminder({
              to: riderEmail,
              riderName,
              vehiclePlate: check.vehicleLicensePlate || check.vehiclePlate || '',
              monthName,
              year,
              checkId
            });

            emailSent = true;
            console.log(`✅ [SEND NOTIFICATION] Email sent successfully to ${riderName} (${riderEmail})`);
          } catch (err) {
            emailError = err.message;
            console.error('❌ [SEND NOTIFICATION] Error sending email:', {
              error: err.message,
              stack: err.stack,
              riderEmail,
              riderName
            });
            // ממשיכים גם אם המייל נכשל - לפחות נעדכן את הרשומה
          }
        } else {
          console.log(`⚠️ [SEND NOTIFICATION] No email found for rider ${riderName}`);
        }

        // עדכון תאריך שליחת הודעה אחרונה
        await checkRef.update({
          lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
          manualReminderSentBy: user.id,
          emailSent: emailSent,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: user.id
        });

        return res.json({
          success: true,
          message: emailSent
            ? `הודעה נשלחה בהצלחה לרוכב ${riderName}`
            : riderEmail
              ? `שגיאה בשליחת מייל: ${emailError || 'שגיאה לא ידועה'}`
              : 'הרשומה עודכנה אך לא נמצא מייל לרוכב',
          emailSent,
          emailError: emailError || undefined
        });
      }

      const checkRef = db.collection('monthly_checks').doc(checkId);
      const doc = await checkRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'בקרה חודשית לא נמצאה'
        });
      }

      // GET single check
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          monthlyCheck: { id: doc.id, ...doc.data() }
        });
      }

      // PUT - update check
      if (req.method === 'PUT') {
        const check = doc.data();
        const checkResults = req.body.checkResults || {};

        // בדיקה אם יש בעיות בבקרה
        const issues = [];
        if (checkResults.oilCheck === 'low' || checkResults.oilCheck === 'not_ok') {
          issues.push('שמן - נמוך/לא תקין');
        }
        if (checkResults.waterCheck === 'low' || checkResults.waterCheck === 'not_ok') {
          issues.push('מים - נמוך/לא תקין');
        }
        if (checkResults.brakesCondition === 'bad' || checkResults.brakesCondition === 'fair') {
          issues.push(`בלמים - ${checkResults.brakesCondition === 'bad' ? 'לא תקין' : 'בינוני'}`);
        }
        if (checkResults.lightsCondition === 'bad' || checkResults.lightsCondition === 'fair') {
          issues.push(`פנסים - ${checkResults.lightsCondition === 'bad' ? 'לא תקין' : 'בינוני'}`);
        }
        if (checkResults.mirrorsCondition === 'bad') {
          issues.push('מראות - לא תקין');
        }
        if (checkResults.helmetCondition === 'bad') {
          issues.push('קסדה - לא תקין');
        }
        if (req.body.issues && req.body.issues.trim()) {
          issues.push(`הערות: ${req.body.issues}`);
        }

        // קביעת סטטוס - אם יש בעיות, סמן כ-issues
        let finalStatus = req.body.status;
        if (req.body.status === 'completed' && issues.length > 0) {
          finalStatus = 'issues'; // סטטוס חדש לבקרה עם בעיות
        }

        const updateData = {
          ...req.body,
          status: finalStatus,
          hasIssues: issues.length > 0,
          issuesList: issues,
          updatedBy: user.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await checkRef.update(updateData);

        // אם הבקרה הושלמה - עדכון קילומטרז בכלי
        if (req.body.status === 'completed' && req.body.currentKm) {
          if (check.vehicleId) {
            try {
              await db.collection('vehicles').doc(check.vehicleId).update({
                currentKilometers: parseInt(req.body.currentKm),
                lastKilometerUpdate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`✅ קילומטרז עודכן לכלי ${check.vehicleId}: ${req.body.currentKm} ק"מ`);
            } catch (kmError) {
              console.error('❌ שגיאה בעדכון קילומטרז:', kmError.message);
            }
          }
        }

        // אם יש בעיות - שלח התראה למנהלים
        if (issues.length > 0 && req.body.status === 'completed') {
          try {
            // מציאת מנהלים לשליחת התראה
            const managersSnapshot = await db.collection('users')
              .where('roles', 'array-contains', 'manager')
              .get();

            const superAdminsSnapshot = await db.collection('users')
              .where('roles', 'array-contains', 'super_admin')
              .get();

            const managerEmails = new Set();
            managersSnapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.email) managerEmails.add(data.email);
            });
            superAdminsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.email) managerEmails.add(data.email);
            });

            console.log(`📧 שליחת התראות ל-${managerEmails.size} מנהלים על בעיות בבקרה`);

            for (const email of managerEmails) {
              try {
                await sendCheckIssuesAlert({
                  managerEmail: email,
                  riderName: check.riderName || 'לא ידוע',
                  vehiclePlate: check.vehicleLicensePlate || check.vehiclePlate,
                  issues,
                  checkId
                });
                console.log(`✅ התראה נשלחה ל-${email}`);
              } catch (emailErr) {
                console.error(`❌ שגיאה בשליחת התראה ל-${email}:`, emailErr.message);
              }
            }
          } catch (alertError) {
            console.error('❌ שגיאה בשליחת התראות למנהלים:', alertError.message);
          }
        }

        const updatedDoc = await checkRef.get();

        return res.status(200).json({
          success: true,
          message: issues.length > 0
            ? 'בקרה נשמרה עם בעיות - נשלחה התראה למנהלים'
            : 'בקרה חודשית עודכנה בהצלחה',
          monthlyCheck: { id: updatedDoc.id, ...updatedDoc.data() },
          hasIssues: issues.length > 0,
          issues
        });
      }

      // DELETE check
      if (req.method === 'DELETE') {
        await checkPermission(user, db, 'monthly_checks', 'edit');

        await checkRef.delete();

        return res.status(200).json({
          success: true,
          message: 'בקרה חודשית נמחקה בהצלחה'
        });
      }
    }

    // Collection operations (GET/POST /api/monthly-checks)
    // GET - list checks
    if (req.method === 'GET') {
      const { search, status, vehicleId, riderId, limit = 100 } = req.query;
      const limitNum = Math.min(parseInt(limit), 500);

      console.log('📋 [GET CHECKS] Query params:', { search, status, vehicleId, riderId, limit: limitNum });

      let query = db.collection('monthly_checks');

      // סינונים - רק אחד בכל פעם כדי להימנע מבעיות אינדקס
      if (riderId) {
        console.log('📋 [GET CHECKS] Filtering by riderId:', riderId);
        query = query.where('riderId', '==', riderId);
      } else if (vehicleId) {
        console.log('📋 [GET CHECKS] Filtering by vehicleId:', vehicleId);
        query = query.where('vehicleId', '==', vehicleId);
      } else if (status) {
        console.log('📋 [GET CHECKS] Filtering by status:', status);
        query = query.where('status', '==', status);
      }

      // סינון לפי הרשאות - רוכב רואה רק את עצמו
      const permLevel = await checkPermission(user, db, 'monthly_checks', 'view');

      // אם לא הוגדר riderId וההרשאה היא self - סנן לפי riderId שלו
      if (!riderId && permLevel === 'self' && user.riderId) {
        console.log('📋 [GET CHECKS] Rider filtering by own riderId:', user.riderId);
        query = db.collection('monthly_checks').where('riderId', '==', user.riderId);
      }

      query = query.limit(limitNum);

      const snapshot = await query.get();
      console.log('📋 [GET CHECKS] Found', snapshot.docs.length, 'checks');

      let checks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // מיון ב-client side
      checks.sort((a, b) => {
        const dateA = a.checkDate?.seconds ? a.checkDate.seconds : new Date(a.checkDate).getTime() / 1000;
        const dateB = b.checkDate?.seconds ? b.checkDate.seconds : new Date(b.checkDate).getTime() / 1000;
        return dateB - dateA;
      });

      // חיפוש טקסט (client-side filtering)
      if (search) {
        const searchLower = search.toLowerCase();
        checks = checks.filter(check =>
          check.riderName?.toLowerCase().includes(searchLower) ||
          check.vehicleLicensePlate?.toLowerCase().includes(searchLower)
        );
      }

      return res.status(200).json({
        success: true,
        count: checks.length,
        monthlyChecks: checks
      });
    }

    // POST - create check(s)
    if (req.method === 'POST') {
      // אם מתקבל riderIds - זה יצירה מרובה (רק למנהלים)
      if (req.body.riderIds && Array.isArray(req.body.riderIds)) {
        await checkPermission(user, db, 'monthly_checks', 'edit');

        const { riderIds, month, year } = req.body;
        const createdChecks = [];
        const errors = [];

        console.log('📝 [CREATE CHECKS] Starting bulk creation:', {
          riderCount: riderIds.length,
          riderIds,
          month,
          year
        });

        // פתיחת בקרות לכל הרוכבים הנבחרים
        for (const riderId of riderIds) {
          try {
            console.log(`📝 [CREATE CHECKS] Processing rider: ${riderId}`);

            // מציאת הרוכב
            const riderDoc = await db.collection('riders').doc(riderId).get();
            if (!riderDoc.exists) {
              console.log(`❌ [CREATE CHECKS] Rider not found: ${riderId}`);
              errors.push({ riderId, error: 'רוכב לא נמצא' });
              continue;
            }
            const rider = { id: riderDoc.id, ...riderDoc.data() };
            console.log(`✅ [CREATE CHECKS] Rider found: ${rider.firstName} ${rider.lastName}`);

            // מציאת הכלי המשויך
            console.log(`🔍 [CREATE CHECKS] Looking for vehicle assigned to: ${riderId}`);
            const vehiclesSnapshot = await db.collection('vehicles')
              .where('assignedTo', '==', riderId)
              .limit(1)
              .get();

            if (vehiclesSnapshot.empty) {
              console.log(`❌ [CREATE CHECKS] No vehicle assigned to rider: ${riderId}`);
              errors.push({ riderId, error: 'לרוכב אין כלי משויך' });
              continue;
            }

            const vehicleDoc = vehiclesSnapshot.docs[0];
            const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
            console.log(`✅ [CREATE CHECKS] Vehicle found: ${vehicle.licensePlate} (${vehicle.id})`);

            // בדיקה אם כבר קיימת בקרה לחודש זה
            const now = new Date();
            const checkMonth = month || now.getMonth() + 1;
            const checkYear = year || now.getFullYear();
            const monthStart = new Date(checkYear, checkMonth - 1, 1);
            const monthEnd = new Date(checkYear, checkMonth, 0, 23, 59, 59);

            console.log(`📝 [CREATE CHECKS] Creating check for ${checkMonth}/${checkYear}`);

            // יצירת בקרה חודשית - מותר ליצור מספר בקרות לאותו כלי
            // יצירת תאריך באמצעות Firestore Timestamp
            const checkDateObj = new Date(checkYear, checkMonth - 1, 1);
            const checkData = {
              riderId: rider.id,
              riderName: `${rider.firstName} ${rider.lastName}`,
              vehicleId: vehicle.id,
              vehicleLicensePlate: vehicle.licensePlate,
              vehiclePlate: vehicle.licensePlate,
              checkDate: admin.firestore.Timestamp.fromDate(checkDateObj),
              status: 'pending',
              checkResults: {},
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: user.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: user.id
            };

            console.log(`💾 [CREATE CHECKS] Creating check document for ${rider.firstName} ${rider.lastName}`);
            const docRef = await db.collection('monthly_checks').add(checkData);
            console.log(`✅ [CREATE CHECKS] Check created with ID: ${docRef.id}`);

            // להחזיר עם תאריך תקין
            createdChecks.push({
              id: docRef.id,
              ...checkData,
              checkDate: checkDateObj // להחזיר Date רגיל לצד לקוח
            });
          } catch (error) {
            console.error(`❌ [CREATE CHECKS] Error for rider ${riderId}:`, error.message);
            errors.push({ riderId, error: error.message });
          }
        }

        console.log(`📊 [CREATE CHECKS] Summary:`, {
          created: createdChecks.length,
          errors: errors.length,
          errorDetails: errors
        });

        return res.status(201).json({
          success: true,
          message: `נוצרו ${createdChecks.length} בקרות חודשיות`,
          checks: createdChecks,
          errors: errors.length > 0 ? errors : undefined
        });
      } else {
        // יצירה בודדת
        const checkData = {
          ...req.body,
          createdBy: user.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // המרת checkDate ל-Timestamp אם קיים
        if (checkData.checkDate) {
          const dateObj = typeof checkData.checkDate === 'string'
            ? new Date(checkData.checkDate)
            : checkData.checkDate;
          checkData.checkDate = admin.firestore.Timestamp.fromDate(dateObj);
        }

        const checkRef = await db.collection('monthly_checks').add(checkData);
        const checkDoc = await checkRef.get();

        return res.status(201).json({
          success: true,
          message: 'בקרה חודשית נוצרה בהצלחה',
          monthlyCheck: { id: checkRef.id, ...checkDoc.data() }
        });
      }
    }

    console.error('❌ Monthly Checks: Method not allowed:', {
      method: req.method,
      url: req.url,
      checkId
    });

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      details: {
        method: req.method,
        allowedMethods: checkId ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST']
      }
    });

  } catch (error) {
    console.error('❌ Monthly Checks error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
