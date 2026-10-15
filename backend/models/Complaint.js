const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    required: true,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Academic',
      'Hostel',
      'Transport',
      'Infrastructure',
      'Internet/Wi-Fi',
      'Harassment',
      'Ragging',
      'Safety',
      'Canteen Dish Issue',
      'Other'
    ]
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  priorityScore: {
    type: Number,
    default: 0.0
  },
  sentiment: {
    type: String,
    enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'],
    default: 'NEUTRAL'
  },
  priorityReason: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Campus Premises'
  },
  attachment: {
    type: String,
    default: ''
  },
  assignedOfficer: {
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    notified: { type: Boolean, default: false },
    notifiedAt: { type: Date, default: null }
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'UNDER REVIEW', 'ASSIGNED', 'IN PROGRESS', 'RESOLVED', 'REOPENED', 'ESCALATED'],
    default: 'SUBMITTED'
  },
  slaDeadline: {
    type: Date
  },
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedTo: {
    type: String,
    default: ''
  },
  escalatedAt: {
    type: Date
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  resolutionRemarks: {
    type: String,
    default: ''
  },
  // Canteen Dish Issue specific fields start below
  // Canteen Dish Issue specific fields
  canteenLocation: {
    type: String,
    default: ''
  },
  dishName: {
    type: String,
    default: ''
  },
  issueType: {
    type: String,
    enum: ['QUALITY', 'HYGIENE', 'PRICING', 'AVAILABILITY', 'FOREIGN_OBJECT', 'OTHER', ''],
    default: ''
  },
  mealTime: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner', ''],
    default: ''
  },
  dishPhoto: {
    type: String,
    default: ''
  },

  // ── Novelty 1: Explainable Priority Engine ─────────────────────────────────
  matchedKeywords: {
    type: [String],
    default: []
  },
  confidencePercent: {
    type: Number,
    default: 0
  },

  // ── Novelty 3: Duplicate Clustering ────────────────────────────────────────
  parentComplaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    default: null
  },
  isDuplicate: {
    type: Boolean,
    default: false
  },
  affectedStudentCount: {
    type: Number,
    default: 1
  },

  // ── Novelty 5: Verified Resolution Loop ────────────────────────────────────
  resolvedAt: {
    type: Date,
    default: null
  },
  reopenCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
