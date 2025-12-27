const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');
const bcrypt = require('bcryptjs');

class UserModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.USERS);
  }

  // יצירת משתמש חדש
  async create(userData) {
    try {
      // בדיקה אם המשתמש כבר קיים
      const existingUser = await this.findByUsernameOrEmail(userData.username, userData.email);
      if (existingUser) {
        throw new Error('משתמש עם אימייל או שם משתמש זה כבר קיים');
      }

      // הצפנת סיסמה
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const userDoc = {
        username: userData.username,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'rider',
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || null,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedBy: null,
        region: userData.region || null,
        riderId: userData.riderId || null,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.collection.add(userDoc);
      return { id: docRef.id, ...userDoc, password: undefined };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(userId) {
    try {
      const doc = await this.collection.doc(userId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי שם משתמש
  async findByUsername(username) {
    try {
      const snapshot = await this.collection
        .where('username', '==', username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי שם משתמש או אימייל
  async findByUsernameOrEmail(username, email) {
    try {
      const usernameSnapshot = await this.collection
        .where('username', '==', username)
        .limit(1)
        .get();

      if (!usernameSnapshot.empty) {
        const doc = usernameSnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      const emailSnapshot = await this.collection
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (!emailSnapshot.empty) {
        const doc = emailSnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  // עדכון משתמש
  async update(userId, updateData) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date()
      };

      // הסרת שדות שלא צריך לעדכן
      delete updates.id;
      delete updates.createdAt;

      await this.collection.doc(userId).update(updates);
      return await this.findById(userId);
    } catch (error) {
      throw error;
    }
  }

  // עדכון זמן כניסה אחרון
  async updateLastLogin(userId) {
    try {
      await this.collection.doc(userId).update({
        lastLogin: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  // השוואת סיסמה
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // נעילת משתמש
  async lockUser(userId, reason, lockedByUserId) {
    try {
      await this.collection.doc(userId).update({
        isLocked: true,
        lockReason: reason,
        lockedAt: new Date(),
        lockedBy: lockedByUserId,
        updatedAt: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  // שחרור משתמש
  async unlockUser(userId) {
    try {
      await this.collection.doc(userId).update({
        isLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  // מחיקת משתמש
  async delete(userId) {
    try {
      await this.collection.doc(userId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל המשתמשים (עם pagination)
  async getAll(filters = {}, limit = 50, startAfter = null) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }
      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      // Pagination
      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (startAfter) {
        const lastDoc = await this.collection.doc(startAfter).get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const users = [];

      snapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data(),
          password: undefined // לא להחזיר סיסמה
        });
      });

      return users;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserModel();
