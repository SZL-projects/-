const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../../backend/config/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'נא למלא את כל השדות' });
    }

    // חיפוש משתמש לפי username או email
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('username', '==', username)
      .get();

    if (snapshot.empty) {
      // נסה לחפש לפי email
      const emailSnapshot = await usersRef
        .where('email', '==', username)
        .get();

      if (emailSnapshot.empty) {
        return res.status(401).json({ success: false, message: 'שם משתמש או סיסמה שגויים' });
      }
    }

    const userDoc = snapshot.empty ? snapshot.docs[0] : snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    // בדיקת חסימה
    if (user.isLocked) {
      return res.status(403).json({ success: false, message: 'המשתמש חסום' });
    }

    // בדיקת סיסמה
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // עדכון ניסיונות כושלים
      await userDoc.ref.update({
        loginAttempts: (user.loginAttempts || 0) + 1,
        lastFailedLogin: new Date().toISOString()
      });

      return res.status(401).json({ success: false, message: 'שם משתמש או סיסמה שגויים' });
    }

    // איפוס ניסיונות והתחברות מוצלחת
    await userDoc.ref.update({
      loginAttempts: 0,
      lastLogin: new Date().toISOString()
    });

    // יצירת JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // הסרת סיסמה מהתגובה
    delete user.password;

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'שגיאת שרת' });
  }
};
