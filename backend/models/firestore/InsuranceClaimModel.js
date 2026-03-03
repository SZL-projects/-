const { db } = require('../../config/firebase');
const COLLECTIONS = require('../../config/collections');

class InsuranceClaimModel {
  constructor() {
    this.collection = db.collection(COLLECTIONS.INSURANCE_CLAIMS);
  }

  // יצירת מספר תביעה אוטומטי
  async generateClaimNumber() {
    const year = new Date().getFullYear();
    const snapshot = await this.collection
      .where('createdAt', '>=', new Date(year, 0, 1))
      .where('createdAt', '<', new Date(year + 1, 0, 1))
      .get();

    const count = snapshot.size + 1;
    return `IC-${year}-${String(count).padStart(5, '0')}`;
  }

  // יצירת תביעת ביטוח חדשה
  async create(claimData, createdByUserId) {
    try {
      const claimNumber = await this.generateClaimNumber();

      const claimDoc = {
        claimNumber,
        externalClaimNumber: claimData.externalClaimNumber || null,

        // כלי ורוכב
        vehicleId: claimData.vehicleId,
        vehiclePlate: claimData.vehiclePlate || null,
        riderId: claimData.riderId || null,
        riderName: claimData.riderName || null,

        // פרטי אירוע
        eventType: claimData.eventType,
        // accident = תאונה
        // theft = גניבה
        // vandalism = ונדליזם
        // natural_disaster = אסון טבע
        // other = אחר

        eventDate: claimData.eventDate ? new Date(claimData.eventDate) : new Date(),
        description: claimData.description,
        location: {
          address: claimData.location?.address || '',
          coordinates: {
            lat: claimData.location?.coordinates?.lat || null,
            lng: claimData.location?.coordinates?.lng || null
          }
        },

        // פרטי ביטוח
        insuranceCompany: claimData.insuranceCompany,
        policyNumber: claimData.policyNumber || '',

        // סטטוס
        status: claimData.status || 'draft',
        // draft = טיוטה
        // submitted = הוגשה
        // under_review = בבדיקה
        // approved = אושרה
        // rejected = נדחתה
        // closed = סגורה

        // סכומים
        claimAmount: claimData.claimAmount || 0,
        approvedAmount: claimData.approvedAmount || 0,
        paidAmount: claimData.paidAmount || 0,

        // מסמכים
        documents: claimData.documents || [],

        // שמאי
        appraiser: {
          name: claimData.appraiser?.name || '',
          phone: claimData.appraiser?.phone || '',
          email: claimData.appraiser?.email || '',
          appointmentDate: claimData.appraiser?.appointmentDate ? new Date(claimData.appraiser.appointmentDate) : null,
          reportDate: claimData.appraiser?.reportDate ? new Date(claimData.appraiser.reportDate) : null
        },

        // קישורים
        relatedMaintenanceId: claimData.relatedMaintenanceId || null,
        relatedFaultId: claimData.relatedFaultId || null,

        // הערות
        notes: claimData.notes || [],

        // תאריכי סטטוס
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        closedAt: null,
        rejectionReason: null,

        // מטאדאטה
        openedBy: createdByUserId,
        closedBy: null,
        createdAt: new Date(),
        createdBy: createdByUserId,
        updatedAt: new Date(),
        updatedBy: createdByUserId
      };

      const docRef = await this.collection.add(claimDoc);
      return { id: docRef.id, ...claimDoc };
    } catch (error) {
      throw error;
    }
  }

