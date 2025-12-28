const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class FaultModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.FAULTS);
  }

  // יצירת תקלה חדשה
  async create(faultData, createdByUserId) {
    try {
      const faultDoc = {
        vehicleId: faultData.vehicleId,
        vehiclePlate: faultData.vehiclePlate || null,
        riderId: faultData.riderId || null,
        riderName: faultData.riderName || null,
        description: faultData.description,
        severity: faultData.severity || 'medium', // low, medium, high, critical
        status: faultData.status || 'open', // open, in_progress, resolved
        reportedDate: faultData.reportedDate ? new Date(faultData.reportedDate) : new Date(),
        resolvedDate: faultData.resolvedDate ? new Date(faultData.resolvedDate) : null,
        notes: faultData.notes || '',
        attachments: faultData.attachments || [],
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(faultDoc);
      return { id: docRef.id, ...faultDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(faultId) {
    try {
      const doc = await this.collection.doc(faultId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון תקלה
  async update(faultId, updateData, updatedByUserId) {
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

      // אם התקלה נפתרה - נוסיף תאריך פתרון
      if (updateData.status === 'resolved' && !updateData.resolvedDate) {
        updates.resolvedDate = new Date();
      }

      await this.collection.doc(faultId).update(updates);
      return await this.findById(faultId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת תקלה
  async delete(faultId) {
    try {
      await this.collection.doc(faultId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל התקלות
  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.severity) {
        query = query.where('severity', '==', filters.severity);
      }
      if (filters.vehicleId) {
        query = query.where('vehicleId', '==', filters.vehicleId);
      }
      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }

      query = query.orderBy('reportedDate', 'desc').limit(limit);

      const snapshot = await query.get();
      const faults = [];

      snapshot.forEach(doc => {
        faults.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return faults;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש תקלות
  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allFaults = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allFaults.filter(fault => {
        return (
          fault.description?.toLowerCase().includes(searchLower) ||
          fault.vehiclePlate?.toLowerCase().includes(searchLower) ||
          fault.riderName?.toLowerCase().includes(searchLower) ||
          fault.notes?.toLowerCase().includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new FaultModel();
