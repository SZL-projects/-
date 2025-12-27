const mongoose = require('mongoose');

const monthlyCheckSchema = new mongoose.Schema({
  // רוכב וכלי
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    required: [true, 'רוכב הוא שדה חובה']
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'כלי הוא שדה חובה']
  },

  // תקופת הבקרה
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },

  // סטטוס
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue', 'exempted'],
    default: 'pending'
  },

  // קילומטראז'
  currentKilometers: {
    type: Number,
    min: 0
  },

  // בדיקות (משתנות לפי סוג כלי)
  checks: {
    // בדיקות כלליות
    oilLevel: {
      type: String,
      enum: ['ok', 'low', 'needs_replacement', 'not_checked']
    },
    waterLevel: {
      type: String,
      enum: ['ok', 'low', 'not_applicable', 'not_checked']
    },
    tirePressure: {
      type: String,
      enum: ['ok', 'low', 'needs_attention', 'not_checked']
    },
    brakes: {
      type: String,
      enum: ['ok', 'worn', 'needs_replacement', 'not_checked']
    },
    lights: {
      type: String,
      enum: ['ok', 'faulty', 'not_checked']
    },
    chain: {
      type: String,
      enum: ['ok', 'needs_lubrication', 'worn', 'not_applicable', 'not_checked']
    },
    generalCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    }
  },

  // האם תקין לרכיבה
  isOperational: {
    type: Boolean,
    default: true
  },

  // הערות ובעיות
  notes: String,
  issues: [{
    description: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe']
    },
    reportedAt: Date
  }],

  // חתימה
  signature: {
    signatureData: String,
    signedAt: Date
  },

  // תאריך מילוי
  submittedAt: Date,
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // תיקון ידני על ידי מנהל-על (Overrule)
  overruled: {
    isOverruled: {
      type: Boolean,
      default: false
    },
    previousStatus: String,
    overruledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    overruleReason: String,
    overruledAt: Date
  },

  // קישור לתקלה שנפתחה (אם יש)
  relatedFault: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fault'
  },

  // תזכורות שנשלחו
  reminders: [{
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

// אינדקס ייחודי - רוכב+כלי+חודש+שנה
monthlyCheckSchema.index({ rider: 1, vehicle: 1, month: 1, year: 1 }, { unique: true });
monthlyCheckSchema.index({ status: 1, year: -1, month: -1 });

// בדיקת חריגת זמן
monthlyCheckSchema.methods.checkOverdue = function() {
  const now = new Date();
  const checkDate = new Date(this.year, this.month - 1, 1);
  const daysSinceCheck = Math.floor((now - checkDate) / (1000 * 60 * 60 * 24));

  if (daysSinceCheck > 7 && this.status === 'pending') {
    this.status = 'overdue';
  }
};

module.exports = mongoose.model('MonthlyCheck', monthlyCheckSchema);
