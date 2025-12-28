const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class TaskModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.TASKS);
  }

  // יצירת משימה חדשה
  async create(taskData, createdByUserId) {
    try {
      const taskDoc = {
        title: taskData.title,
        description: taskData.description || '',
        riderId: taskData.riderId || null,
        riderName: taskData.riderName || null,
        vehicleId: taskData.vehicleId || null,
        vehiclePlate: taskData.vehiclePlate || null,
        priority: taskData.priority || 'medium', // low, medium, high
        status: taskData.status || 'pending', // pending, in_progress, completed, cancelled
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        completedDate: null,
        assignedTo: taskData.assignedTo || null,
        notes: taskData.notes || '',
        attachments: taskData.attachments || [],
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(taskDoc);
      return { id: docRef.id, ...taskDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(taskId) {
    try {
      const doc = await this.collection.doc(taskId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון משימה
  async update(taskId, updateData, updatedByUserId) {
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

      // אם המשימה הושלמה - נוסיף תאריך השלמה
      if (updateData.status === 'completed' && !updateData.completedDate) {
        updates.completedDate = new Date();
      }

      await this.collection.doc(taskId).update(updates);
      return await this.findById(taskId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת משימה
  async delete(taskId) {
    try {
      await this.collection.doc(taskId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל המשימות
  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.priority) {
        query = query.where('priority', '==', filters.priority);
      }
      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }
      if (filters.vehicleId) {
        query = query.where('vehicleId', '==', filters.vehicleId);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      const snapshot = await query.get();
      const tasks = [];

      snapshot.forEach(doc => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש משימות
  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allTasks = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allTasks.filter(task => {
        return (
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.riderName?.toLowerCase().includes(searchLower) ||
          task.vehiclePlate?.toLowerCase().includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TaskModel();
