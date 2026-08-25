const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const axios = require('axios');

// Route categories to departments
const getAssignedDepartment = (category) => {
  switch (category) {
    case 'Academic':
      return 'Academic Department';
    case 'Hostel':
      return 'Hostel Administration';
    case 'Transport':
      return 'Transport Department';
    case 'Internet/Wi-Fi':
      return 'IT Department';
    case 'Infrastructure':
      return 'Maintenance Department';
    case 'Harassment':
    case 'Ragging':
    case 'Safety':
      return 'Student Welfare / Anti-Ragging Committee';
    default:
      return 'General Administration';
  }
};

// Calculate SLA Deadline based on priority
const calculateSLADeadline = (priority) => {
  const now = new Date();
  switch (priority) {
    case 'CRITICAL':
      return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours for Critical emergencies
    case 'HIGH':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours for High priority
    case 'MEDIUM':
      return new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours for Medium priority
    case 'LOW':
    default:
      return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours for Low priority
  }
};

// Check and auto-escalate complaints with expired SLA deadlines
const checkSLAEscalations = async () => {
  try {
    const now = new Date();
    const expiredComplaints = await Complaint.find({
      status: { $nin: ['RESOLVED'] },
      slaDeadline: { $lte: now },
      isEscalated: false
    });

    for (const c of expiredComplaints) {
      c.isEscalated = true;
      c.status = 'ESCALATED';
      c.escalatedTo = 'Higher Authority (Principal & Campus Security Management)';
      c.escalatedAt = now;
      c.adminRemarks = (c.adminRemarks ? c.adminRemarks + ' | ' : '') + '⚠️ SLA EXPIRED: Automatically escalated to Higher Authority due to non-resolution within specified timeframe.';
      await c.save();
    }
  } catch (err) {
    console.error('Error during SLA auto-escalation check:', err.message);
  }
};

// Local fallback AI implementation if the Flask microservice is not online
const localAIAnalyze = (text) => {
  const lowercaseText = text.toLowerCase();
  
  // Keyword categories
  const low = ["fan", "light", "minor", "suggestion", "classroom equipment", "bulb", "switch", "cleanliness"];
  const medium = ["repeated", "internet problem", "water problem", "hostel issue", "transport delay", "wifi", "wi-fi", "speed", "mess", "canteen", "bus"];
  const high = ["exam issue", "academic emergency", "repeated complaint", "serious infrastructure issue", "fees", "hall ticket", "grade", "results", "leaking", "flood", "broken door"];
  const critical = ["harassment", "ragging", "threat", "violence", "safety", "assault", "emergency", "bully", "abuse", "suicidal", "steal", "theft", "weapon"];

  let basePriority = "LOW";
  let baseScore = 0.20;
  let matchedKeyword = null;

  for (const word of critical) {
    if (lowercaseText.includes(word)) {
      basePriority = "CRITICAL";
      baseScore = 0.85;
      matchedKeyword = word;
      break;
    }
  }

  if (basePriority === "LOW") {
    for (const word of high) {
      if (lowercaseText.includes(word)) {
        basePriority = "HIGH";
        baseScore = 0.65;
        matchedKeyword = word;
        break;
      }
    }
  }

  if (basePriority === "LOW") {
    for (const word of medium) {
      if (lowercaseText.includes(word)) {
        basePriority = "MEDIUM";
        baseScore = 0.45;
        matchedKeyword = word;
        break;
      }
    }
  }

  if (basePriority === "LOW") {
    for (const word of low) {
      if (lowercaseText.includes(word)) {
        basePriority = "LOW";
        baseScore = 0.25;
        matchedKeyword = word;
        break;
      }
    }
  }

  // Sentiment matching
  const neg = ["not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated", "disappointed", "slow", "failed", "error", "issue", "problem", "hate", "no"];
  let negCount = 0;
  for (const word of neg) {
    if (lowercaseText.includes(word)) negCount++;
  }

  let sentiment = "NEUTRAL";
  let score = baseScore;
  if (negCount > 0) {
    sentiment = "NEGATIVE";
    score += 0.10;
  }

  // Map back to category
  let priority = "LOW";
  if (score >= 0.80) priority = "CRITICAL";
  else if (score >= 0.60) priority = "HIGH";
  else if (score >= 0.40) priority = "MEDIUM";

  let reason = matchedKeyword 
    ? `Urgency keyword '${matchedKeyword}' detected.`
    : "General complaint context.";
  if (sentiment === "NEGATIVE") reason += " Negative sentiment identified.";

  return {
    priority,
    score: round(score, 2),
    sentiment,
    reason: reason + " (Local Fallback Analysis)"
  };
};

