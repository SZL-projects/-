const mongoose = require('mongoose');

const insuranceClaimSchema = new mongoose.Schema({
  // מספר תביעה פנימי (ייצור אוטומטי)
  claimNumber: {
    type: String,
    unique: true
  },

  // מספר תביעה חיצוני (מחברת הביטוח - לא חובה בפתיחה)
  externalClaimNumber: String,

  // כלי ורוכב
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'כלי הוא שדה חובה']
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },

  // סוג אירוע
  eventType: {
    type: String,
    enum: ['accident', 'theft', 'vandalism', 'natural_disaster', 'other'],
    required: [true, 'סוג האירוע הוא שדה חובה']
  },

  // תאריך אירוע
  eventDate: {
    type: Date,
    required: [true, 'תאריך האירוע הוא שדה חובה']
  },

  // תיאור
  description: {
    type: String,
    required: [true, 'תיאור האירוע הוא שדה חובה']
  },

  // מיקום
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // חברת ביטוח
  insuranceCompany: {
    type: String,
    required: [true, 'חברת ביטוח היא שדה חובה']
  },

  // סוג ביטוח
  insuranceType: {
    type: String,
    enum: ['mandatory', 'comprehensive', 'thirdParty'],
    required: true
  },

  // מספר פוליסה
  policyNumber: String,

  // סטטוס תביעה
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'closed'],
    default: 'draft'
  },

  // סכומים
  claimAmount: Number, // סכום התביעה
  approvedAmount: Number, // סכום שאושר
  paidAmount: Number, // סכום ששולם בפועל

  // קבצים (תמונות נזק, דוחות שמאי, מסמכים)
  documents: [{
    filename: String,
    originalName: String,
    documentType: {
      type: String,
      enum: ['damage_photo', 'police_report', 'appraiser_report', 'invoice', 'correspondence', 'other']
    },
    description: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // שמאי
  appraiser: {
    name: String,
    phone: String,
    email: String,
    appointmentDate: Date,
    reportDate: Date
  },

  // טיפול קשור
  relatedMaintenance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  },

  // תקלה קשורה
  relatedFault: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fault'
  },

  // התכתבויות והערות
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // תאריכים חשובים
  submittedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  closedAt: Date,

  // סיבת דחייה (אם נדחתה)
  rejectionReason: String,

  // מי פתח/טיפל
  openedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// אינדקסים
insuranceClaimSchema.index({ claimNumber: 1 });
insuranceClaimSchema.index({ externalClaimNumber: 1 });
insuranceClaimSchema.index({ vehicle: 1, eventDate: -1 });
insuranceClaimSchema.index({ status: 1 });

// יצירת מספר תביעה אוטומטי
insuranceClaimSchema.pre('save', async function(next) {
  if (this.isNew && !this.claimNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.claimNumber = `IC-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
