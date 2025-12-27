const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // כותרת ותיאור
  title: {
    type: String,
    required: [true, 'כותרת המשימה היא שדה חובה'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // שיוך (חובה לשייך לרוכב ו/או כלי)
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },

  // סוג משימה
  taskType: {
    type: String,
    enum: ['logistics', 'maintenance', 'equipment', 'insurance', 'administrative', 'other'],
    required: true
  },

  // עדיפות
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // סטטוס
  status: {
    type: String,
    enum: ['new', 'in_progress', 'waiting', 'completed', 'cancelled'],
    default: 'new'
  },

  // תאריך יעד
  dueDate: Date,

  // למי המשימה מוקצית
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // מקור המשימה
  source: {
    type: String,
    enum: ['manual', 'missing_equipment', 'insurance_claim', 'monthly_check', 'fault', 'system'],
    default: 'manual'
  },

  // קישור לישויות קשורות
  relatedFault: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fault'
  },
  relatedMaintenance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  },
  relatedClaim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsuranceClaim'
  },

  // קבצים מצורפים
  attachments: [{
    filename: String,
    originalName: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // הערות והיסטוריה
  notes: String,
  completionNotes: String,
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // מי יצר
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
taskSchema.index({ status: 1, priority: -1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ rider: 1 });
taskSchema.index({ vehicle: 1 });

// ולידציה - לפחות רוכב או כלי
taskSchema.pre('save', function(next) {
  if (!this.rider && !this.vehicle) {
    throw new Error('חובה לשייך משימה לרוכב או לכלי');
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
