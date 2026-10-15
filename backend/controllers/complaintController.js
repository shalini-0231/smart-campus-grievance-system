const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────
// Email Utility — creates an Ethereal test transporter if no
// real SMTP credentials are configured, so the feature works
// out-of-the-box even in dev.  Swap EMAIL_SERVICE / USER /
// PASS in .env for production Gmail or any SMTP provider.
// ─────────────────────────────────────────────────────────
const createMailTransporter = async () => {
  // Real SMTP credentials supplied in .env → use them directly
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_SERVICE !== 'ethereal') {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Try Ethereal (fake SMTP with preview URL) — requires internet access
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  } catch (etherealErr) {
    // Ethereal unreachable (offline / API down) — fall back to console-only mock
    console.warn('⚠️  [SCGRS Email] Ethereal SMTP unavailable, using console mock transporter:', etherealErr.message);
    return {
      sendMail: async (opts) => {
        console.log('\n📧 ─── [SCGRS EMAIL MOCK] ─────────────────────────────────');
        console.log(`  To      : ${opts.to}`);
        console.log(`  From    : ${opts.from}`);
        console.log(`  Subject : ${opts.subject}`);
        console.log('  (HTML body omitted — set EMAIL_USER + EMAIL_PASS in .env for real delivery)');
        console.log('──────────────────────────────────────────────────────────\n');
        // Return a fake info object so getTestMessageUrl() returns null gracefully
        return { messageId: `mock-${Date.now()}@scgrs.local`, accepted: [opts.to], rejected: [] };
      }
    };
  }
};


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
    case 'Canteen Dish Issue':
      return 'Canteen & Hospitality';
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

// Check 48-hour resolution expiry for Novelty 5
const checkResolutionExpiry = async () => {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const expiredComplaints = await Complaint.find({
      status: 'RESOLVED',
      resolvedAt: { $lte: fortyEightHoursAgo }
    });

    for (const c of expiredComplaints) {
      const fb = await Feedback.findOne({ complaintId: c._id });
      if (!fb) {
        c.status = 'REOPENED';
        c.reopenCount = (c.reopenCount || 0) + 1;
        c.adminRemarks = (c.adminRemarks ? c.adminRemarks + ' | ' : '') + '⚠️ 48-Hour Resolution Expiry: Ticket automatically reopened as resolution was unconfirmed by student within 48 hours.';
        if (c.reopenCount >= 2) {
          c.status = 'ESCALATED';
          c.isEscalated = true;
          c.escalatedTo = 'Higher Authority (Principal & Grievance Review Committee)';
          c.adminRemarks += ' | ⚠️ Multi-Reopen Escalation: Reopened 2+ times, escalated to Higher Authority.';
        }
        await c.save();
      }
    }
  } catch (err) {
    console.error('Error during 48-hour resolution expiry check:', err.message);
  }
};

// ── Novelty 1: Explainable Deterministic Priority Engine ─────────────────────
// Algorithm: Weighted Keyword Sum + Threshold Bands
// Dataset: keyword_severity.csv (keyword, category, department, severity_weight)
// Cutoffs: >= 80 -> CRITICAL, 60-79 -> HIGH, 40-59 -> MEDIUM, < 40 -> LOW
// Confidence % = min(100, Math.round(total_score))

