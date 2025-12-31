const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'שם משתמש הוא שדה חובה'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'אימייל הוא שדה חובה'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'כתובת אימייל לא תקינה']
  },
  password: {
    type: String,
    required: [true, 'סיסמה היא שדה חובה'],
    minlength: 6,
    select: false
  },
  roles: {
    type: [String],
    enum: ['super_admin', 'manager', 'secretary', 'logistics', 'rider', 'regional_manager'],
    default: ['rider'],
    required: true,
    validate: {
      validator: function(roles) {
        return roles && roles.length > 0;
      },
      message: 'חובה להגדיר לפחות תפקיד אחד'
    }
  },
  firstName: {
    type: String,
    required: [true, 'שם פרטי הוא שדה חובה']
  },
  lastName: {
    type: String,
    required: [true, 'שם משפחה הוא שדה חובה']
  },
  phone: {
    type: String,
    match: [/^05\d{8}$/, 'מספר טלפון לא תקין - חייב להיות 10 ספרות המתחילות ב-05']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockReason: String,
  lockedAt: Date,
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // שיוך למחוז/מרחב (לרוכבים ומנהלים אזוריים)
  region: {
    district: String,  // מחוז
    area: String       // מרחב
  },
  // קישור לרוכב (אם המשתמש הוא רוכב)
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },
  // רשימת כלים שהמשתמש יכול לגשת אליהם
  vehicleAccess: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
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

// הצפנת סיסמה לפני שמירה
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// השוואת סיסמה
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// בדיקה אם למשתמש יש תפקיד מסוים
userSchema.methods.hasRole = function(role) {
  return this.roles && this.roles.includes(role);
};

// בדיקה אם למשתמש יש אחד מהתפקידים
userSchema.methods.hasAnyRole = function(rolesArray) {
  return this.roles && rolesArray.some(role => this.roles.includes(role));
};

module.exports = mongoose.model('User', userSchema);
