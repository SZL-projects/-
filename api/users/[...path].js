// Vercel Serverless Function - /api/users (all user management endpoints)
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { initFirebase } = require('../_utils/firebase');
const { authenticateToken, checkAuthorization } = require('../_utils/auth');
const { sendLoginCredentials } = require('../_utils/emailService');

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
    console.log('👥 Users Request:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.authorization
    });

    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    // Extract ID and action from URL
    const pathMatch = req.url.match(/\/api\/users\/([^/?]+)(?:\/([^?]+))?/);
    const userId = pathMatch ? pathMatch[1] : null;
    const action = pathMatch ? pathMatch[2] : null;

    console.log('📍 User ID extracted:', userId, 'Action:', action);

    // POST /api/users/:id/send-credentials - Send login credentials to user
    if (userId && action === 'send-credentials' && req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager']);

      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      const userData = doc.data();

      // בדיקה שלמשתמש יש מייל
      if (!userData.email) {
        return res.status(400).json({
          success: false,
          message: 'למשתמש אין כתובת אימייל במערכת'
        });
      }

      // יצירת סיסמה זמנית חדשה
      const temporaryPassword = crypto.randomBytes(4).toString('hex'); // 8 תווים
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

      // עדכון הסיסמה במסד הנתונים
      await userRef.update({
        password: hashedPassword,
        mustChangePassword: true,
        updatedAt: new Date()
      });

      // שליחת המייל
      try {
        await sendLoginCredentials(
          {
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            username: userData.username
          },
          temporaryPassword
        );

        console.log('✅ Login credentials sent to:', userData.email);

        return res.status(200).json({
          success: true,
          message: 'פרטי ההתחברות נשלחו בהצלחה למייל'
        });
      } catch (emailError) {
        console.error('❌ Failed to send credentials email:', emailError);
        return res.status(500).json({
          success: false,
          message: 'שגיאה בשליחת המייל'
        });
      }
    }

    // Single user operations
    if (userId && !action) {
      // בדיקת הרשאות למשתמש בודד
      checkAuthorization(user, ['super_admin', 'manager']);

      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      // GET single user
      if (req.method === 'GET') {
        const userData = doc.data();
        delete userData.password; // לא להחזיר סיסמה

        return res.status(200).json({
          success: true,
          user: { id: doc.id, ...userData }
        });
      }

      // PUT - update user
      if (req.method === 'PUT') {
        const updateData = { ...req.body };

        // אם יש סיסמה חדשה - להצפין
        if (updateData.password) {
          const salt = await bcrypt.genSalt(10);
          updateData.password = await bcrypt.hash(updateData.password, salt);
        } else {
          delete updateData.password; // לא לעדכן סיסמה אם לא נשלחה
        }

        updateData.updatedBy = user.id;
        updateData.updatedAt = new Date();

        await userRef.update(updateData);
        const updatedDoc = await userRef.get();
        const updatedData = updatedDoc.data();
        delete updatedData.password;

        return res.status(200).json({
          success: true,
          message: 'משתמש עודכן בהצלחה',
          user: { id: updatedDoc.id, ...updatedData }
        });
      }

      // DELETE user
      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin']); // רק super_admin יכול למחוק

        await userRef.delete();

        return res.status(200).json({
          success: true,
          message: 'משתמש נמחק בהצלחה'
        });
      }
    }

    // Collection operations
    // GET - list users
    if (req.method === 'GET') {
      // בדיקת הרשאות לצפייה ברשימת משתמשים
      checkAuthorization(user, ['super_admin', 'manager']);

      const { search, role, isActive, page = 1, limit = 50 } = req.query;

      let query = db.collection('users');

      if (role) {
        query = query.where('role', '==', role);
      }
      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive === 'true');
      }

      const snapshot = await query.get();
      let users = snapshot.docs.map(doc => {
        const data = doc.data();
        delete data.password; // לא להחזיר סיסמאות
        return { id: doc.id, ...data };
      });

      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(u =>
          u.username?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower) ||
          u.firstName?.toLowerCase().includes(searchLower) ||
          u.lastName?.toLowerCase().includes(searchLower)
        );
      }

      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        count: users.length,
        totalPages: Math.ceil(users.length / limit),
        currentPage: parseInt(page),
        users: paginatedUsers
      });
    }

    // POST - create user
    if (req.method === 'POST') {
      // בדיקת הרשאות ליצירת משתמש
      checkAuthorization(user, ['super_admin', 'manager']);

      console.log('📝 Creating user - Request body:', {
        username: req.body?.username,
        email: req.body?.email,
        hasPassword: !!req.body?.password,
        role: req.body?.role
      });

      const { username, email, password, firstName, lastName, phone, role } = req.body;

      // Validation
      if (!username || !email || !password) {
        console.error('❌ Missing required fields:', { username: !!username, email: !!email, password: !!password });
        return res.status(400).json({
          success: false,
          message: 'חסרים שדות חובה: שם משתמש, אימייל וסיסמה'
        });
      }

      // בדיקה אם משתמש קיים
      console.log('🔍 Checking if user exists...');
      const usernameCheck = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      const emailCheck = await db.collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      console.log('🔍 Check results:', {
        usernameExists: !usernameCheck.empty,
        emailExists: !emailCheck.empty
      });

      if (!usernameCheck.empty || !emailCheck.empty) {
        console.error('❌ User already exists');
        return res.status(400).json({
          success: false,
          message: 'משתמש עם אימייל או שם משתמש זה כבר קיים'
        });
      }

      // הצפנת סיסמה
      console.log('🔐 Hashing password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log('✅ Password hashed successfully');

      console.log('📦 Creating user object...');
      const newUser = {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || null,
        role: role || 'rider',
        isActive: true,
        isLocked: false,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Saving to Firestore...');
      const userRef = await db.collection('users').add(newUser);
      console.log('✅ User created with ID:', userRef.id);

      const userDoc = await userRef.get();
      const userData = userDoc.data();
      delete userData.password;

      console.log('🎉 User creation successful!');
      return res.status(201).json({
        success: true,
        message: 'משתמש נוצר בהצלחה',
        user: { id: userRef.id, ...userData }
      });
    }

    console.error('❌ Users: Method not allowed:', {
      method: req.method,
      url: req.url,
      userId
    });

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      details: {
        method: req.method,
        allowedMethods: userId ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST']
      }
    });

  } catch (error) {
    console.error('❌ Users error:', {
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