const loadKeywordDataset = () => {
  try {
    const csvPath = path.join(__dirname, '../data/keyword_severity.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      const dataset = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 4) {
          dataset.push({
            word: parts[0].trim().toLowerCase(),
            category: parts[1].trim(),
            department: parts[2].trim(),
            weight: parseInt(parts[3].trim(), 10) || 10
          });
        }
      }
      if (dataset.length > 0) return dataset;
    }
  } catch (err) {
    console.warn('Warning: Could not read keyword_severity.csv, using default matrix:', err.message);
  }

  // Built-in fallback
  return [
    { word: "harassment", weight: 40, category: "Harassment" },
    { word: "ragging", weight: 40, category: "Ragging" },
    { word: "threat", weight: 40, category: "Safety" },
    { word: "violence", weight: 40, category: "Safety" },
    { word: "assault", weight: 40, category: "Safety" },
    { word: "emergency", weight: 40, category: "Safety" },
    { word: "bully", weight: 35, category: "Safety" },
    { word: "abuse", weight: 40, category: "Safety" },
    { word: "suicidal", weight: 40, category: "Safety" },
    { word: "weapon", weight: 40, category: "Safety" },
    { word: "safety", weight: 35, category: "Safety" },
    { word: "cockroach", weight: 40, category: "Canteen Dish Issue" },
    { word: "foreign object", weight: 40, category: "Canteen Dish Issue" },
    { word: "poison", weight: 40, category: "Canteen Dish Issue" },
    { word: "fire", weight: 40, category: "Infrastructure" },
    { word: "academic emergency", weight: 30, category: "Academic" },
    { word: "flood", weight: 30, category: "Infrastructure" },
    { word: "food poisoning", weight: 35, category: "Canteen Dish Issue" },
    { word: "exam issue", weight: 25, category: "Academic" },
    { word: "exam", weight: 25, category: "Academic" },
    { word: "fees", weight: 25, category: "Academic" },
    { word: "hall ticket", weight: 25, category: "Academic" },
    { word: "leaking", weight: 25, category: "Infrastructure" },
    { word: "hygiene", weight: 25, category: "Canteen Dish Issue" },
    { word: "stale food", weight: 25, category: "Canteen Dish Issue" },
    { word: "wifi", weight: 15, category: "Internet/Wi-Fi" },
    { word: "canteen", weight: 15, category: "Canteen Dish Issue" },
    { word: "bus", weight: 15, category: "Transport" },
    { word: "fan", weight: 10, category: "Infrastructure" },
    { word: "light", weight: 10, category: "Infrastructure" }
  ];
};

const KEYWORD_SEVERITY = loadKeywordDataset();

