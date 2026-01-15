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

    const { db } = initFirebase();
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
          lastReminderSent: new Date(),
          manualReminderSentBy: user.id,
          updatedAt: new Date(),
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
          updatedAt: new Date()
        };

        await checkRef.update(updateData);

        // אם הבקרה הושלמה - עדכון קילומטרז בכלי
        if (req.body.status === 'completed' && req.body.currentKm) {
          const check = doc.data();
          if (check.vehicleId) {
            try {
              await db.collection('vehicles').doc(check.vehicleId).update({
                currentKilometers: parseInt(req.body.currentKm),
                lastKilometerUpdate: new Date(),
                updatedAt: new Date()
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
        monthly_checks: checks
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

            // בדיקה אם כבר קיימת בקרה לחודש זה
            const now = new Date();
            const checkMonth = month || now.getMonth() + 1;
            const checkYear = year || now.getFullYear();
            const monthStart = new Date(checkYear, checkMonth - 1, 1);
            const monthEnd = new Date(checkYear, checkMonth, 0, 23, 59, 59);

            const existingCheckSnapshot = await db.collection('monthly_checks')
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
              createdBy: user.id,
              updatedAt: new Date(),
              updatedBy: user.id
            };

            const docRef = await db.collection('monthly_checks').add(checkData);
            createdChecks.push({ id: docRef.id, ...checkData });
          } catch (error) {
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
          createdAt: new Date(),
          updatedAt: new Date()
        };

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
