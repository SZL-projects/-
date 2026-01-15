const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class RiderModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.RIDERS);
  }

  // יצירת רוכב חדש
  async create(riderData, createdByUserId) {
    try {
      // בדיקה אם תעודת זהות כבר קיימת
      const existing = await this.findByIdNumber(riderData.idNumber);
      if (existing) {
        throw new Error('רוכב עם תעודת זהות זו כבר קיים');
      }

      // ולידציה של ת"ז
      if (!this.validateIdNumber(riderData.idNumber)) {
        throw new Error('תעודת זהות לא תקינה');
      }

      const riderDoc = {
        idNumber: riderData.idNumber,
        firstName: riderData.firstName,
        lastName: riderData.lastName,
        phone: riderData.phone,
        email: riderData.email ? riderData.email.toLowerCase() : null,
        address: riderData.address || {},
        region: riderData.region || {},
        riderStatus: riderData.riderStatus || 'active',
        assignmentStatus: riderData.assignmentStatus || 'unassigned',
        assignedVehicleId: riderData.assignedVehicleId || null,
        drivingLicense: riderData.drivingLicense || {},
        licenseHistory: [],
        trainings: riderData.trainings || [],
        userId: riderData.userId || null,
        personalEquipment: riderData.personalEquipment || [],
        notes: riderData.notes || '',
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(riderDoc);
      return { id: docRef.id, ...riderDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(riderId) {
    try {
      const doc = await this.collection.doc(riderId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי תעודת זהות
  async findByIdNumber(idNumber) {
    try {
      const snapshot = await this.collection
        .where('idNumber', '==', idNumber)
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

  // חיפוש מתקדם
  async search(searchTerm, filters = {}, limit = 50) {
    try {
      let riders = [];

      // חיפוש לפי ת"ז
      if (/^\d/.test(searchTerm)) {
        const idSnapshot = await this.collection
          .where('idNumber', '>=', searchTerm)
          .where('idNumber', '<=', searchTerm + '\uf8ff')
          .limit(limit)
          .get();

        idSnapshot.forEach(doc => {
          riders.push({ id: doc.id, ...doc.data() });
        });
      }

      // חיפוש לפי טלפון
      if (/^05/.test(searchTerm)) {
        const phoneSnapshot = await this.collection
          .where('phone', '>=', searchTerm)
          .where('phone', '<=', searchTerm + '\uf8ff')
          .limit(limit)
          .get();

        phoneSnapshot.forEach(doc => {
          const rider = { id: doc.id, ...doc.data() };
          if (!riders.find(r => r.id === rider.id)) {
            riders.push(rider);
          }
        });
      }

      // אם אין תוצאות, נשתמש ב-getAll עם סינון צד-שרת
      if (riders.length === 0) {
        const allRiders = await this.getAll(filters, limit);
        const lowerSearch = searchTerm.toLowerCase();
        riders = allRiders.filter(r =>
          r.firstName?.toLowerCase().includes(lowerSearch) ||
          r.lastName?.toLowerCase().includes(lowerSearch)
        );
      }

      return riders.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל הרוכבים
  async getAll(filters = {}, limit = 50, startAfter = null) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.riderStatus) {
        query = query.where('riderStatus', '==', filters.riderStatus);
      }
      if (filters.assignmentStatus) {
        query = query.where('assignmentStatus', '==', filters.assignmentStatus);
      }
      if (filters.district) {
        query = query.where('region.district', '==', filters.district);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (startAfter) {
        const lastDoc = await this.collection.doc(startAfter).get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const riders = [];

      snapshot.forEach(doc => {
        riders.push({ id: doc.id, ...doc.data() });
      });

      return riders;
    } catch (error) {
      throw error;
    }
  }

  // עדכון רוכב
  async update(riderId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      };

      delete updates.id;
      delete updates.createdAt;
      delete updates.createdBy;

      await this.collection.doc(riderId).update(updates);
      return await this.findById(riderId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת רוכב
  async delete(riderId) {
    try {
      await this.collection.doc(riderId).delete();
    } catch (error) {
      throw error;
    }
  }

  // ולידציה של ת"ז (פשוטה - רק 9 ספרות)
  validateIdNumber(idNumber) {
    // בודק רק שיש 9 ספרות
    return /^\d{9}$/.test(idNumber);
  }

  // עדכון סטטוס שיוך
  async updateAssignmentStatus(riderId, status, updatedByUserId) {
    try {
      await this.collection.doc(riderId).update({
        assignmentStatus: status,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RiderModel();
