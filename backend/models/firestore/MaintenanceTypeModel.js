const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

// מיפוי תוויות עבריות לערכים אנגלים (לנרמול רשומות ישנות)
const LABEL_TO_VALUE = {
  'טיפול תקופתי': 'routine',
  'תיקון': 'repair',
  'חירום': 'emergency',
  'ריקול': 'recall',
  'תיקון תאונה': 'accident_repair',
  'אחר': 'other',
};

const isHebrew = (str) => str && /[\u0590-\u05FF]/.test(str);

class MaintenanceTypeModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.MAINTENANCE_TYPES);
  }

  // נרמול value לסוגים ישנים שנשמרו עם ערכים עבריים
  _normalizeType(type) {
    if (isHebrew(type.value) && LABEL_TO_VALUE[type.label]) {
      return { ...type, value: LABEL_TO_VALUE[type.label] };
    }
    return type;
  }

  async getAll() {
    try {
      const snapshot = await this.collection.orderBy('order', 'asc').get();
      const types = [];
      snapshot.forEach(doc => {
        types.push(this._normalizeType({ id: doc.id, ...doc.data() }));
      });
      return types;
    } catch (error) {
      // fallback without ordering if index missing
      const snapshot = await this.collection.get();
      const types = [];
      snapshot.forEach(doc => {
        types.push(this._normalizeType({ id: doc.id, ...doc.data() }));
      });
      return types;
    }
  }

  async create(data, createdByUserId) {
    try {
      const snapshot = await this.collection.get();
      const doc = {
        label: data.label,
        value: data.value || data.label.toLowerCase().replace(/\s+/g, '_'),
        isActive: data.isActive !== false,
        order: snapshot.size,
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
      };
      const docRef = await this.collection.add(doc);
      return { id: docRef.id, ...doc };
    } catch (error) {
      throw error;
    }
  }

  async update(id, data, updatedByUserId) {
    try {
      const updates = {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.order !== undefined && { order: data.order }),
        updatedAt: new Date(),
        updatedBy: updatedByUserId,
      };
      await this.collection.doc(id).update(updates);
      const doc = await this.collection.doc(id).get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  async delete(id) {
    try {
      await this.collection.doc(id).delete();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MaintenanceTypeModel();
