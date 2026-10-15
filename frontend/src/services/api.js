const BASE_URL = 'http://127.0.0.1:5001/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const rawText = await response.text();
    const cleanMsg = rawText.includes('<!DOCTYPE') || rawText.includes('<html')
      ? 'Server route error. Please verify server status.'
      : rawText;
    data = { message: cleanMsg };
  }

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Auth endpoints
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  register: async (name, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'student' })
    });
    return handleResponse(res);
  },

  getCurrentUser: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Complaint endpoints
  createComplaint: async (complaintData) => {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(complaintData)
    });
    return handleResponse(res);
  },

  getComplaints: async (queryParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val) query.append(key, val);
    });
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/complaints${queryString}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getComplaintById: async (id) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Admin updates
  updateStatus: async (id, status, adminRemarks, resolutionRemarks, assignedOfficer) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, adminRemarks, resolutionRemarks, assignedOfficer })
    });
    return handleResponse(res);
  },

  assignOfficer: async (id, officerData) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/assign`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(officerData)
    });
    return handleResponse(res);
  },

  notifyOfficer: async (id) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/notify-officer`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  updateDepartment: async (id, department) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/department`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ department })
    });
    return handleResponse(res);
  },

  // Feedback, Verification & Reopen (Novelty 5)
  submitFeedback: async (id, rating, comment) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/feedback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rating, comment })
    });
    return handleResponse(res);
  },

  confirmResolved: async (id, rating, comment) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/confirm-resolved`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rating, comment })
    });
    return handleResponse(res);
  },

  reopenComplaint: async (id) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/reopen`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Novelty 2: Officer Auto-Assignment Recommendations
  getRecommendedOfficers: async (complaintId) => {
    const res = await fetch(`${BASE_URL}/officers/recommend/${complaintId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getAllOfficers: async () => {
    const res = await fetch(`${BASE_URL}/officers`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Novelty 4: SLA Department Accountability Trail
  getAccountability: async () => {
    const res = await fetch(`${BASE_URL}/complaints/accountability`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Dashboard Stats
  getAdminStats: async () => {
    const res = await fetch(`${BASE_URL}/admin/statistics`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getStudentStats: async () => {
    const res = await fetch(`${BASE_URL}/complaints/student/stats`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // direct AI test analysis
  analyzeText: async (text, eventDate, issueType) => {
    const res = await fetch(`${BASE_URL}/complaints/ai/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, eventDate, issueType })
    });
    return handleResponse(res);
  },

  // Guided Chatbot question engine with local fallback
  getNextQuestion: async (text, category, step) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/ai/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, step })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Flask next-question endpoint offline, using local fallback:', e.message);
    }
    return api.getLocalNextQuestion(text, category, step);
  },

  getLocalNextQuestion: (text, category, step) => {
    const clean = (text || '').toLowerCase();
    let cat = category;
    if (!cat) {
      if (clean.includes('canteen') || clean.includes('food') || clean.includes('mess') || clean.includes('dish')) cat = 'Canteen Dish Issue';
      else if (clean.includes('wifi') || clean.includes('internet') || clean.includes('net')) cat = 'Internet/Wi-Fi';
      else cat = 'General Administration';
    }

    if (step === 1) {
      if (cat === 'Canteen Dish Issue') return { category: cat, prompt: "Which canteen or mess location did this occur in?", fieldTarget: "canteenLocation", quickReplies: ["Block A Canteen", "Hostel Boys Mess", "Central Food Court"] };
      return { category: cat, prompt: "Which campus location did this occur in?", fieldTarget: "location", quickReplies: ["Academic Block 1", "Library", "Hostel Block A"] };
    } else if (step === 2) {
      if (cat === 'Canteen Dish Issue') return { category: cat, prompt: "What was the dish name and issue type?", fieldTarget: "dishName", quickReplies: ["Chicken Biryani", "Special Thali", "Tea / Snacks"] };
      return { category: cat, prompt: "Would you like to submit anonymously?", fieldTarget: "anonymous", quickReplies: ["Yes, keep me anonymous 🔒", "No, include my name 👤"] };
    } else {
      return { category: cat, prompt: "Would you like to submit anonymously?", fieldTarget: "anonymous", quickReplies: ["Yes, keep me anonymous 🔒", "No, include my name 👤"] };
    }
  },

  // Site-wide AI Chatbot Assistant query with local fallback
  chatWithAI: async (message, role, context) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, role, context })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Flask AI chat endpoint offline, using local fallback:', e.message);
    }
    return api.getLocalChatResponse(message, role);
  },

  getLocalChatResponse: (message, role) => {
    const clean = (message || '').toLowerCase();
    if (clean.includes('ragging') || clean.includes('harass') || clean.includes('helpline')) {
      return { answer: "🛡️ Anti-Ragging & Harassment Helpline:\n- 📞 National Helpline: 1800-180-5522 (Toll Free)\n- 📱 Campus Desk: Ext 108 / +91-9876543210\n- 🔒 Zero Tolerance: Submit 100% anonymously with guaranteed privacy.", action: "NAVIGATE_SUBMIT", quickReplies: ["File Anonymous Complaint"] };
    }
    if (clean.includes('sla') || clean.includes('escalat') || clean.includes('timeframe')) {
      return { answer: "⚡ Automatic SLA & Escalation Timeframes:\n• 🚨 CRITICAL: 24 Hours SLA (Escalates to Director)\n• 🔴 HIGH: 48 Hours SLA (Escalates to HOD)\n• 🟡 MEDIUM: 72 Hours SLA\n• 🟢 LOW: 120 Hours SLA", action: "OPEN_TRACKER", quickReplies: ["Track active complaints"] };
    }
    if (clean.includes('canteen') || clean.includes('food') || clean.includes('mess') || clean.includes('hygiene')) {
      return { answer: "🍲 Canteen & Food Safety: Foreign objects or hygiene issues trigger an automatic CRITICAL/HIGH priority AI override and route directly to Canteen & Hospitality.", action: "NAVIGATE_SUBMIT", quickReplies: ["Report Food Hygiene", "Report Foreign Object"] };
    }
    if (clean.includes('submit') || clean.includes('file') || clean.includes('new')) {
      return { answer: "You can file a new complaint anytime. Click below to open the submission page!", action: "NAVIGATE_SUBMIT", quickReplies: ["File Canteen Issue", "File New Complaint"] };
    }
    return { answer: `I analyzed your message regarding '${message}'. SCGRS provides automated SLA tracking, priority scoring, and department routing across campus.`, action: "NONE", quickReplies: ["File a Complaint", "Check SLA Rules"] };
  }
};
