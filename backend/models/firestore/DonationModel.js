const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class DonationModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.DONATIONS);
  }

  // יצירת מספר תרומה אוטומטי
  async generateDonationNumber() {
    const year = new Date().getFullYear();
    const snapshot = await this.collection
      .where('createdAt', '>=', new Date(year, 0, 1))
      .where('createdAt', '<', new Date(year + 1, 0, 1))
      .get();

    const count = snapshot.size + 1;
    return `D-${year}-${String(count).padStart(5, '0')}`;
  }

  // יצירת תרומה חדשה
  async create(donationData, createdByUserId) {
    try {
      // שימוש במספר אסמכתא שהוזן, או מספר אוטומטי אם לא הוזן
      const donationNumber = donationData.donationNumber || await this.generateDonationNumber();

      const donationDoc = {
        donationNumber,
        riderId: donationData.riderId,
        riderName: donationData.riderName || null,

        amount: donationData.amount || 0,

        // אמצעי תשלום
        paymentMethod: donationData.paymentMethod || 'credit_card',
        // credit_card = אשראי
        // bit = ביט
        // nedarim_plus = נדרים פלוס
        // other = אחר

        // תאריך תרומה
        donationDate: donationData.donationDate ? new Date(donationData.donationDate) : new Date(),

        // הערות
        notes: donationData.notes || '',

        // קבצים (קבלות, אישורים)
        documents: donationData.documents || [],

        // מטאדאטה
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(donationDoc);
      return { id: docRef.id, ...donationDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(donationId) {
    try {
      const doc = await this.collection.doc(donationId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון תרומה
  async update(donationId, updateData, updatedByUserId) {
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

      // המרת תאריך אם קיים
      if (updates.donationDate) {
        updates.donationDate = new Date(updates.donationDate);
      }

      await this.collection.doc(donationId).update(updates);
      return await this.findById(donationId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת תרומה
  async delete(donationId) {
    try {
      await this.collection.doc(donationId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל התרומות
  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      if (filters.paymentMethod) {
        query = query.where('paymentMethod', '==', filters.paymentMethod);
      }
      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }

      query = query.orderBy('donationDate', 'desc').limit(limit);

      const snapshot = await query.get();
      const donations = [];

      snapshot.forEach(doc => {
        donations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return donations;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש תרומות
  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allDonations = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allDonations.filter(donation => {
        return (
          donation.donationNumber?.toLowerCase().includes(searchLower) ||
          donation.riderName?.toLowerCase().includes(searchLower) ||
          donation.notes?.toLowerCase().includes(searchLower) ||
          String(donation.amount).includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // קבלת תרומות לפי רוכב
  async getByRider(riderId, limit = 50) {
    try {
      const snapshot = await this.collection
        .where('riderId', '==', riderId)
        .orderBy('donationDate', 'desc')
        .limit(limit)
        .get();

      const donations = [];
      snapshot.forEach(doc => {
        donations.push({ id: doc.id, ...doc.data() });
      });

      return donations;
    } catch (error) {
      throw error;
    }
  }

  // סטטיסטיקות תרומות
  async getStatistics() {
    try {
      const snapshot = await this.collection.get();

      let totalAmount = 0;
      let countByPaymentMethod = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        totalAmount += data.amount || 0;

        countByPaymentMethod[data.paymentMethod] = (countByPaymentMethod[data.paymentMethod] || 0) + 1;
      });

      return {
        totalCount: snapshot.size,
        totalAmount,
        countByPaymentMethod
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DonationModel();
