const Officer = require('../models/Officer');
const Complaint = require('../models/Complaint');

// ── Novelty 2: Officer Performance-Weighted Auto-Assignment ─────────────────
// Algorithm: score = (10 - openTicketCount) + (avgRating × 2)
// Higher score → recommended first.

// GET /api/officers/recommend/:complaintId
exports.getRecommendedOfficers = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    const officers = await Officer.find({ department: complaint.department });

    if (officers.length === 0) {
      return res.status(200).json({ officers: [], message: 'No officers found for this department.' });
    }

    // Score each officer: score = (10 - openTickets) + (rating × 2)
    const scored = officers.map(o => ({
      _id: o._id,
      name: o.name,
      department: o.department,
      role: o.role,
      contact: o.contact,
      email: o.email,
      openTicketCount: o.openTicketCount,
      avgRating: o.avgRating,
      totalResolved: o.totalResolved,
      score: (10 - o.openTicketCount) + (o.avgRating * 2)
    }));

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    res.status(200).json({
      department: complaint.department,
      officers: scored,
      recommended: scored[0] || null
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching recommended officers.', error: err.message });
  }
};

// GET /api/officers — list all officers (admin)
exports.getAllOfficers = async (req, res) => {
  try {
    const officers = await Officer.find().sort({ department: 1, avgRating: -1 });
    res.status(200).json(officers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching officers.', error: err.message });
  }
};

// POST /api/officers — create new officer (admin)
exports.createOfficer = async (req, res) => {
  try {
    const { name, department, role, contact, email } = req.body;
    if (!name || !department) {
      return res.status(400).json({ message: 'Name and department are required.' });
    }
    const officer = new Officer({ name, department, role, contact, email });
    await officer.save();
    res.status(201).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error creating officer.', error: err.message });
  }
};

// PUT /api/officers/:id/increment-ticket — when officer is assigned a complaint
exports.incrementTicket = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });
    officer.openTicketCount = Math.max(0, officer.openTicketCount + 1);
    await officer.save();
    res.status(200).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error updating officer ticket count.', error: err.message });
  }
};

// PUT /api/officers/:id/resolve — decrement open tickets + update avg rating after resolution
exports.resolveTicket = async (req, res) => {
  try {
    const { rating } = req.body; // optional star rating from student feedback
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });

    officer.openTicketCount = Math.max(0, officer.openTicketCount - 1);
    officer.totalResolved += 1;

    if (rating && rating >= 1 && rating <= 5) {
      officer.totalRatingSum += rating;
      officer.avgRating = parseFloat((officer.totalRatingSum / officer.totalResolved).toFixed(1));
    }

    await officer.save();
    res.status(200).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error updating officer resolution.', error: err.message });
  }
};

// Seed demo officers for all departments
exports.seedDemoOfficers = async () => {
  try {
    const count = await Officer.countDocuments();
    if (count > 0) return; // Already seeded

    const demoOfficers = [
      // IT Department
      { name: 'Mr. Rajesh Kumar', department: 'IT Department', role: 'Network Administrator', contact: '+91 98765 43210', email: 'it.admin@scgrs.edu', openTicketCount: 2, avgRating: 4.5, totalResolved: 20, totalRatingSum: 90 },
      { name: 'Ms. Priya Suresh', department: 'IT Department', role: 'Systems Engineer', contact: '+91 97654 32109', email: 'it.engineer@scgrs.edu', openTicketCount: 5, avgRating: 3.8, totalResolved: 15, totalRatingSum: 57 },

      // Hostel Administration
      { name: 'Mr. Suresh Sharma', department: 'Hostel Administration', role: 'Hostel Caretaker', contact: '+91 98123 45678', email: 'hostel.admin@scgrs.edu', openTicketCount: 3, avgRating: 4.2, totalResolved: 30, totalRatingSum: 126 },
      { name: 'Ms. Kavitha Rajan', department: 'Hostel Administration', role: 'Hostel Warden', contact: '+91 99887 65432', email: 'hostel.warden@scgrs.edu', openTicketCount: 1, avgRating: 4.8, totalResolved: 25, totalRatingSum: 120 },

      // Maintenance Department
      { name: 'Mr. Ramesh Verma', department: 'Maintenance Department', role: 'Maintenance Supervisor', contact: '+91 97654 32109', email: 'maintenance@scgrs.edu', openTicketCount: 4, avgRating: 3.9, totalResolved: 40, totalRatingSum: 156 },
      { name: 'Mr. Arun Babu', department: 'Maintenance Department', role: 'Electrical Technician', contact: '+91 96543 21098', email: 'electrical@scgrs.edu', openTicketCount: 2, avgRating: 4.3, totalResolved: 18, totalRatingSum: 77 },

      // Student Welfare / Anti-Ragging Committee
      { name: 'Dr. Ananya Sen', department: 'Student Welfare / Anti-Ragging Committee', role: 'Student Welfare Officer', contact: '+91 94321 87654', email: 'welfare@scgrs.edu', openTicketCount: 1, avgRating: 4.9, totalResolved: 12, totalRatingSum: 59 },
      { name: 'Prof. V. K. Malhotra', department: 'Student Welfare / Anti-Ragging Committee', role: 'Principal & Anti-Ragging Chair', contact: '+91 91111 22222', email: 'principal@scgrs.edu', openTicketCount: 0, avgRating: 5.0, totalResolved: 8, totalRatingSum: 40 },

      // Academic Department
      { name: 'Dr. S. Ramachandran', department: 'Academic Department', role: 'Head of Academic Affairs', contact: '+91 98431 11111', email: 'academic.head@scgrs.edu', openTicketCount: 2, avgRating: 4.4, totalResolved: 22, totalRatingSum: 97 },

      // Transport Department
      { name: 'Mr. Dinesh Pillai', department: 'Transport Department', role: 'Transport Coordinator', contact: '+91 95432 10987', email: 'transport@scgrs.edu', openTicketCount: 3, avgRating: 3.7, totalResolved: 14, totalRatingSum: 52 },

      // Canteen & Hospitality
      { name: 'Mr. Anand Subramaniam', department: 'Canteen & Hospitality', role: 'Canteen Inspector', contact: '+91 94421 88765', email: 'canteen@scgrs.edu', openTicketCount: 2, avgRating: 4.1, totalResolved: 19, totalRatingSum: 78 },

      // General Administration
      { name: 'Ms. Deepa Krishnan', department: 'General Administration', role: 'Administrative Officer', contact: '+91 98431 56789', email: 'admin@scgrs.edu', openTicketCount: 1, avgRating: 4.6, totalResolved: 35, totalRatingSum: 161 },
    ];

    await Officer.insertMany(demoOfficers);
    console.log(`${demoOfficers.length} demo officers seeded successfully.`);
  } catch (err) {
    console.error('Error seeding demo officers:', err.message);
  }
};
