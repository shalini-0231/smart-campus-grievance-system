const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken, isStudent, isAdmin } = require('../middleware/auth');
const axios = require('axios');

// IMPORTANT: Static/named routes must be defined BEFORE wildcard /:id routes
// Otherwise Express matches 'ai' or 'student' as a complaint ID.

// Student stats (must come before /:id routes)
router.get('/student/stats', verifyToken, isStudent, complaintController.getStudentStatistics);

// AI text analysis proxy (must come before /:id routes)
router.post('/ai/analyze', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required.' });
    }

    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/analyze`,
        { text },
        { timeout: 4000 }
      );
      return res.status(200).json(aiResponse.data);
    } catch (aiError) {
      console.warn('AI Service is offline, running local fallback analysis.', aiError.message);

      // Local JS fallback (mirrors priority_engine.py logic)
      const lowercaseText = text.toLowerCase();

      const criticalWords = ["harassment", "ragging", "threat", "violence", "safety", "assault", "emergency", "bully", "abuse", "suicidal", "afraid", "scared"];
      const highWords = ["exam issue", "academic emergency", "repeated complaint", "fees", "hall ticket", "grade", "results", "leaking", "flood", "broken door"];
      const mediumWords = ["repeated", "internet problem", "water problem", "hostel issue", "transport delay", "wifi", "wi-fi", "speed", "mess", "canteen", "bus", "network"];
      const lowWords = ["fan", "light", "minor", "suggestion", "classroom equipment", "bulb", "switch", "cleanliness"];

      let priority = "LOW";
      let score = 0.20;
      let matchedWord = null;

      for (const word of criticalWords) {
        if (lowercaseText.includes(word)) { priority = "CRITICAL"; score = 0.85; matchedWord = word; break; }
      }
      if (priority === "LOW") {
        for (const word of highWords) {
          if (lowercaseText.includes(word)) { priority = "HIGH"; score = 0.65; matchedWord = word; break; }
        }
      }
      if (priority === "LOW") {
        for (const word of mediumWords) {
          if (lowercaseText.includes(word)) { priority = "MEDIUM"; score = 0.45; matchedWord = word; break; }
        }
      }
      if (priority === "LOW") {
        for (const word of lowWords) {
          if (lowercaseText.includes(word)) { priority = "LOW"; score = 0.25; matchedWord = word; break; }
        }
      }

      const negWords = ["not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated"];
      const negCount = negWords.filter(w => lowercaseText.includes(w)).length;
      const sentiment = negCount > 0 ? "NEGATIVE" : "NEUTRAL";
      if (sentiment === "NEGATIVE") score = Math.min(0.99, score + 0.10);

      // Reclassify after sentiment adjustment
      if (score >= 0.80) priority = "CRITICAL";
      else if (score >= 0.60) priority = "HIGH";
      else if (score >= 0.40) priority = "MEDIUM";

      const reason = matchedWord
        ? `Urgency keyword '${matchedWord}' detected. ${sentiment === "NEGATIVE" ? "Negative sentiment identified." : ""} (Fallback Mode - AI Service offline)`
        : `General context detected. ${sentiment === "NEGATIVE" ? "Negative sentiment identified." : ""} (Fallback Mode - AI Service offline)`;

      return res.status(200).json({ priority, score: Math.round(score * 100) / 100, sentiment, reason });
    }
  } catch (error) {
    res.status(500).json({ message: 'AI Analysis proxy failed.', error: error.message });
  }
});

// Root complaint routes
router.post('/', verifyToken, isStudent, complaintController.createComplaint);
router.get('/', verifyToken, complaintController.getComplaints);

// Wildcard /:id routes — must be LAST
router.get('/:id', verifyToken, complaintController.getComplaintById);
router.post('/:id/feedback', verifyToken, isStudent, complaintController.submitFeedback);
router.post('/:id/reopen', verifyToken, isStudent, complaintController.reopenComplaint);
router.put('/:id/status', verifyToken, isAdmin, complaintController.updateStatus);
router.put('/:id/department', verifyToken, isAdmin, complaintController.updateDepartment);
router.put('/:id/assign', verifyToken, isAdmin, complaintController.assignOfficer);

module.exports = router;