const localAIAnalyze = (text, eventDate = null, issueType = null) => {
  const lowercaseText = (text || '').toLowerCase().replace(/[^\w\s]/g, '');
  let maxWeight = 0;
  const matchedKeywords = [];
  let detectedCategory = null;
  let assignedDepartment = null;

  for (const item of KEYWORD_SEVERITY) {
    const cleanKw = item.word.toLowerCase().replace(/[^\w\s]/g, '');
    if (cleanKw && lowercaseText.includes(cleanKw)) {
      const regex = new RegExp(`\\b${cleanKw}\\b`);
      if (regex.test(lowercaseText)) {
        matchedKeywords.push(item.word);
        if (item.weight > maxWeight) {
          maxWeight = item.weight;
          detectedCategory = item.category;
          assignedDepartment = item.department;
        }
      }
    }
  }

  let isPastEvent = false;
  if (eventDate) {
    try {
      const datePart = eventDate.split('T')[0];
      const parsedDate = new Date(datePart);
      if (parsedDate < new Date()) {
        isPastEvent = true;
      }
    } catch (e) {}
  }

  if (isPastEvent && maxWeight < 25) {
    maxWeight = Math.max(maxWeight, 25);
  }

  let basePriority = 'LOW';
  if (maxWeight >= 35) basePriority = 'CRITICAL';
  else if (maxWeight >= 25) basePriority = 'HIGH';
  else if (maxWeight >= 15) basePriority = 'MEDIUM';
  else basePriority = 'LOW';

  let baseScore = maxWeight > 0 ? maxWeight / 50.0 : 0.15;
  if (isPastEvent && baseScore < 0.70) {
    baseScore = 0.70;
  }

  const negWords = ["not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated", "disappointed", "slow", "failed", "error", "issue", "problem", "hate", "no", "harassment", "ragging", "violence", "abuse", "threat", "emergency", "rejected", "unapproved", "pending", "missing"];
  const posWords = ["good", "great", "excellent", "happy", "satisfied", "solved", "fixed", "nice", "helpful", "thanks", "thank", "love", "awesome", "perfect", "resolved", "approved"];
  
  const words = lowercaseText.split(/\s+/);
  let negCount = 0;
  let posCount = 0;
  for (const w of words) {
    if (negWords.includes(w)) negCount++;
    if (posWords.includes(w)) posCount++;
  }
  
  let sentimentScore = 0;
  let sentimentLabel = "NEUTRAL";
  if (negCount + posCount > 0) {
    sentimentScore = (posCount - negCount) / (posCount + negCount);
    if (sentimentScore > 0.15) sentimentLabel = "POSITIVE";
    else if (sentimentScore < -0.15) sentimentLabel = "NEGATIVE";
  }

  let finalScore = baseScore;
  if (sentimentLabel === "NEGATIVE") finalScore += 0.10;
  else if (sentimentLabel === "POSITIVE") finalScore -= 0.10;

  finalScore = Math.max(0.05, Math.min(0.99, finalScore));

  let foodSafetyOverride = false;
  let overridePriority = null;
  const criticalFoodKeywords = ["foreign object", "cockroach", "insect", "poison", "hair in food", "glass in food"];
  const highFoodKeywords = ["hygiene", "stale food", "dirty food", "unhygiene", "spoiled food"];

  const hasCriticalFood = issueType === 'FOREIGN_OBJECT' || criticalFoodKeywords.some(kw => new RegExp(`\\b${kw.replace(/[^\w\s]/g, '')}\\b`).test(lowercaseText));
  const hasHighFood = issueType === 'HYGIENE' || highFoodKeywords.some(kw => new RegExp(`\\b${kw.replace(/[^\w\s]/g, '')}\\b`).test(lowercaseText));

  if (hasCriticalFood) {
    foodSafetyOverride = true;
    overridePriority = 'CRITICAL';
    finalScore = 0.90;
    if (!detectedCategory) detectedCategory = "Canteen Dish Issue";
    if (!assignedDepartment) assignedDepartment = "Canteen & Hospitality";
  } else if (hasHighFood) {
    foodSafetyOverride = true;
    overridePriority = 'HIGH';
    finalScore = Math.max(finalScore, 0.75);
    if (!detectedCategory) detectedCategory = "Canteen Dish Issue";
    if (!assignedDepartment) assignedDepartment = "Canteen & Hospitality";
  }

  let priority = basePriority;
  if (foodSafetyOverride) {
    priority = overridePriority;
  } else {
    if (finalScore >= 0.70) priority = "CRITICAL";
    else if (finalScore >= 0.50) priority = "HIGH";
    else if (finalScore >= 0.30) priority = "MEDIUM";
    else priority = "LOW";
  }

  const confidencePercent = Math.min(100, Math.max(5, Math.round(finalScore * 100)));
  
  let reason = "";
  if (foodSafetyOverride) {
    reason = `[ALERT] Food Safety Priority Override: Escalated due to health and food safety concern (${issueType || priority}).`;
  } else if (matchedKeywords.length > 0) {
    reason = `Urgency keywords detected: ${matchedKeywords.slice(0, 3).map(k => `'${k}'`).join(', ')}.`;
  } else {
    reason = "General vocabulary detected with neutral context.";
  }

  if (isPastEvent) {
    reason += " [ALERT] Time-sensitive OD escalation: Event date has already passed.";
  }
  if (sentimentLabel === "NEGATIVE") {
    reason += " Sentiment is negative, indicating high frustration.";
  }

  return {
    priority,
    score: round(finalScore, 2),
    confidencePercent,
    matchedKeywords,
    sentiment: sentimentLabel,
    reason: `${confidencePercent}% — ${priority} — ${reason}`,
    isFoodSafetyOverride: foodSafetyOverride,
    detectedCategory,
    assignedDepartment
  };
};

const round = (num, decimalPlaces) => {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
};

// Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      anonymous, 
      location, 
      attachment,
      canteenLocation,
      dishName,
      issueType,
      mealTime,
      dishPhoto
    } = req.body;
    const studentId = req.user.id;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required.' });
    }

    // Call Python AI Service
    let aiResults;
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/analyze`, {
        text: description,
        eventDate: req.body.eventDate || null,
        issueType: issueType || null
      }, { timeout: 3000 });
      
      aiResults = aiResponse.data;
      console.log('AI Service analysis results:', aiResults);
    } catch (aiError) {
      console.warn('AI Service is unreachable, falling back to backend keywords classification.', aiError.message);
      aiResults = localAIAnalyze(description, req.body.eventDate || null, issueType);
    }

    // Always ensure matchedKeywords and confidencePercent are present
    if (!aiResults.matchedKeywords || aiResults.matchedKeywords.length === 0) {
      const fallbackAnalysis = localAIAnalyze(description, req.body.eventDate || null, issueType);
      aiResults.matchedKeywords = fallbackAnalysis.matchedKeywords;
      aiResults.confidencePercent = fallbackAnalysis.confidencePercent;
      if (!aiResults.priority) aiResults.priority = fallbackAnalysis.priority;
    } else if (!aiResults.confidencePercent) {
      aiResults.confidencePercent = Math.min(100, Math.round((aiResults.score || 0.2) * 100));
    }

    // Dynamic routing & SLA calculation
    const department = getAssignedDepartment(category);
    const slaDeadline = calculateSLADeadline(aiResults.priority);

    // Sequence calculation
    const count = await Complaint.countDocuments();
    const currentYear = new Date().getFullYear();
    const complaintId = `SCGRS-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // ── Novelty 3: Duplicate & Recurring-Issue Clustering ─────────────────────
    // Check open complaints with the same category
    let isDuplicate = false;
    let parentComplaintId = null;

    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'not', 'are', 'was', 'were', 'our', 'room', 'campus', 'complaint', 'issue', 'problem']);
    const getTokens = (str) => {
      return (str || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
    };

    const newTokens = new Set(getTokens(description));

    if (newTokens.size > 0) {
      const openCandidates = await Complaint.find({
        status: { $nin: ['RESOLVED', 'CLOSED'] },
        category: category,
        isDuplicate: false
      });

      for (const candidate of openCandidates) {
        const candidateTokens = getTokens(candidate.description);
        let commonWordCount = 0;
        for (const token of candidateTokens) {
          if (newTokens.has(token)) commonWordCount++;
        }

        const sameLocation = location && candidate.location && 
          location.trim().toLowerCase() === candidate.location.trim().toLowerCase();

        // If >= 3 common words, or same location with >= 2 common words
        if (commonWordCount >= 3 || (sameLocation && commonWordCount >= 2)) {
          isDuplicate = true;
          parentComplaintId = candidate._id;

          // Increment affectedStudentCount on parent
          candidate.affectedStudentCount = (candidate.affectedStudentCount || 1) + 1;

          // If affectedStudentCount >= 5, boost parent priority by one level
          if (candidate.affectedStudentCount >= 5) {
            if (candidate.priority === 'LOW') {
              candidate.priority = 'MEDIUM';
            } else if (candidate.priority === 'MEDIUM') {
              candidate.priority = 'HIGH';
            } else if (candidate.priority === 'HIGH') {
              candidate.priority = 'CRITICAL';
            }
            candidate.slaDeadline = calculateSLADeadline(candidate.priority);
            candidate.adminRemarks = (candidate.adminRemarks ? candidate.adminRemarks + ' | ' : '') +
              `🔗 Priority escalated: Recurring issue affecting ${candidate.affectedStudentCount} students.`;
          }

          await candidate.save();
          break;
        }
      }
    }

    const newComplaint = new Complaint({
      complaintId,
      studentId,
      title,
      description,
      category,
      priority: aiResults.priority,
      priorityScore: aiResults.score,
      confidencePercent: aiResults.confidencePercent,
      matchedKeywords: aiResults.matchedKeywords || [],
      parentComplaintId,
      isDuplicate,
      affectedStudentCount: 1,
      sentiment: aiResults.sentiment,
      priorityReason: aiResults.reason,
      department,
      location: location || 'Campus Premises',
      attachment: attachment || '',
      anonymous: !!anonymous,
      slaDeadline,
      status: 'SUBMITTED',
      canteenLocation: canteenLocation || '',
      dishName: dishName || '',
      issueType: issueType || '',
      mealTime: mealTime || '',
      dishPhoto: dishPhoto || ''
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
    // Run SLA check & 48-hr resolution expiry check
    await checkSLAEscalations();
    await checkResolutionExpiry();

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
    await checkResolutionExpiry();

    let complaint = await Complaint.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('parentComplaintId', 'complaintId title status priority affectedStudentCount');
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

    // Novelty 5: Track resolvedAt timestamp
    if (status === 'RESOLVED' && complaint.status !== 'RESOLVED') {
      complaint.resolvedAt = new Date();
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
      email: email || '',
      // Reset notification status on every (re)assignment so admin
      // gets a fresh "Notify Officer" button for the new assignee.
      notified: false,
      notifiedAt: null
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

// Manually notify assigned officer via email (Admin only)
exports.notifyOfficer = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    const { assignedOfficer } = complaint;
    if (!assignedOfficer || !assignedOfficer.name) {
      return res.status(400).json({ message: 'No officer assigned to this complaint.' });
    }
    if (!assignedOfficer.email) {
      return res.status(400).json({ message: 'Assigned officer does not have an email address on record.' });
    }

    // Build email HTML
    const priorityColors = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#22c55e'
    };
    const priorityColor = priorityColors[complaint.priority] || '#6b7280';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 30px auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
    <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 24px 28px;">
      <h1 style="margin: 0; font-size: 20px; color: #ffffff;">📋 Grievance Assignment Notification</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">Smart Campus Grievance Redressal System (SCGRS)</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; color: #cbd5e1;">Dear <strong style="color: #f1f5f9;">${assignedOfficer.name}</strong>,</p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
        You have been assigned to handle the following campus grievance. Please review the details below and take appropriate action within the SLA timeframe.
      </p>

      <div style="background: #0f172a; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #334155;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; color: #64748b; width: 38%; vertical-align: top;">Complaint ID</td>
            <td style="padding: 8px 12px; font-weight: 700; color: #38bdf8; font-family: monospace;">${complaint.complaintId}</td>
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td style="padding: 8px 12px; color: #64748b;">Title</td>
            <td style="padding: 8px 12px; font-weight: 600; color: #f1f5f9;">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b;">Category</td>
            <td style="padding: 8px 12px; color: #e2e8f0;">${complaint.category}</td>
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td style="padding: 8px 12px; color: #64748b;">Department</td>
            <td style="padding: 8px 12px; color: #e2e8f0;">${complaint.department}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b;">Priority</td>
            <td style="padding: 8px 12px;">
              <span style="background: ${priorityColor}22; color: ${priorityColor}; padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; border: 1px solid ${priorityColor}55;">
                ${complaint.priority}
              </span>
            </td>
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td style="padding: 8px 12px; color: #64748b;">SLA Deadline</td>
            <td style="padding: 8px 12px; color: #f97316; font-weight: 600;">${complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b;">Your Role</td>
            <td style="padding: 8px 12px; color: #38bdf8;">${assignedOfficer.role || 'Department Officer'}</td>
          </tr>
        </table>
      </div>

      <div style="background: #0f172a; border-radius: 8px; padding: 16px 20px; margin: 16px 0; border-left: 4px solid #0891b2;">
        <p style="font-size: 12px; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0; white-space: pre-wrap;">${complaint.description}</p>
      </div>

      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
        Please log in to the SCGRS portal to take action, update the status, and add your resolution remarks.
      </p>
    </div>
    <div style="padding: 16px 28px; background: #0f172a; border-top: 1px solid #1e293b; font-size: 12px; color: #475569; text-align: center;">
      This is an automated notification from the Smart Campus Grievance Redressal System. Do not reply to this email.
    </div>
  </div>
</body>
</html>`;

    const transporter = await createMailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"SCGRS Admin" <noreply@scgrs.edu>',
      to: assignedOfficer.email,
      subject: `[SCGRS] Grievance Assignment — ${complaint.complaintId} (${complaint.priority} Priority)`,
      html: htmlBody
    };

    const info = await transporter.sendMail(mailOptions);

    // For Ethereal test accounts, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 [SCGRS Notify] Email preview (Ethereal): ${previewUrl}`);
    }

    // Persist notification status
    complaint.assignedOfficer.notified = true;
    complaint.assignedOfficer.notifiedAt = new Date();
    await complaint.save();

    res.status(200).json({
      message: `Notification email sent to ${assignedOfficer.email}`,
      notifiedAt: complaint.assignedOfficer.notifiedAt,
      previewUrl: previewUrl || null,
      complaint
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending notification email.', error: error.message });
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

// Reopen a complaint (Student only) — Novelty 5: Multi-Reopen Escalation
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

    // Remove old feedback
    await Feedback.deleteOne({ complaintId });

    complaint.reopenCount = (complaint.reopenCount || 0) + 1;

    // Novelty 5: Auto-escalate if reopened 2 or more times
    if (complaint.reopenCount >= 2) {
      complaint.status = 'ESCALATED';
      complaint.isEscalated = true;
      complaint.escalatedTo = 'Higher Authority (Principal & Grievance Review Committee)';
      complaint.escalatedAt = new Date();
      complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
        `⚠️ Multi-Reopen Escalation: Reopened ${complaint.reopenCount} times by student. Auto-escalated to Higher Authority.`;
    } else {
      complaint.status = 'REOPENED';
      complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
        '⚠️ Ticket reopened by student as issue remains unresolved.';
    }

    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error reopening complaint.', error: error.message });
  }
};

// ── Novelty 5: Student Confirm Resolution ─────────────────────────────────────
exports.confirmResolved = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { rating, comment } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Verify ownership
    if (String(complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Only resolved complaints can be confirmed.' });
    }

    // Save student verification feedback if rating is provided
    let feedback = null;
    if (rating && rating >= 1 && rating <= 5) {
      feedback = await Feedback.findOneAndUpdate(
        { complaintId },
        { rating, comment: comment || 'Student verified resolution: confirmed fixed.' },
        { upsert: true, new: true }
      );

      // Novelty 2 Integration: Update Officer's performance rating
      if (complaint.assignedOfficer && complaint.assignedOfficer.name) {
        const Officer = require('../models/Officer');
        const officer = await Officer.findOne({ name: complaint.assignedOfficer.name });
        if (officer) {
          officer.openTicketCount = Math.max(0, officer.openTicketCount - 1);
          officer.totalResolved += 1;
          officer.totalRatingSum += rating;
          officer.avgRating = parseFloat((officer.totalRatingSum / officer.totalResolved).toFixed(1));
          await officer.save();
        }
      }
    }

    complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
      '✅ Student verified resolution: Confirmed fixed.';
    await complaint.save();

    res.status(200).json({
      message: 'Resolution confirmed successfully! Thank you for verifying.',
      complaint,
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming resolution.', error: error.message });
  }
};

// ── Novelty 4: Department SLA Accountability Trail ─────────────────────────
exports.getDepartmentAccountability = async (req, res) => {
  try {
    const departments = [
      'Academic Department',
      'Hostel Administration',
      'Transport Department',
      'IT Department',
      'Maintenance Department',
      'Student Welfare / Anti-Ragging Committee',
      'Canteen & Hospitality',
      'General Administration'
    ];

    const allComplaints = await Complaint.find();

    const results = departments.map(dept => {
      const deptComplaints = allComplaints.filter(c => c.department === dept);
      const total = deptComplaints.length;
      const resolved = deptComplaints.filter(c => c.status === 'RESOLVED');
      const escalated = deptComplaints.filter(c => c.isEscalated);
      const active = deptComplaints.filter(c => !['RESOLVED'].includes(c.status));

      let onTimeCount = 0;
      let totalResolutionTimeMs = 0;

      resolved.forEach(c => {
        const resTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
        const createTime = new Date(c.createdAt).getTime();
        const duration = Math.max(0, resTime - createTime);
        totalResolutionTimeMs += duration;

        if (c.slaDeadline && resTime <= new Date(c.slaDeadline).getTime()) {
          onTimeCount++;
        } else if (!c.isEscalated) {
          onTimeCount++;
        }
      });

      const onTimeRate = resolved.length > 0 ? Math.round((onTimeCount / resolved.length) * 100) : 100;
      const avgResolutionHours = resolved.length > 0
        ? parseFloat((totalResolutionTimeMs / (resolved.length * 3600000)).toFixed(1))
        : 0;

      return {
        department: dept,
        totalTickets: total,
        activeTickets: active.length,
        resolvedTickets: resolved.length,
        onTimeResolved: onTimeCount,
        escalatedTickets: escalated.length,
        onTimeRate,
        avgResolutionHours
      };
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving department accountability.', error: error.message });
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
    const categories = ['Academic', 'Hostel', 'Transport', 'Infrastructure', 'Internet/Wi-Fi', 'Harassment', 'Ragging', 'Safety', 'Canteen Dish Issue', 'Other'];
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
      'Canteen & Hospitality',
      'General Administration'
    ];
    const departmentStats = {};
    for (const dept of departments) {
      departmentStats[dept] = await Complaint.countDocuments({ department: dept });
    }

    // Dish-level complaint breakdown for recurring problem dishes
    const dishAgg = await Complaint.aggregate([
      { $match: { category: 'Canteen Dish Issue', dishName: { $ne: '' } } },
      { $group: { _id: '$dishName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const dishStats = dishAgg.map(d => ({ dishName: d._id, count: d.count }));

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
      departmentStats,
      dishStats
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

exports.localAIAnalyze = localAIAnalyze;
