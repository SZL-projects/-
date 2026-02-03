const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class GarageModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.GARAGES);
  }

  // יצירת מוסך חדש
  async create(garageData, createdByUserId) {
    try {
      const garageDoc = {
        name: garageData.name,
        phone: garageData.phone || '',
        phone2: garageData.phone2 || '',
        address: garageData.address || '',
        city: garageData.city || '',
        contactPerson: garageData.contactPerson || '',
        email: garageData.email || '',

        // התמחויות
        specialties: garageData.specialties || [],
        // אפשרויות: tires, brakes, engine, electrical, bodywork, general, emergency

        // שעות פעילות
        workingHours: garageData.workingHours || '',

        // האם פעיל
        isActive: garageData.isActive !== false,

        // דירוג (1-5)
        rating: garageData.rating || 0,

        // הערות
        notes: garageData.notes || '',

        // סטטיסטיקות (יתעדכנו אוטומטית)
        totalMaintenances: 0,
        totalCost: 0,
        averageCost: 0,

        // מטאדאטה
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(garageDoc);
      return { id: docRef.id, ...garageDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(garageId) {
    try {
      const doc = await this.collection.doc(garageId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון מוסך
  async update(garageId, updateData, updatedByUserId) {
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

      await this.collection.doc(garageId).update(updates);
      return await this.findById(garageId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת מוסך (סימון כלא פעיל)
  async delete(garageId, deletedByUserId) {
    try {
      await this.collection.doc(garageId).update({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: deletedByUserId
      });
    } catch (error) {
      throw error;
    }
  }

  // מחיקה מוחלטת
  async hardDelete(garageId) {
    try {
      await this.collection.doc(garageId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל המוסכים
  async getAll(filters = {}) {
    try {
      let query = this.collection;

      // ברירת מחדל - רק פעילים
      if (filters.includeInactive !== true) {
        query = query.where('isActive', '==', true);
      }

      query = query.orderBy('name', 'asc');

      const snapshot = await query.get();
      const garages = [];

      snapshot.forEach(doc => {
        garages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return garages;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש מוסכים
  async search(searchTerm, filters = {}) {
    try {
      const allGarages = await this.getAll(filters);

      const searchLower = searchTerm.toLowerCase();
      const results = allGarages.filter(garage => {
        return (
          garage.name?.toLowerCase().includes(searchLower) ||
          garage.city?.toLowerCase().includes(searchLower) ||
          garage.contactPerson?.toLowerCase().includes(searchLower) ||
          garage.phone?.includes(searchTerm)
        );
      });

      return results;
    } catch (error) {
      throw error;
    }
  }

  // עדכון סטטיסטיקות מוסך (נקרא אחרי הוספת/עדכון טיפול)
  async updateStatistics(garageId) {
    try {
      const maintenanceCollection = db.collection(COLLECTIONS.MAINTENANCE);
      const snapshot = await maintenanceCollection
        .where('garage.id', '==', garageId)
        .get();

      let totalCost = 0;
      let count = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        totalCost += data.costs?.totalCost || 0;
        count++;
      });

      await this.collection.doc(garageId).update({
        totalMaintenances: count,
        totalCost: totalCost,
        averageCost: count > 0 ? Math.round(totalCost / count) : 0,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating garage statistics:', error);
    }
  }

  // קבלת סטטיסטיקות מוסך לפי סוג טיפול
  async getStatisticsByType(garageId) {
    try {
      const maintenanceCollection = db.collection(COLLECTIONS.MAINTENANCE);
      const snapshot = await maintenanceCollection
        .where('garage.id', '==', garageId)
        .get();

      const statsByType = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const type = data.maintenanceType || 'other';

        if (!statsByType[type]) {
          statsByType[type] = {
            count: 0,
            totalCost: 0,
            averageCost: 0
          };
        }

        statsByType[type].count++;
        statsByType[type].totalCost += data.costs?.totalCost || 0;
      });

      // חישוב ממוצעים
      for (const type in statsByType) {
        if (statsByType[type].count > 0) {
          statsByType[type].averageCost = Math.round(
            statsByType[type].totalCost / statsByType[type].count
          );
        }
      }

      return statsByType;
    } catch (error) {
      throw error;
    }
  }

  // השוואת מחירים בין מוסכים לפי סוג טיפול
  async comparePrices(maintenanceType = null) {
    try {
      const maintenanceCollection = db.collection(COLLECTIONS.MAINTENANCE);
      let query = maintenanceCollection;

      if (maintenanceType) {
        query = query.where('maintenanceType', '==', maintenanceType);
      }

      const snapshot = await query.get();
      const garageStats = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const garageId = data.garage?.id;
        const garageName = data.garage?.name;

        if (!garageId || !garageName) return;

        if (!garageStats[garageId]) {
          garageStats[garageId] = {
            garageId,
            garageName,
            count: 0,
            totalCost: 0,
            minCost: Infinity,
            maxCost: 0,
            averageCost: 0
          };
        }

        const cost = data.costs?.totalCost || 0;
        garageStats[garageId].count++;
        garageStats[garageId].totalCost += cost;
        garageStats[garageId].minCost = Math.min(garageStats[garageId].minCost, cost);
        garageStats[garageId].maxCost = Math.max(garageStats[garageId].maxCost, cost);
      });

      // חישוב ממוצעים וסידור לפי מחיר ממוצע
      const results = Object.values(garageStats).map(stat => {
        stat.averageCost = stat.count > 0 ? Math.round(stat.totalCost / stat.count) : 0;
        if (stat.minCost === Infinity) stat.minCost = 0;
        return stat;
      });

      results.sort((a, b) => a.averageCost - b.averageCost);

      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new GarageModel();
