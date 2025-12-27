const mongoose = require('mongoose');

const faultSchema = new mongoose.Schema({
  // מספר תקלה (ייצור אוטומטי)
  faultNumber: {
    type: String,
    unique: true
  },

  // רוכב וכלי
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },

  // סוג התקלה
  faultType: {
    type: String,
    enum: ['vehicle', 'equipment'],
    required: [true, 'סוג התקלה הוא שדה חובה']
  },

  // תיאור התקלה
  title: {
    type: String,
    required: [true, 'כותרת התקלה היא שדה חובה'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'תיאור התקלה הוא שדה חובה']
  },

  // חומרת התקלה
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe', 'critical'],
    default: 'moderate'
  },

  // האם כשיר לרכיבה
  isOperational: {
    type: Boolean,
    default: true
  },

  // סטטוס
  status: {
    type: String,
    enum: ['new', 'approved', 'in_treatment', 'closed', 'rejected'],
    default: 'new'
  },

  // תמונות
  photos: [{
    filename: String,
    originalName: String,
    description: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // מיקום התקלה (אם רלוונטי)
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // תאריך דיווח
  reportedAt: {
    type: Date,
    default: Date.now
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // אישור מנהל
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,

  // טיפול שבוצע
  relatedMaintenance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  },

  // סגירה
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  closureNotes: String,

  // הערות והיסטוריה
  notes: String,
  internalNotes: String, // רק למנהלים

  // התראות
  alertsSent: [{
    sentTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: Date,
    method: {
      type: String,
      enum: ['email', 'whatsapp', 'system']
    }
  }],

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
faultSchema.index({ faultNumber: 1 });
faultSchema.index({ status: 1, severity: -1 });
faultSchema.index({ vehicle: 1, status: 1 });
faultSchema.index({ rider: 1 });

// יצירת מספר תקלה אוטומטי
faultSchema.pre('save', async function(next) {
  if (this.isNew && !this.faultNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.faultNumber = `F-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// בדיקה אם תקלה חמורה
faultSchema.methods.isSevere = function() {
  return this.severity === 'critical' || !this.isOperational;
};

module.exports = mongoose.model('Fault', faultSchema);
