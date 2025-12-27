const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  // זיהוי בסיסי
  idNumber: {
    type: String,
    required: [true, 'תעודת זהות היא שדה חובה'],
    unique: true,
    match: [/^\d{9}$/, 'תעודת זהות חייבת להכיל 9 ספרות'],
    validate: {
      validator: function(v) {
        // ולידציה של ספרת ביקורת
        let sum = 0;
        for (let i = 0; i < 9; i++) {
          let num = Number(v[i]) * ((i % 2) + 1);
          sum += num > 9 ? num - 9 : num;
        }
        return sum % 10 === 0;
      },
      message: 'תעודת זהות לא תקינה'
    }
  },
  firstName: {
    type: String,
    required: [true, 'שם פרטי הוא שדה חובה'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'שם משפחה הוא שדה חובה'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'טלפון הוא שדה חובה'],
    match: [/^05\d{8}$/, 'מספר טלפון חייב להיות 10 ספרות המתחילות ב-05']
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'כתובת אימייל לא תקינה']
  },
  address: {
    street: String,
    city: String,
    zipCode: String
  },

  // שיוך גיאוגרפי
  region: {
    district: {
      type: String,
      required: [true, 'מחוז הוא שדה חובה']
    },
    area: {
      type: String,
      required: [true, 'מרחב הוא שדה חובה']
    }
  },

  // סטטוסים (הפרדה מלאה)
  riderStatus: {
    type: String,
    enum: ['active', 'inactive', 'frozen'],
    default: 'active',
    required: true
  },
  assignmentStatus: {
    type: String,
    enum: ['assigned', 'unassigned'],
    default: 'unassigned',
    required: true
  },

  // רישיון נהיגה
  drivingLicense: {
    number: String,
    rank: {
      type: String,
      enum: ['A', 'A1', 'A2', 'B']
    },
    issueDate: Date,
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

  // היסטוריית רישיונות
  licenseHistory: [{
    number: String,
    rank: String,
    issueDate: Date,
    expiryDate: Date,
    replacedAt: Date,
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // הכשרות
  trainings: [{
    courseName: String,
    completionDate: Date,
    certificateNumber: String,
    expiryDate: Date,
    files: [{
      filename: String,
      originalName: String,
      uploadDate: Date
    }]
  }],

  // שיוך למשתמש (User)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ציוד אישי
  personalEquipment: [{
    equipmentType: {
      type: String,
      enum: ['helmet', 'jacket', 'gloves', 'boots', 'pants', 'vest', 'other']
    },
    size: String,
    serialNumber: String,
    status: {
      type: String,
      enum: ['issued', 'returned', 'missing', 'damaged']
    },
    issuedDate: Date,
    returnedDate: Date,
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
riderSchema.index({ idNumber: 1 });
riderSchema.index({ phone: 1 });
riderSchema.index({ firstName: 1, lastName: 1 });
riderSchema.index({ 'region.district': 1, 'region.area': 1 });

module.exports = mongoose.model('Rider', riderSchema);
