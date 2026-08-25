import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClipboardList, PlusCircle, AlertTriangle, Eye, RefreshCw } from 'lucide-react';

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const navigate = useNavigate();

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (err) {
      setError('Failed to load complaints.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const getPriorityBadgeClass = (priority) => {
    return `badge badge-priority-${priority.toLowerCase()}`;
  };

  const getStatusBadgeClass = (status) => {
    const formatted = status.toLowerCase().replace(' ', '_');
    return `badge badge-status-${formatted}`;
  };

  const filteredComplaints = complaints.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  if (loading && complaints.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <h3>Loading Grievances...</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2>My Filed Grievances</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review progress, update remarks, or reopen cases.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchComplaints} style={{ padding: '0.6rem' }}>
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-blue" onClick={() => navigate('/student/submit')}>
            <PlusCircle size={16} /> New Grievance
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER REVIEW">UNDER REVIEW</option>
          <option value="IN PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="REOPENED">REOPENED</option>
        </select>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-card">
        {filteredComplaints.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="empty-state-icon" size={48} />
            <p>{statusFilter ? 'No complaints match the selected filter.' : 'You have not submitted any complaints yet.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>{c.complaintId}</td>
                    <td style={{ fontWeight: 500 }}>{c.title}</td>
                    <td>{c.category}</td>
                    <td>
                      <span className={getPriorityBadgeClass(c.priority)}>{c.priority}</span>
                    </td>
                    <td>{c.department}</td>
                    <td>
                      <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => navigate(`/complaints/${c._id}`)}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyComplaints;
