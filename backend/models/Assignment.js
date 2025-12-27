const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
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

  // תאריכים וקילומטראז'
  startDate: {
    type: Date,
    required: [true, 'תאריך התחלה הוא שדה חובה'],
    default: Date.now
  },
  startKilometers: {
    type: Number,
    required: [true, 'קילומטראז התחלה הוא שדה חובה'],
    min: 0
  },
  endDate: Date,
  endKilometers: {
    type: Number,
    min: 0
  },

  // סטטוס שיוך
  isActive: {
    type: Boolean,
    default: true
  },

  // ציוד שנמסר
  equipmentIssued: [{
    equipmentType: {
      type: String,
      enum: ['helmet', 'jacket', 'gloves', 'boots', 'pants', 'vest', 'chain', 'lock', 'booster', 'toolkit', 'other']
    },
    description: String,
    serialNumber: String,
    issuedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['issued', 'returned', 'missing', 'damaged'],
      default: 'issued'
    },
    returnedDate: Date,
    condition: String,
    notes: String
  }],

  // תמונות מצב כלי בהתחלה
  startConditionPhotos: [{
    filename: String,
    originalName: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // תמונות מצב כלי בסיום
  endConditionPhotos: [{
    filename: String,
    originalName: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // חתימה על טופס שיוך
  assignmentSignature: {
    signatureData: String, // Base64 של החתימה
    signedAt: Date,
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // חתימה על טופס החזרה
  returnSignature: {
    signatureData: String,
    signedAt: Date,
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // חוסרים בציוד
  missingEquipment: [{
    equipmentType: String,
    description: String,
    reportedDate: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: Date,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    notes: String
  }],

  // הערות
  notes: String,

  // מי יצר/סיים את השיוך
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endedBy: {
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
assignmentSchema.index({ rider: 1, isActive: 1 });
assignmentSchema.index({ vehicle: 1, isActive: 1 });
assignmentSchema.index({ startDate: -1 });

// ולידציה - מניעת שיוך כפול
assignmentSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    // בדיקה אם יש שיוך פעיל אחר לאותו כלי
    const existingAssignment = await this.constructor.findOne({
      vehicle: this.vehicle,
      isActive: true,
      _id: { $ne: this._id }
    });

    if (existingAssignment) {
      throw new Error('הכלי כבר משויך לרוכב אחר. יש לסיים את השיוך הקודם תחילה.');
    }
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
