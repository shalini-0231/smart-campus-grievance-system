import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClipboardList, PlusCircle, CheckCircle2, AlertTriangle, Clock, Eye, ShieldAlert } from 'lucide-react';

const StudentDashboard = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, critical: 0 });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await api.getStudentStats();
        setStats(statsData);
        
        const complaintsData = await api.getComplaints();
        setComplaints(complaintsData);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityBadgeClass = (priority) => {
    return `badge badge-priority-${priority.toLowerCase()}`;
  };

  const getStatusBadgeClass = (status) => {
    // Replace spaces with underscores for styling names
    const formatted = status.toLowerCase().replace(' ', '_');
    return `badge badge-status-${formatted}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <h3>Loading Student Dashboard...</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2>Student Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Welcome to the SCGRS Portal. Monitor your grievances and submit new claims.</p>
        </div>
        <button className="btn btn-blue" onClick={() => navigate('/student/submit')}>
          <PlusCircle size={18} /> Submit Complaint
        </button>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card total">
          <div className="metric-icon-wrap">
            <ClipboardList size={22} />
          </div>
          <div className="metric-info">
            <h4>Total Filed</h4>
            <div className="metric-value">{stats.total}</div>
          </div>
        </div>

        <div className="metric-card pending">
          <div className="metric-icon-wrap">
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <h4>Pending Action</h4>
            <div className="metric-value">{stats.pending}</div>
          </div>
        </div>

        <div className="metric-card resolved">
          <div className="metric-icon-wrap">
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <h4>Resolved Cases</h4>
            <div className="metric-value">{stats.resolved}</div>
          </div>
        </div>

        <div className="metric-card critical">
          <div className="metric-icon-wrap">
            <ShieldAlert size={22} />
          </div>
          <div className="metric-info">
            <h4>Active Critical</h4>
            <div className="metric-value">{stats.critical}</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem' }}>My Grievance Submissions</h3>
        
        {complaints.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="empty-state-icon" size={48} />
            <p>You have not submitted any complaints yet.</p>
            <button 
              className="btn btn-outline" 
              onClick={() => navigate('/student/submit')}
              style={{ marginTop: '1rem' }}
            >
              File Your First Complaint
            </button>
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
                  <th>Assigned Department</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {c.complaintId}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {c.title}
                      {c.anonymous && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Anonymous)</span>}
                    </td>
                    <td>{c.category}</td>
                    <td>
                      <span className={getPriorityBadgeClass(c.priority)}>{c.priority}</span>
                    </td>
                    <td>{c.department}</td>
                    <td>
                      <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                    </td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => navigate(`/complaints/${c._id}`)}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye size={14} /> View
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

export default StudentDashboard;
