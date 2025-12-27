const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  // מספר טיפול (ייצור אוטומטי)
  maintenanceNumber: {
    type: String,
    unique: true
  },

  // כלי
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'כלי הוא שדה חובה']
  },

  // רוכב (בזמן הטיפול)
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },

  // תאריך וקילומטראז'
  maintenanceDate: {
    type: Date,
    required: [true, 'תאריך הטיפול הוא שדה חובה']
  },
  kilometersAtMaintenance: {
    type: Number,
    required: [true, 'קילומטראז בזמן הטיפול הוא שדה חובה'],
    min: 0
  },

  // סוג טיפול
  maintenanceType: {
    type: String,
    enum: ['routine', 'repair', 'emergency', 'recall', 'accident_repair', 'other'],
    required: true
  },

  // תיאור
  description: {
    type: String,
    required: [true, 'תיאור הטיפול הוא שדה חובה']
  },

  // מוסך
  garage: {
    name: String,
    phone: String,
    address: String,
    contactPerson: String
  },

  // תקלה קשורה
  relatedFault: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fault'
  },

  // תביעת ביטוח קשורה (אופציונלי)
  relatedClaim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsuranceClaim'
  },

  // עלויות
  costs: {
    laborCost: {
      type: Number,
      default: 0
    },
    partsCost: {
      type: Number,
      default: 0
    },
    otherCosts: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      required: [true, 'עלות כוללת היא שדה חובה בסגירה']
    }
  },

  // מי שילם
  paidBy: {
    type: String,
    enum: ['unit', 'rider', 'insurance', 'warranty', 'other']
  },

  // חלקים שהוחלפו
  replacedParts: [{
    partName: String,
    partNumber: String,
    quantity: Number,
    cost: Number
  }],

  // סטטוס
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },

  // קבצים (חשבוניות, דוחות)
  documents: [{
    filename: String,
    originalName: String,
    documentType: {
      type: String,
      enum: ['invoice', 'report', 'warranty', 'other']
    },
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // הערות
  notes: String,
  mechanicNotes: String,

  // תאריכי השלמה
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // מי פתח/יצר
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
maintenanceSchema.index({ maintenanceNumber: 1 });
maintenanceSchema.index({ vehicle: 1, maintenanceDate: -1 });
maintenanceSchema.index({ status: 1 });

// יצירת מספר טיפול אוטומטי
maintenanceSchema.pre('save', async function(next) {
  if (this.isNew && !this.maintenanceNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.maintenanceNumber = `M-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// חישוב עלות כוללת אוטומטית
maintenanceSchema.pre('save', function(next) {
  if (this.costs) {
    this.costs.totalCost =
      (this.costs.laborCost || 0) +
      (this.costs.partsCost || 0) +
      (this.costs.otherCosts || 0);
  }
  next();
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
