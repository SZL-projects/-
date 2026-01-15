// Vercel Serverless Function - /api/monthly-checks (all monthly check endpoints)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

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
    console.log('📋 Monthly Checks Request:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.authorization
    });

    const { db, admin } = initFirebase();
    const user = await authenticateToken(req, db);

    // Extract ID from URL
    const checkId = extractIdFromUrl(req.url, 'monthly-checks');
    console.log('📍 Check ID extracted:', checkId);

    // Single check operations (GET/PUT/DELETE /api/monthly-checks/[id])
    if (checkId) {
      // Special endpoint: send-notification
      if (req.url.includes('/send-notification') && req.method === 'POST') {
        checkAuthorization(user, ['super_admin', 'manager']);

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

        // עדכון תאריך שליחת הודעה אחרונה
        await checkRef.update({
          lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
          manualReminderSentBy: user.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: user.id
        });

        return res.json({
          success: true,
          message: 'הודעה נשלחה בהצלחה'
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
        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await checkRef.update(updateData);

        // אם הבקרה הושלמה - עדכון קילומטרז בכלי
        if (req.body.status === 'completed' && req.body.currentKm) {
          const check = doc.data();
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

        const updatedDoc = await checkRef.get();

        return res.status(200).json({
          success: true,
          message: 'בקרה חודשית עודכנה בהצלחה',
          monthlyCheck: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      // DELETE check
      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin', 'manager']);

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

      let query = db.collection('monthly_checks');

      // סינונים
      if (status) {
        query = query.where('status', '==', status);
      }
      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }
      if (riderId) {
        query = query.where('riderId', '==', riderId);
      }

      // סינון לפי תפקיד - רוכב רואה רק את עצמו
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isRider = userRoles.includes('rider');
      const isAdminOrManager = userRoles.some(role =>
        ['super_admin', 'manager', 'secretary'].includes(role)
      );

      if (isRider && !isAdminOrManager && user.riderId) {
        query = query.where('riderId', '==', user.riderId);
      }

      query = query.orderBy('checkDate', 'desc').limit(limitNum);

      const snapshot = await query.get();
      let checks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
        checkAuthorization(user, ['super_admin', 'manager']);

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

            console.log(`🔍 [CREATE CHECKS] Checking for existing check: ${checkMonth}/${checkYear}`);

            // שאילתה פשוטה יותר שלא דורשת אינדקס - רק לפי riderId
            const existingCheckSnapshot = await db.collection('monthly_checks')
              .where('riderId', '==', riderId)
              .get();

            // סינון בצד השרת - בודקים אם יש בקרה לחודש הזה
            const existingCheck = existingCheckSnapshot.docs.find(doc => {
              const data = doc.data();
              const checkDate = data.checkDate?.toDate ? data.checkDate.toDate() : new Date(data.checkDate);
              return data.vehicleId === vehicle.id &&
                     checkDate >= monthStart &&
                     checkDate <= monthEnd;
            });

            if (existingCheck) {
              console.log(`❌ [CREATE CHECKS] Check already exists for rider ${riderId}`);
              errors.push({ riderId, error: 'כבר קיימת בקרה לחודש זה' });
              continue;
            }

            // יצירת בקרה חודשית
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

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: 'שגיאת הרשאה',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאת שרת',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
