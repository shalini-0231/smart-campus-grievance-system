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

  updateDepartment: async (id, department) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/department`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ department })
    });
    return handleResponse(res);
  },

  // Feedback & Reopen
  submitFeedback: async (id, rating, comment) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}/feedback`, {
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
  analyzeText: async (text) => {
    const res = await fetch(`${BASE_URL}/complaints/ai/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  }
};
