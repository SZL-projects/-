const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class MaintenanceModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.MAINTENANCE);
  }

  // יצירת מספר טיפול אוטומטי
  async generateMaintenanceNumber() {
    const year = new Date().getFullYear();
    const snapshot = await this.collection
      .where('createdAt', '>=', new Date(year, 0, 1))
      .where('createdAt', '<', new Date(year + 1, 0, 1))
      .get();

    const count = snapshot.size + 1;
    return `M-${year}-${String(count).padStart(5, '0')}`;
  }

  // יצירת טיפול חדש
  async create(maintenanceData, createdByUserId) {
    try {
      const maintenanceNumber = await this.generateMaintenanceNumber();

      // חישוב עלות כוללת
      const costs = maintenanceData.costs || {};
      const totalCost = (costs.laborCost || 0) + (costs.partsCost || 0) + (costs.otherCosts || 0);

      const maintenanceDoc = {
        maintenanceNumber,
        vehicleId: maintenanceData.vehicleId,
        vehiclePlate: maintenanceData.vehiclePlate || null,
        riderId: maintenanceData.riderId || null,
        riderName: maintenanceData.riderName || null,

        // תאריך וקילומטראז'
        maintenanceDate: maintenanceData.maintenanceDate ? new Date(maintenanceData.maintenanceDate) : new Date(),
        kilometersAtMaintenance: maintenanceData.kilometersAtMaintenance || 0,

        // סוג טיפול
        maintenanceType: maintenanceData.maintenanceType || 'routine',
        // routine = טיפול תקופתי
        // repair = תיקון
        // emergency = חירום
        // recall = ריקול
        // accident_repair = תיקון תאונה
        // other = אחר

        // תיאור
        description: maintenanceData.description || '',

        // מוסך
        garage: {
          name: maintenanceData.garage?.name || '',
          phone: maintenanceData.garage?.phone || '',
          address: maintenanceData.garage?.address || '',
          contactPerson: maintenanceData.garage?.contactPerson || ''
        },

        // קישור לתקלה
        relatedFaultId: maintenanceData.relatedFaultId || null,

        // קישור לתביעת ביטוח
        relatedClaimId: maintenanceData.relatedClaimId || null,

        // עלויות
        costs: {
          laborCost: costs.laborCost || 0,
          partsCost: costs.partsCost || 0,
          otherCosts: costs.otherCosts || 0,
          totalCost: totalCost
        },

        // מי שילם
        paidBy: maintenanceData.paidBy || 'unit',
        // unit = היחידה
        // rider = הרוכב
        // insurance = ביטוח
        // warranty = אחריות
        // shared = משותף
        // other = אחר

        // חלקים שהוחלפו
        replacedParts: maintenanceData.replacedParts || [],

        // סטטוס
        status: maintenanceData.status || 'scheduled',
        // scheduled = מתוכנן
        // in_progress = בביצוע
        // completed = הושלם
        // cancelled = בוטל

        // קבצים (חשבוניות, קבלות)
        documents: maintenanceData.documents || [],

        // הערות
        notes: maintenanceData.notes || '',
        mechanicNotes: maintenanceData.mechanicNotes || '',

        // תאריכי השלמה
        completedAt: null,
        completedBy: null,

        // מטאדאטה
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(maintenanceDoc);
      return { id: docRef.id, ...maintenanceDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(maintenanceId) {
    try {
      const doc = await this.collection.doc(maintenanceId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון טיפול
  async update(maintenanceId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      };

      // הסרת שדות שלא צריך לעדכן
      delete updates.id;
      delete updates.maintenanceNumber;
      delete updates.createdAt;
      delete updates.createdBy;

      // חישוב עלות כוללת מחדש אם יש שינוי בעלויות
      if (updates.costs) {
        updates.costs.totalCost =
          (updates.costs.laborCost || 0) +
          (updates.costs.partsCost || 0) +
          (updates.costs.otherCosts || 0);
      }

      // אם הטיפול הושלם - נוסיף תאריך השלמה
      if (updateData.status === 'completed' && !updateData.completedAt) {
        updates.completedAt = new Date();
        updates.completedBy = updatedByUserId;
      }

      await this.collection.doc(maintenanceId).update(updates);
      return await this.findById(maintenanceId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת טיפול
  async delete(maintenanceId) {
    try {
      await this.collection.doc(maintenanceId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל הטיפולים
  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.maintenanceType) {
        query = query.where('maintenanceType', '==', filters.maintenanceType);
      }
      if (filters.vehicleId) {
        query = query.where('vehicleId', '==', filters.vehicleId);
      }
      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }
      if (filters.paidBy) {
        query = query.where('paidBy', '==', filters.paidBy);
      }

      query = query.orderBy('maintenanceDate', 'desc').limit(limit);

      const snapshot = await query.get();
      const maintenances = [];

      snapshot.forEach(doc => {
        maintenances.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return maintenances;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש טיפולים
  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allMaintenances = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allMaintenances.filter(maintenance => {
        return (
          maintenance.maintenanceNumber?.toLowerCase().includes(searchLower) ||
          maintenance.description?.toLowerCase().includes(searchLower) ||
          maintenance.vehiclePlate?.toLowerCase().includes(searchLower) ||
          maintenance.riderName?.toLowerCase().includes(searchLower) ||
          maintenance.garage?.name?.toLowerCase().includes(searchLower) ||
          maintenance.notes?.toLowerCase().includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // קבלת טיפולים לפי כלי
  async getByVehicle(vehicleId, limit = 50) {
    try {
      const snapshot = await this.collection
        .where('vehicleId', '==', vehicleId)
        .orderBy('maintenanceDate', 'desc')
        .limit(limit)
        .get();

      const maintenances = [];
      snapshot.forEach(doc => {
        maintenances.push({ id: doc.id, ...doc.data() });
      });

      return maintenances;
    } catch (error) {
      throw error;
    }
  }

  // קבלת טיפולים לפי רוכב
  async getByRider(riderId, limit = 50) {
    try {
      const snapshot = await this.collection
        .where('riderId', '==', riderId)
        .orderBy('maintenanceDate', 'desc')
        .limit(limit)
        .get();

      const maintenances = [];
      snapshot.forEach(doc => {
        maintenances.push({ id: doc.id, ...doc.data() });
      });

      return maintenances;
    } catch (error) {
      throw error;
    }
  }

  // קבלת טיפולים לפי תקלה
  async getByFault(faultId) {
    try {
      const snapshot = await this.collection
        .where('relatedFaultId', '==', faultId)
        .get();

      const maintenances = [];
      snapshot.forEach(doc => {
        maintenances.push({ id: doc.id, ...doc.data() });
      });

      return maintenances;
    } catch (error) {
      throw error;
    }
  }

  // סטטיסטיקות טיפולים
  async getStatistics(vehicleId = null) {
    try {
      let query = this.collection;

      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }

      const snapshot = await query.get();

      let totalCost = 0;
      let countByType = {};
      let countByStatus = {};

      snapshot.forEach(doc => {
        const data = doc.data();

        // סיכום עלויות
        totalCost += data.costs?.totalCost || 0;

        // ספירה לפי סוג
        countByType[data.maintenanceType] = (countByType[data.maintenanceType] || 0) + 1;

        // ספירה לפי סטטוס
        countByStatus[data.status] = (countByStatus[data.status] || 0) + 1;
      });

      return {
        totalCount: snapshot.size,
        totalCost,
        countByType,
        countByStatus
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MaintenanceModel();