const round = (num, decimalPlaces) => {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
};

// Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, anonymous, location, attachment } = req.body;
    const studentId = req.user.id;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required.' });
    }

    // Call Python AI Service
    let aiResults;
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/analyze`, {
        text: description
      }, { timeout: 3000 });
      
      aiResults = aiResponse.data;
      console.log('AI Service analysis results:', aiResults);
    } catch (aiError) {
      console.warn('AI Service is unreachable, falling back to backend keywords classification.', aiError.message);
      aiResults = localAIAnalyze(description);
    }

    // Dynamic routing & SLA calculation
    const department = getAssignedDepartment(category);
    const slaDeadline = calculateSLADeadline(aiResults.priority);

    // Sequence calculation
    const count = await Complaint.countDocuments();
    const currentYear = new Date().getFullYear();
    const complaintId = `SCGRS-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const newComplaint = new Complaint({
      complaintId,
      studentId,
      title,
      description,
      category,
      priority: aiResults.priority,
      priorityScore: aiResults.score,
      sentiment: aiResults.sentiment,
      priorityReason: aiResults.reason,
      department,
      location: location || 'Campus Premises',
      attachment: attachment || '',
      anonymous: !!anonymous,
      slaDeadline,
      status: 'SUBMITTED'
    });

    await newComplaint.save();
    res.status(201).json(newComplaint);

  } catch (error) {
    res.status(500).json({ message: 'Error submitting complaint.', error: error.message });
  }
};

// Get all complaints (filtered based on roles and queries)
exports.getComplaints = async (req, res) => {
  try {
    // Run SLA check to auto-escalate expired complaints
    await checkSLAEscalations();

    const isUserAdmin = req.user.role === 'admin';
    let filter = {};

    if (!isUserAdmin) {
      // Student only sees their own complaints
      filter.studentId = req.user.id;
    } else {
      // Admins can filter
      const { priority, category, department, status } = req.query;
      if (priority) filter.priority = priority;
      if (category) filter.category = category;
      if (department) filter.department = department;
      if (status) filter.status = status;
    }

    // Populate student info
    let complaints = await Complaint.find(filter)
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    // Protect anonymous identity for admins/others
    complaints = complaints.map(complaint => {
      const obj = complaint.toObject();
      if (obj.anonymous) {
        // Redact only if the logged-in user is not the student who created it
        if (!req.user || String(obj.studentId._id || obj.studentId) !== String(req.user.id)) {
          obj.studentId = { name: 'Anonymous Student', email: 'N/A' };
        }
      }
      return obj;
    });

    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving complaints.', error: error.message });
  }
};

