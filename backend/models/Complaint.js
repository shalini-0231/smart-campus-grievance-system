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
      'OD Form Issue',
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
    email: { type: String, default: '' }
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
  // OD Form specific fields
  eventName: {
    type: String,
    default: ''
  },
  eventDate: {
    type: Date
  },
  facultyInChargeName: {
    type: String,
    default: ''
  },
  mentorName: {
    type: String,
    default: ''
  },
  classCounsellorName: {
    type: String,
    default: ''
  },
  hodName: {
    type: String,
    default: ''
  },
  pendingApprovalFrom: {
    type: String,
    enum: ['MENTOR', 'CLASS_COUNSELLOR', 'HOD', 'ACADEMIC_CELL', 'NONE_APPROVED', ''],
    default: ''
  },
  odFormStatus: {
    type: String,
    enum: ['NOT_SUBMITTED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED_NOT_UPDATED', ''],
    default: ''
  },
  verificationProof: {
    type: String,
    default: ''
  },
  eventReturnStatus: {
    type: String,
    enum: ['NOT_RETURNED', 'RETURNED_PENDING_PRESENTATION', 'PRESENTATION_COMPLETED', ''],
    default: ''
  },
  presentationRemarks: {
    type: String,
    default: ''
  },
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
