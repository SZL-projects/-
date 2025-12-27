const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  // זיהוי
  licensePlate: {
    type: String,
    required: [true, 'מספר רישוי (ל"ז) הוא שדה חובה'],
    unique: true,
    trim: true,
    uppercase: true
  },
  internalNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  // פרטי כלי
  type: {
    type: String,
    enum: ['scooter', 'motorcycle'],
    required: [true, 'סוג כלי הוא שדה חובה']
  },
  manufacturer: {
    type: String,
    required: [true, 'יצרן הוא שדה חובה']
  },
  model: {
    type: String,
    required: [true, 'דגם הוא שדה חובה']
  },
  year: {
    type: Number,
    required: [true, 'שנת ייצור היא שדה חובה'],
    min: 1990,
    max: new Date().getFullYear() + 1
  },
  color: String,

  // סטטוס
  status: {
    type: String,
    enum: ['active', 'waiting_for_rider', 'faulty', 'unfit', 'stolen_lost', 'decommissioned'],
    default: 'waiting_for_rider',
    required: true
  },

  // קילומטראז'
  currentKilometers: {
    type: Number,
    default: 0,
    min: 0
  },
  kilometersHistory: [{
    kilometers: Number,
    recordedAt: Date,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    source: {
      type: String,
      enum: ['monthly_check', 'maintenance', 'assignment', 'manual']
    },
    notes: String
  }],

  // ביטוחים
  insurance: {
    mandatory: {
      company: String,
      policyNumber: String,
      startDate: Date,
      expiryDate: Date,
      files: [{
        filename: String,
        originalName: String,
        uploadDate: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }]
    },
    comprehensive: {
      company: String,
      policyNumber: String,
      startDate: Date,
      expiryDate: Date,
      files: [{
        filename: String,
        originalName: String,
        uploadDate: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }]
    },
    thirdParty: {
      company: String,
      policyNumber: String,
      startDate: Date,
      expiryDate: Date,
      files: [{
        filename: String,
        originalName: String,
        uploadDate: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }]
    }
  },

  // היסטוריית ביטוחים
  insuranceHistory: [{
    type: {
      type: String,
      enum: ['mandatory', 'comprehensive', 'thirdParty']
    },
    company: String,
    policyNumber: String,
    startDate: Date,
    expiryDate: Date,
    replacedAt: Date,
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // רישיון רכב
  vehicleLicense: {
    expiryDate: Date,
    files: [{
      filename: String,
      originalName: String,
      uploadDate: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },

  // ייפוי כוח
  powerOfAttorney: {
    files: [{
      filename: String,
      originalName: String,
      uploadDate: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },

  // גלריית תמונות
  gallery: [{
    filename: String,
    originalName: String,
    description: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    category: {
      type: String,
      enum: ['baseline', 'damage', 'maintenance', 'accident', 'other']
    }
  }],

  // ציוד נלווה לכלי
  equipmentAttached: [{
    equipmentType: {
      type: String,
      enum: ['chain', 'lock', 'booster', 'toolkit', 'other']
    },
    serialNumber: String,
    description: String,
    status: {
      type: String,
      enum: ['attached', 'missing', 'damaged']
    },
    attachedDate: Date,
    notes: String
  }],

  // הערות
  notes: String,

  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// אינדקסים לחיפוש מהיר
vehicleSchema.index({ licensePlate: 1 });
vehicleSchema.index({ internalNumber: 1 });
vehicleSchema.index({ status: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
