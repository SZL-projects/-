const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class DonationModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.DONATIONS);
  }

  // יצירת מספר אוטומטי
  async generateDonationNumber(type = 'donation') {
    const year = new Date().getFullYear();
    const prefix = type === 'expense' ? 'E' : 'D';
    const snapshot = await this.collection
      .where('createdAt', '>=', new Date(year, 0, 1))
      .where('createdAt', '<', new Date(year + 1, 0, 1))
      .get();

    const count = snapshot.size + 1;
    return `${prefix}-${year}-${String(count).padStart(5, '0')}`;
  }

  // יצירת רשומה חדשה (תרומה או הוצאה)
  async create(donationData, createdByUserId) {
    try {
      const entryType = donationData.type || 'donation';
      const donationNumber = donationData.donationNumber || await this.generateDonationNumber(entryType);

      const donationDoc = {
        donationNumber,
        type: entryType,
        riderId: donationData.riderId || '',
        riderName: donationData.riderName || null,
        amount: donationData.amount || 0,
        paymentMethod: donationData.paymentMethod || (entryType === 'expense' ? 'other' : 'credit_card'),
        category: donationData.category || '',
        donationDate: donationData.donationDate ? new Date(donationData.donationDate) : new Date(),
        notes: donationData.notes || '',
        documents: donationData.documents || [],
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

  async update(donationId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      };

      delete updates.id;
      delete updates.createdAt;
      delete updates.createdBy;

      if (updates.donationDate) {
        updates.donationDate = new Date(updates.donationDate);
      }

      await this.collection.doc(donationId).update(updates);
      return await this.findById(donationId);
    } catch (error) {
      throw error;
    }
  }

  async delete(donationId) {
    try {
      await this.collection.doc(donationId).delete();
    } catch (error) {
      throw error;
    }
  }

  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
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
        donations.push({ id: doc.id, ...doc.data() });
      });

      return donations;
    } catch (error) {
      throw error;
    }
  }

  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allDonations = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allDonations.filter(donation => {
        return (
          donation.donationNumber?.toLowerCase().includes(searchLower) ||
          donation.riderName?.toLowerCase().includes(searchLower) ||
          donation.notes?.toLowerCase().includes(searchLower) ||
          donation.category?.toLowerCase().includes(searchLower) ||
          String(donation.amount).includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

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

  async getStatistics() {
    try {
      const snapshot = await this.collection.get();

      let totalDonations = 0;
      let totalExpenses = 0;
      let donationsCount = 0;
      let expensesCount = 0;
      let countByPaymentMethod = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'donation';
        if (type === 'expense') {
          totalExpenses += data.amount || 0;
          expensesCount++;
        } else {
          totalDonations += data.amount || 0;
          donationsCount++;
          countByPaymentMethod[data.paymentMethod] = (countByPaymentMethod[data.paymentMethod] || 0) + 1;
        }
      });

      return {
        totalCount: snapshot.size,
        donationsCount,
        expensesCount,
        totalDonations,
        totalExpenses,
        balance: totalDonations - totalExpenses,
        countByPaymentMethod
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DonationModel();