// Get single complaint details
exports.getComplaintById = async (req, res) => {
  try {
    await checkSLAEscalations();

    let complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Validate access
    if (req.user.role !== 'admin' && String(complaint.studentId._id || complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    // Fetch associated feedback if resolved
    let feedback = null;
    if (complaint.status === 'RESOLVED') {
      feedback = await Feedback.findOne({ complaintId: complaint._id });
    }

    const obj = complaint.toObject();
    // Protect anonymous identity
    if (obj.anonymous && String(obj.studentId._id || obj.studentId) !== String(req.user.id)) {
      obj.studentId = { name: 'Anonymous Student', email: 'N/A' };
    }

    res.status(200).json({
      complaint: obj,
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving complaint details.', error: error.message });
  }
};

// Update complaint status and resolution remarks (Admin only)
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminRemarks, resolutionRemarks, assignedOfficer } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.status = status;
    if (adminRemarks !== undefined) {
      complaint.adminRemarks = adminRemarks;
    }
    if (resolutionRemarks !== undefined) {
      complaint.resolutionRemarks = resolutionRemarks;
    }
    if (assignedOfficer && typeof assignedOfficer === 'object') {
      complaint.assignedOfficer = {
        name: assignedOfficer.name || complaint.assignedOfficer.name,
        role: assignedOfficer.role || complaint.assignedOfficer.role,
        contact: assignedOfficer.contact || complaint.assignedOfficer.contact,
        email: assignedOfficer.email || complaint.assignedOfficer.email
      };
    }

    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error updating complaint status.', error: error.message });
  }
};

// Assign Responsible Person / Officer to complaint (Admin only)
exports.assignOfficer = async (req, res) => {
  try {
    const { name, role, contact, email } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Officer name is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.assignedOfficer = {
      name,
      role: role || 'Department Officer',
      contact: contact || '',
      email: email || ''
    };

    // Auto update status to ASSIGNED if currently SUBMITTED or UNDER REVIEW
    if (['SUBMITTED', 'UNDER REVIEW'].includes(complaint.status)) {
      complaint.status = 'ASSIGNED';
    }

    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error assigning officer.', error: error.message });
  }
};

// Assign/reassign department (Admin only)
exports.updateDepartment = async (req, res) => {
  try {
    const { department } = req.body;
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.department = department;
    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error reassigning department.', error: error.message });
  }
};

// Create feedback for complaint (Student only)
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const complaintId = req.params.id;

    if (!rating) {
      return res.status(400).json({ message: 'Rating is required.' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Verify ownership
    if (String(complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    // Verify resolved status
    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Feedback can only be submitted for RESOLVED complaints.' });
    }

    // Check if feedback already submitted
    const existingFeedback = await Feedback.findOne({ complaintId });
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback has already been submitted for this complaint.' });
    }

    const newFeedback = new Feedback({
      complaintId,
      rating,
      comment: comment || ''
    });

    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting feedback.', error: error.message });
  }
};

// Reopen a complaint (Student only)
exports.reopenComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Verify ownership
    if (String(complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    // Only allow reopen if RESOLVED
    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Only resolved complaints can be reopened.' });
    }

    // Delete feedback if they want to reopen, or keep it. Let's delete it so they can resubmit feedback later when resolved again.
    await Feedback.deleteOne({ complaintId });

    complaint.status = 'REOPENED';
    await complaint.save();

    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error reopening complaint.', error: error.message });
  }
};

// Get dashboard statistics for Admin
exports.getAdminStatistics = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'SUBMITTED' });
    const underReview = await Complaint.countDocuments({ status: 'UNDER REVIEW' });
    const assigned = await Complaint.countDocuments({ status: 'ASSIGNED' });
    const inProgress = await Complaint.countDocuments({ status: 'IN PROGRESS' });
    const resolved = await Complaint.countDocuments({ status: 'RESOLVED' });
    const reopened = await Complaint.countDocuments({ status: 'REOPENED' });

    const high = await Complaint.countDocuments({ priority: 'HIGH' });
    const critical = await Complaint.countDocuments({ priority: 'CRITICAL' });

    // Category distribution for charts/tables
    const categories = ['Academic', 'Hostel', 'Transport', 'Infrastructure', 'Internet/Wi-Fi', 'Harassment', 'Ragging', 'Safety', 'Other'];
    const categoryStats = {};
    for (const cat of categories) {
      categoryStats[cat] = await Complaint.countDocuments({ category: cat });
    }

    // Department distribution
    const departments = [
      'Academic Department', 
      'Hostel Administration', 
      'Transport Department', 
      'IT Department', 
      'Maintenance Department', 
      'Student Welfare / Anti-Ragging Committee',
      'General Administration'
    ];
    const departmentStats = {};
    for (const dept of departments) {
      departmentStats[dept] = await Complaint.countDocuments({ department: dept });
    }

    res.status(200).json({
      total,
      pending,
      underReview,
      assigned,
      inProgress,
      resolved,
      reopened,
      high,
      critical,
      activeComplaints: total - resolved,
      categoryStats,
      departmentStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving statistics.', error: error.message });
  }
};

