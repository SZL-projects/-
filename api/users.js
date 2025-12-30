// Vercel Serverless Function - /api/users (all user management endpoints)
const bcrypt = require('bcryptjs');
const { initFirebase } = require('./_utils/firebase');
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

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    // רק מנהלים יכולים לנהל משתמשים
    checkAuthorization(user, ['super_admin', 'manager']);

    // Extract ID from URL if exists
    const pathMatch = req.url.match(/\/api\/users\/([^?]+)/);
    const userId = pathMatch ? pathMatch[1] : null;

    // Single user operations
    if (userId) {
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
      const { username, email, password, firstName, lastName, phone, role } = req.body;

      // בדיקה אם משתמש קיים
      const usernameCheck = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      const emailCheck = await db.collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (!usernameCheck.empty || !emailCheck.empty) {
        return res.status(400).json({
          success: false,
          message: 'משתמש עם אימייל או שם משתמש זה כבר קיים'
        });
      }

      // הצפנת סיסמה
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: role || 'rider',
        isActive: true,
        isLocked: false,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userRef = await db.collection('users').add(newUser);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      delete userData.password;

      return res.status(201).json({
        success: true,
        message: 'משתמש נוצר בהצלחה',
        user: { id: userRef.id, ...userData }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Users error:', error);

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
