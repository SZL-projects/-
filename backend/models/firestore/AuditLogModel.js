const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class AuditLogModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.AUDIT_LOGS);
  }

  /**
   * רישום פעולה בלוג
   */
  async log({ userId, userName, action, entityType, entityId, entityName, changes, description, metadata }) {
    try {
      const entry = {
        userId: userId || null,
        userName: userName || 'מערכת',
        action,
        entityType,
        entityId: entityId || null,
        entityName: entityName || null,
        changes: changes || null,
        description: description || null,
        metadata: metadata || null,
        timestamp: new Date(),
        createdAt: new Date(),
      };

      const docRef = await this.collection.add(entry);
      return { id: docRef.id, ...entry };
    } catch (error) {
      console.error('AuditLog write error:', error.message);
      return null;
    }
  }

  /**
   * קבלת כל הלוגים עם פילטרים
   */
  async getAll(filters = {}, limit = 50) {
    let query = this.collection.orderBy('timestamp', 'desc');

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }
    if (filters.entityType) {
      query = query.where('entityType', '==', filters.entityType);
    }

    query = query.limit(Math.min(limit, 500));

    const snapshot = await query.get();
    const logs = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      });
    });

    // Client-side filters for fields Firestore can't composite-index easily
    let result = logs;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(log =>
        (log.userName || '').toLowerCase().includes(term) ||
        (log.entityName || '').toLowerCase().includes(term) ||
        (log.description || '').toLowerCase().includes(term)
      );
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter(log => new Date(log.timestamp) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(log => new Date(log.timestamp) <= to);
    }

    return result;
  }

  /**
   * קבלת לוגים לפי ישות
   */
  async getByEntity(entityType, entityId) {
    const snapshot = await this.collection
      .where('entityType', '==', entityType)
      .where('entityId', '==', entityId)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      });
    });

    return logs;
  }

  /**
   * רשימת משתמשים ייחודיים מהלוגים
   */
  async getDistinctUsers() {
    const snapshot = await this.collection
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();

    const usersMap = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.userId && !usersMap[data.userId]) {
        usersMap[data.userId] = {
          id: data.userId,
          name: data.userName || 'לא ידוע',
        };
      }
    });

    return Object.values(usersMap);
  }
}

module.exports = new AuditLogModel();
