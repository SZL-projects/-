const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class MonthlyCheckModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.MONTHLY_CHECKS);
  }

  // יצירת בקרה חודשית חדשה
  async create(checkData, createdByUserId) {
    try {
      const checkDoc = {
        vehicleId: checkData.vehicleId,
        vehiclePlate: checkData.vehiclePlate || null,
        riderId: checkData.riderId,
        riderName: checkData.riderName || null,
        checkDate: checkData.checkDate ? new Date(checkData.checkDate) : new Date(),
        status: checkData.status || 'pending', // pending, in_progress, completed, failed
        formData: checkData.formData || {},
        items: checkData.items || [],
        passedItems: checkData.passedItems || 0,
        failedItems: checkData.failedItems || 0,
        totalItems: checkData.totalItems || 0,
        notes: checkData.notes || '',
        attachments: checkData.attachments || [],
        completedDate: null,
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(checkDoc);
      return { id: docRef.id, ...checkDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(checkId) {
    try {
      const doc = await this.collection.doc(checkId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון בקרה חודשית
  async update(checkId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      };

      // הסרת שדות שלא צריך לעדכן
      delete updates.id;
      delete updates.createdAt;
      delete updates.createdBy;

      // אם הבקרה הושלמה - נוסיף תאריך השלמה
      if (updateData.status === 'completed' && !updateData.completedDate) {
        updates.completedDate = new Date();
      }

      await this.collection.doc(checkId).update(updates);
      return await this.findById(checkId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת בקרה חודשית
  async delete(checkId) {
    try {
      await this.collection.doc(checkId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל הבקרות החודשיות
  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.vehicleId) {
        query = query.where('vehicleId', '==', filters.vehicleId);
      }
      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }

      query = query.orderBy('checkDate', 'desc').limit(limit);

      const snapshot = await query.get();
      const checks = [];

      snapshot.forEach(doc => {
        checks.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return checks;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש בקרות חודשיות
  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allChecks = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allChecks.filter(check => {
        return (
          check.vehiclePlate?.toLowerCase().includes(searchLower) ||
          check.riderName?.toLowerCase().includes(searchLower) ||
          check.notes?.toLowerCase().includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MonthlyCheckModel();
