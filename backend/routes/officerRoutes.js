const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officerController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ── Novelty 2: Officer Auto-Assignment Routes ──────────────────────────────
// GET /api/officers/recommend/:complaintId — get ranked recommended officers for a complaint
router.get('/recommend/:complaintId', verifyToken, isAdmin, officerController.getRecommendedOfficers);

// GET /api/officers — list all officers
router.get('/', verifyToken, isAdmin, officerController.getAllOfficers);

// POST /api/officers — create new officer
router.post('/', verifyToken, isAdmin, officerController.createOfficer);

// PUT /api/officers/:id/increment-ticket — update ticket count
router.put('/:id/increment-ticket', verifyToken, isAdmin, officerController.incrementTicket);

// PUT /api/officers/:id/resolve — resolve ticket & update rating
router.put('/:id/resolve', verifyToken, officerController.resolveTicket);

module.exports = router;
