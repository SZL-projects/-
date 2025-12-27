const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class VehicleModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.VEHICLES);
  }

  // יצירת כלי חדש
  async create(vehicleData, createdByUserId) {
    try {
      // בדיקה אם מספר רישוי כבר קיים
      const existing = await this.findByLicensePlate(vehicleData.licensePlate);
      if (existing) {
        throw new Error('כלי עם מספר רישוי זה כבר קיים');
      }

      const vehicleDoc = {
        licensePlate: vehicleData.licensePlate.toUpperCase(),
        internalNumber: vehicleData.internalNumber || null,
        type: vehicleData.type,
        manufacturer: vehicleData.manufacturer,
        model: vehicleData.model,
        year: vehicleData.year,
        color: vehicleData.color || null,
        status: vehicleData.status || 'waiting_for_rider',
        currentKilometers: vehicleData.currentKilometers || 0,
        kilometersHistory: [],
        insurance: vehicleData.insurance || {
          mandatory: {},
          comprehensive: {},
          thirdParty: {}
        },
        insuranceHistory: [],
        vehicleLicense: vehicleData.vehicleLicense || {},
        powerOfAttorney: vehicleData.powerOfAttorney || {},
        gallery: [],
        equipmentAttached: vehicleData.equipmentAttached || [],
        notes: vehicleData.notes || '',
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(vehicleDoc);
      return { id: docRef.id, ...vehicleDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(vehicleId) {
    try {
      const doc = await this.collection.doc(vehicleId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי מספר רישוי
  async findByLicensePlate(licensePlate) {
    try {
      const snapshot = await this.collection
        .where('licensePlate', '==', licensePlate.toUpperCase())
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
      let vehicles = [];
      const upperSearch = searchTerm.toUpperCase();

      // חיפוש לפי מספר רישוי
      const plateSnapshot = await this.collection
        .where('licensePlate', '>=', upperSearch)
        .where('licensePlate', '<=', upperSearch + '\uf8ff')
        .limit(limit)
        .get();

      plateSnapshot.forEach(doc => {
        vehicles.push({ id: doc.id, ...doc.data() });
      });

      // חיפוש לפי מספר פנימי
      if (vehicles.length < limit && searchTerm) {
        const internalSnapshot = await this.collection
          .where('internalNumber', '>=', searchTerm)
          .where('internalNumber', '<=', searchTerm + '\uf8ff')
          .limit(limit - vehicles.length)
          .get();

        internalSnapshot.forEach(doc => {
          const vehicle = { id: doc.id, ...doc.data() };
          if (!vehicles.find(v => v.id === vehicle.id)) {
            vehicles.push(vehicle);
          }
        });
      }

      // אם אין תוצאות, חיפוש לפי יצרן/דגם
      if (vehicles.length === 0) {
        const allVehicles = await this.getAll(filters, limit);
        const lowerSearch = searchTerm.toLowerCase();
        vehicles = allVehicles.filter(v =>
          v.manufacturer?.toLowerCase().includes(lowerSearch) ||
          v.model?.toLowerCase().includes(lowerSearch)
        );
      }

      return vehicles.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל הכלים
  async getAll(filters = {}, limit = 50, startAfter = null) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (startAfter) {
        const lastDoc = await this.collection.doc(startAfter).get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const vehicles = [];

      snapshot.forEach(doc => {
        vehicles.push({ id: doc.id, ...doc.data() });
      });

      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  // עדכון כלי
  async update(vehicleId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      };

      delete updates.id;
      delete updates.createdAt;
      delete updates.createdBy;

      await this.collection.doc(vehicleId).update(updates);
      return await this.findById(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  // עדכון קילומטראז'
  async updateKilometers(vehicleId, kilometers, source, updatedByUserId, notes = '') {
    try {
      const vehicle = await this.findById(vehicleId);
      if (!vehicle) {
        throw new Error('כלי לא נמצא');
      }

      // בדיקת חריגות
      if (kilometers < vehicle.currentKilometers) {
        console.warn(`⚠️ Kilometers decreased for vehicle ${vehicleId}: ${vehicle.currentKilometers} -> ${kilometers}`);
      }

      const kmDiff = kilometers - vehicle.currentKilometers;
      const threshold = parseInt(process.env.KM_ANOMALY_THRESHOLD) || 2000;

      if (kmDiff > threshold) {
        console.warn(`⚠️ Large km jump for vehicle ${vehicleId}: +${kmDiff} km`);
      }

      // עדכון היסטוריה
      const historyEntry = {
        kilometers,
        recordedAt: new Date(),
        recordedBy: updatedByUserId,
        source,
        notes
      };

      await this.collection.doc(vehicleId).update({
        currentKilometers: kilometers,
        kilometersHistory: [...(vehicle.kilometersHistory || []), historyEntry],
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      });

      return await this.findById(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת כלי
  async delete(vehicleId) {
    try {
      await this.collection.doc(vehicleId).delete();
    } catch (error) {
      throw error;
    }
  }

  // עדכון סטטוס
  async updateStatus(vehicleId, status, updatedByUserId) {
    try {
      await this.collection.doc(vehicleId).update({
        status,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      });
    } catch (error) {
      throw error;
    }
  }

  // הוספת תמונה לגלריה
  async addToGallery(vehicleId, imageData) {
    try {
      const vehicle = await this.findById(vehicleId);
      if (!vehicle) {
        throw new Error('כלי לא נמצא');
      }

      const gallery = vehicle.gallery || [];
      gallery.push(imageData);

      await this.collection.doc(vehicleId).update({
        gallery,
        updatedAt: new Date()
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new VehicleModel();