// Get dashboard statistics for Student
exports.getStudentStatistics = async (req, res) => {
  try {
    const studentId = req.user.id;

    const total = await Complaint.countDocuments({ studentId });
    const pending = await Complaint.countDocuments({ 
      studentId, 
      status: { $in: ['SUBMITTED', 'UNDER REVIEW', 'IN PROGRESS', 'REOPENED'] } 
    });
    const resolved = await Complaint.countDocuments({ studentId, status: 'RESOLVED' });
    
    // Critical complaints submitted by student that are not yet resolved
    const critical = await Complaint.countDocuments({
      studentId,
      priority: { $in: ['HIGH', 'CRITICAL'] },
      status: { $ne: 'RESOLVED' }
    });

    res.status(200).json({
      total,
      pending,
      resolved,
      critical
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user statistics.', error: error.message });
  }
};

// Seed 5 demo grievances for the demo presentation
exports.seedDemoComplaints = async () => {
  try {
    const count = await Complaint.countDocuments();
    if (count > 0) {
      // Database already has complaints, don't re-seed
      return;
    }

    // Find student
    const student = await User.findOne({ email: 'student@scgrs.com' });
    if (!student) {
      console.log('Unable to seed demo complaints: student user student@scgrs.com not found.');
      return;
    }

    const now = new Date();
    const demoData = [
      {
        title: "Wi-Fi is not working in Block A",
        description: "The Wi-Fi has not been working for the past three days, and students are unable to attend online classes.",
        category: "Internet/Wi-Fi",
        location: "Block A Hostel, 2nd Floor",
        attachment: "wifi_router_error_screenshot.png",
        priority: "HIGH",
        priorityScore: 0.75,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'wi-fi', 'online classes'. Negative sentiment identified.",
        department: "IT Department",
        assignedOfficer: {
          name: "Mr. Rajesh Kumar",
          role: "Network Administrator",
          contact: "+91 98765 43210",
          email: "it.admin@scgrs.edu"
        },
        status: "ASSIGNED",
        slaDeadline: new Date(now.getTime() + 18 * 60 * 60 * 1000), // 18 hours remaining
        anonymous: false
      },
      {
        title: "Hostel drinking water supply issue",
        description: "There is no drinking water in Hostel Block C. The dispensers have not been cleaned and water flow has stopped completely.",
        category: "Hostel",
        location: "Hostel Block C, Mess Area",
        attachment: "water_dispenser_photo.jpg",
        priority: "MEDIUM",
        priorityScore: 0.55,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'water', 'hostel'. Negative sentiment identified.",
        department: "Hostel Administration",
        assignedOfficer: {
          name: "Suresh Sharma",
          role: "Hostel Caretaker",
          contact: "+91 98123 45678",
          email: "hostel.admin@scgrs.edu"
        },
        status: "IN PROGRESS",
        slaDeadline: new Date(now.getTime() + 30 * 60 * 60 * 1000), // 30 hours remaining
        anonymous: false
      },
      {
        title: "Harassment incident near library",
        description: "I am being harassed near the college library during evening hours. I feel unsafe and threatened.",
        category: "Harassment",
        location: "Central Library Entrance",
        attachment: "",
        priority: "CRITICAL",
        priorityScore: 0.95,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'harassed', 'unsafe', 'threatened'. Negative sentiment identified.",
        department: "Student Welfare / Anti-Ragging Committee",
        assignedOfficer: {
          name: "Dr. Ananya Sen",
          role: "Student Welfare Officer",
          contact: "+91 94321 87654",
          email: "welfare@scgrs.edu"
        },
        status: "UNDER REVIEW",
        slaDeadline: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours remaining (urgent!)
        anonymous: true
      },
      {
        title: "Classroom ceiling fan broken",
        description: "The ceiling fan in Room 302 of Academic Block 1 is broken and stopped rotating.",
        category: "Infrastructure",
        location: "Academic Block 1, Room 302",
        attachment: "fan_photo.jpg",
        priority: "LOW",
        priorityScore: 0.35,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keyword 'fan' detected.",
        department: "Maintenance Department",
        assignedOfficer: {
          name: "Ramesh Verma",
          role: "Maintenance Supervisor",
          contact: "+91 97654 32109",
          email: "maintenance@scgrs.edu"
        },
        status: "RESOLVED",
        resolutionRemarks: "The Wi-Fi router and capacitor for the fan were replaced and connection/rotation restored.",
        slaDeadline: new Date(now.getTime() + 60 * 60 * 60 * 1000),
        anonymous: false
      },
      {
        title: "Ragging near basketball court",
        description: "Senior students forcing junior students to perform inappropriate tasks near basketball court. This incident was not resolved in time.",
        category: "Ragging",
        location: "Sports Complex Basketball Court",
        attachment: "",
        priority: "CRITICAL",
        priorityScore: 0.95,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'ragging', 'forcing'. Negative sentiment identified.",
        department: "Higher Authority (Principal & Anti-Ragging Cell Chair)",
        assignedOfficer: {
          name: "Prof. V. K. Malhotra",
          role: "Principal & Anti-Ragging Chair",
          contact: "+91 91111 22222",
          email: "principal@scgrs.edu"
        },
        status: "ESCALATED",
        isEscalated: true,
        escalatedTo: "Higher Authority (Principal & Anti-Ragging Cell Chair)",
        escalatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Escalated 1 hour ago
        slaDeadline: new Date(now.getTime() - 5 * 60 * 60 * 1000), // SLA expired 5 hours ago
        adminRemarks: "⚠️ SLA EXPIRED: Automatically escalated to Higher Authority due to non-resolution within specified timeframe.",
        anonymous: true
      }
    ];

    const currentYear = new Date().getFullYear();
    for (let i = 0; i < demoData.length; i++) {
      const data = demoData[i];
      const complaintId = `SCGRS-${currentYear}-${String(i + 1).padStart(4, '0')}`;
      
      const complaint = new Complaint({
        ...data,
        complaintId,
        studentId: student._id
      });
      await complaint.save();
    }

    console.log('5 Demo complaints seeded successfully.');
  } catch (error) {
    console.error('Error seeding demo complaints:', error.message);
  }
};
