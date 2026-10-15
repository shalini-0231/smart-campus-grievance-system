/**
 * seedExamples.js
 * Inserts a demo complaint:
 *  1. Canteen Dish Issue — Hygiene complaint with inspector data
 * 
 * Usage: node scripts/seedExamples.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scgrs';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  // Find a student user to attach complaints to
  let student = await User.findOne({ role: 'student' });
  if (!student) {
    console.error('No student user found. Please seed users first (node scripts/seedData.js)');
    process.exit(1);
  }
  console.log('Using student: ' + student.name + ' (' + student.email + ')');

  // Clean up any old demo complaints with same IDs
  await Complaint.deleteMany({ complaintId: { $in: ['DEMO-CAN-2026-001'] } });
  console.log('Removed old demo complaints (if any)');

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLAINT 1: Canteen Dish Issue — Hygiene violation with foreign object
  // ─────────────────────────────────────────────────────────────────────────────
  const canteenComplaint = await Complaint.create({
    complaintId:        'DEMO-CAN-2026-001',
    studentId:          student._id,
    title:              'Foreign Object Found in Dal Rice — Main Canteen Lunch (Hygiene Violation)',
    description:
      'During lunch (approx 12:45 PM), I found a small plastic fragment (approx 1cm) ' +
      'embedded inside the Dal Rice served at the Main Campus Canteen Counter 2. ' +
      'This is a serious food safety and hygiene violation. The dish appeared undercooked and had an ' +
      'unusual smell. I immediately notified the canteen staff (Mr. Murugesan) but no action was taken. ' +
      'I have preserved the dish sample and have attached a photo as proof. ' +
      'I request immediate inspection of kitchen facilities and supplier audit.',
    category:           'Canteen Dish Issue',
    priority:           'CRITICAL',
    priorityScore:      0.91,
    sentiment:          'NEGATIVE',
    priorityReason:     'CRITICAL: Foreign object detected in food — potential safety hazard. Immediate Food Safety Priority Override triggered.',
    department:         'Student Welfare',
    location:           'Main Campus Canteen — Counter 2',

    // Canteen-specific fields
    canteenLocation:    'Main Campus Canteen',
    dishName:           'Dal Rice (Lunch Special)',
    issueType:          'FOREIGN_OBJECT',
    mealTime:           'Lunch',

    assignedOfficer: {
      name:    'Mr. Anand Subramaniam',
      role:    'Student Welfare Officer / Canteen Inspector',
      contact: '+91 94421 88765',
      email:   'anand.subramaniam@scgrs.edu'
    },

    adminRemarks:
      'CRITICAL food safety complaint raised. Canteen Counter 2 temporarily sealed pending inspection. ' +
      'Supplier (Sri Venkateswara Food Supplies) notified. ' +
      'Kitchen hygiene audit scheduled for 2026-08-28 10:00 AM. ' +
      'Student counselled and compensated with meal replacement.',

    resolutionRemarks:
      'Inspection completed on 2026-08-28. Plastic fragment traced to supplier packaging defect in lentil batch. ' +
      'Entire batch recalled. Counter 2 deep-cleaned and reopened after health clearance. ' +
      'Supplier issued formal warning and penalty. Student formally notified of resolution. ' +
      'Monthly random kitchen audits introduced as preventive measure.',

    status: 'RESOLVED',
    slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  });

  console.log('Created Canteen Complaint: ' + canteenComplaint.complaintId + ' — ' + canteenComplaint.title);
  console.log('\nDemo seed complete! Login as student to see both complaints.');
  console.log('Student email: ' + student.email);
  mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