  // חיפוש לפי ID
  async findById(claimId) {
    try {
      const doc = await this.collection.doc(claimId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // עדכון תביעה
  async update(claimId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updatedByUserId
      };

      // הסרת שדות שלא צריך לעדכן
      delete updates.id;
      delete updates.claimNumber;
      delete updates.createdAt;
      delete updates.createdBy;

      // מעקב אוטומטי אחרי שינויי סטטוס
      if (updateData.status === 'submitted' && !updateData.submittedAt) {
        updates.submittedAt = new Date();
      }
      if (updateData.status === 'approved' && !updateData.approvedAt) {
        updates.approvedAt = new Date();
      }
      if (updateData.status === 'rejected' && !updateData.rejectedAt) {
        updates.rejectedAt = new Date();
      }
      if (updateData.status === 'closed') {
        updates.closedAt = new Date();
        updates.closedBy = updatedByUserId;
      }

      await this.collection.doc(claimId).update(updates);
      return await this.findById(claimId);
    } catch (error) {
      throw error;
    }
  }

  // מחיקת תביעה
  async delete(claimId) {
    try {
      await this.collection.doc(claimId).delete();
    } catch (error) {
      throw error;
    }
  }

  // קבלת כל התביעות
  async getAll(filters = {}, limit = 100) {
    try {
      let query = this.collection;

      // סינונים
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.eventType) {
        query = query.where('eventType', '==', filters.eventType);
      }
      if (filters.vehicleId) {
        query = query.where('vehicleId', '==', filters.vehicleId);
      }
      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }
      if (filters.insuranceCompany) {
        query = query.where('insuranceCompany', '==', filters.insuranceCompany);
      }
      if (filters.insuranceType) {
        query = query.where('insuranceType', '==', filters.insuranceType);
      }

      query = query.orderBy('eventDate', 'desc').limit(limit);

      const snapshot = await query.get();
      const claims = [];

      snapshot.forEach(doc => {
        claims.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return claims;
    } catch (error) {
      throw error;
    }
  }

  // חיפוש תביעות
  async search(searchTerm, filters = {}, limit = 100) {
    try {
      const allClaims = await this.getAll(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const results = allClaims.filter(claim => {
        return (
          claim.claimNumber?.toLowerCase().includes(searchLower) ||
          claim.externalClaimNumber?.toLowerCase().includes(searchLower) ||
          claim.description?.toLowerCase().includes(searchLower) ||
          claim.vehiclePlate?.toLowerCase().includes(searchLower) ||
          claim.riderName?.toLowerCase().includes(searchLower) ||
          claim.insuranceCompany?.toLowerCase().includes(searchLower) ||
          claim.policyNumber?.toLowerCase().includes(searchLower)
        );
      });

      return results.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // קבלת תביעות לפי כלי
  async getByVehicle(vehicleId, limit = 50) {
    try {
      const snapshot = await this.collection
        .where('vehicleId', '==', vehicleId)
        .orderBy('eventDate', 'desc')
        .limit(limit)
        .get();

      const claims = [];
      snapshot.forEach(doc => {
        claims.push({ id: doc.id, ...doc.data() });
      });

      return claims;
    } catch (error) {
      throw error;
    }
  }

  // קבלת תביעות לפי רוכב
  async getByRider(riderId, limit = 50) {
    try {
      const snapshot = await this.collection
        .where('riderId', '==', riderId)
        .orderBy('eventDate', 'desc')
        .limit(limit)
        .get();

      const claims = [];
      snapshot.forEach(doc => {
        claims.push({ id: doc.id, ...doc.data() });
      });

      return claims;
    } catch (error) {
      throw error;
    }
  }

  // סטטיסטיקות תביעות
  async getStatistics(vehicleId = null) {
    try {
      let query = this.collection;

      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }

      const snapshot = await query.get();

      let totalClaimAmount = 0;
      let totalApprovedAmount = 0;
      let totalPaidAmount = 0;
      let countByStatus = {};
      let countByEventType = {};

      snapshot.forEach(doc => {
        const data = doc.data();

        totalClaimAmount += data.claimAmount || 0;
        totalApprovedAmount += data.approvedAmount || 0;
        totalPaidAmount += data.paidAmount || 0;

        countByStatus[data.status] = (countByStatus[data.status] || 0) + 1;
        countByEventType[data.eventType] = (countByEventType[data.eventType] || 0) + 1;
      });

      return {
        totalCount: snapshot.size,
        totalClaimAmount,
        totalApprovedAmount,
        totalPaidAmount,
        countByStatus,
        countByEventType
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InsuranceClaimModel();
