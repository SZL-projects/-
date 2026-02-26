// Vercel Serverless Function - /api/monthly-checks (all monthly check endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const { sendMonthlyCheckReminder, sendCheckIssuesAlert } = require('./_utils/emailService');
const { setCorsHeaders } = require('./_utils/cors');
const { writeAuditLog } = require('./_utils/auditLog');

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
    const { db, admin } = initFirebase();
    const user = await authenticateToken(req, db);

    // Extract ID from URL
    const checkId = extractIdFromUrl(req.url, 'monthly-checks');

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

        if (riderEmail) {
          try {
            await sendMonthlyCheckReminder({
              to: riderEmail,
              riderName,
              vehiclePlate: check.vehicleLicensePlate || check.vehiclePlate || '',
              monthName,
              year,
              checkId
            });
            emailSent = true;
          } catch (err) {
            emailError = err.message;
            console.error('Error sending monthly check reminder:', err.message);
          }
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
          finalStatus = 'issues';
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
            } catch (kmError) {
              console.error('Error updating vehicle kilometers:', kmError.message);
            }
          }
        }

        // אם יש בעיות - שלח התראה למנהל לפי MANAGER_EMAIL
        if (issues.length > 0 && req.body.status === 'completed') {
          try {
            const managerEmail = process.env.MANAGER_EMAIL;
            if (managerEmail) {
              try {
                await sendCheckIssuesAlert({
                  managerEmail,
                  riderName: check.riderName || 'לא ידוע',
                  vehiclePlate: check.vehicleLicensePlate || check.vehiclePlate,
                  issues,
                  checkId
                });
              } catch (emailErr) {
                console.error('Error sending check issues alert:', emailErr.message);
              }
            }
          } catch (alertError) {
            console.error('Error in check issues alert flow:', alertError.message);
          }
        }

        const updatedDoc = await checkRef.get();

        writeAuditLog(db, user, { action: 'update', entityType: 'monthly_check', entityId: checkId, entityName: 'בקרה חודשית', description: 'בקרה חודשית עודכנה' });
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
        writeAuditLog(db, user, { action: 'delete', entityType: 'monthly_check', entityId: checkId, entityName: 'בקרה חודשית', description: 'בקרה חודשית נמחקה' });

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

      let query = db.collection('monthly_checks');

      // סינונים - רק אחד בכל פעם כדי להימנע מבעיות אינדקס
      if (riderId) {
        query = query.where('riderId', '==', riderId);
      } else if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      } else if (status) {
        query = query.where('status', '==', status);
      }

      // סינון לפי הרשאות - רוכב רואה רק את עצמו
      const permLevel = await checkPermission(user, db, 'monthly_checks', 'view');

      // אם לא הוגדר riderId וההרשאה היא self - סנן לפי riderId שלו
      if (!riderId && permLevel === 'self' && user.riderId) {
        query = db.collection('monthly_checks').where('riderId', '==', user.riderId);
      }

      query = query.limit(limitNum);

      const snapshot = await query.get();

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

        // פתיחת בקרות לכל הרוכבים הנבחרים
        for (const riderId of riderIds) {
          try {
            // מציאת הרוכב
            const riderDoc = await db.collection('riders').doc(riderId).get();
            if (!riderDoc.exists) {
              errors.push({ riderId, error: 'רוכב לא נמצא' });
              continue;
            }
            const rider = { id: riderDoc.id, ...riderDoc.data() };

            // מציאת הכלי המשויך
            const vehiclesSnapshot = await db.collection('vehicles')
              .where('assignedTo', '==', riderId)
              .limit(1)
              .get();

            if (vehiclesSnapshot.empty) {
              errors.push({ riderId, error: 'לרוכב אין כלי משויך' });
              continue;
            }

            const vehicleDoc = vehiclesSnapshot.docs[0];
            const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };

            // קביעת חודש ושנה
            const now = new Date();
            const checkMonth = month || now.getMonth() + 1;
            const checkYear = year || now.getFullYear();

            // יצירת בקרה חודשית
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

            const docRef = await db.collection('monthly_checks').add(checkData);

            createdChecks.push({
              id: docRef.id,
              ...checkData,
              checkDate: checkDateObj
            });
          } catch (error) {
            console.error(`Error creating check for rider ${riderId}:`, error.message);
            errors.push({ riderId, error: error.message });
          }
        }

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
        writeAuditLog(db, user, { action: 'create', entityType: 'monthly_check', entityId: checkRef.id, entityName: 'בקרה חודשית', description: 'בקרה חודשית חדשה נוצרה' });

        return res.status(201).json({
          success: true,
          message: 'בקרה חודשית נוצרה בהצלחה',
          monthlyCheck: { id: checkRef.id, ...checkDoc.data() }
        });
      }
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      details: {
        method: req.method,
        allowedMethods: checkId ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST']
      }
    });

  } catch (error) {
    console.error('Monthly Checks error:', error.message);

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
