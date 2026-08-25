import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw, Eye, Layers, Search, BarChart2 } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadData = async (showToast = false) => {
    setLoading(true);
    try {
      const [statsData, complaintsData] = await Promise.all([
        api.getAdminStats(),
        api.getComplaints({ priority, category, department, status })
      ]);
      setStats(statsData);
      setComplaints(complaintsData);
      if (showToast) addToast('Dashboard refreshed successfully', 'success');
    } catch (err) {
      setError('Failed to retrieve administrator dashboard data.');
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [priority, category, department, status]);

  // Client-side live search filter on title, complaintId, student name
  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) return complaints;
    const q = searchQuery.toLowerCase();
    return complaints.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.complaintId?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      (c.studentId?.name && c.studentId.name.toLowerCase().includes(q))
    );
  }, [complaints, searchQuery]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const getPriorityBadgeClass = (p) => `badge badge-priority-${p.toLowerCase()}`;
  const getStatusBadgeClass = (s) => `badge badge-status-${s.toLowerCase().replace(/ /g, '_')}`;

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <h3>Loading Administration Panel...</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2>Campus Grievance Administration Panel</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Campus-wide oversight, AI grading reviews, and department loading.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/admin/analytics')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart2 size={16} /> Analytics
          </button>
          <button className="btn btn-outline" onClick={() => loadData(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error"><AlertTriangle size={18} /><span>{error}</span></div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card total">
            <div className="metric-icon-wrap"><ClipboardList size={22} /></div>
            <div className="metric-info"><h4>Total Submissions</h4><div className="metric-value">{stats.total}</div></div>
          </div>
          <div className="metric-card pending">
            <div className="metric-icon-wrap"><Clock size={22} /></div>
            <div className="metric-info"><h4>Active Actions</h4><div className="metric-value">{stats.pending + stats.underReview + stats.inProgress + stats.reopened}</div></div>
          </div>
          <div className="metric-card resolved">
            <div className="metric-icon-wrap"><CheckCircle2 size={22} /></div>
            <div className="metric-info"><h4>Resolved Cases</h4><div className="metric-value">{stats.resolved}</div></div>
          </div>
          <div className="metric-card critical">
            <div className="metric-icon-wrap"><ShieldAlert size={22} /></div>
            <div className="metric-info"><h4>Critical & High</h4><div className="metric-value">{stats.critical + stats.high}</div></div>
          </div>
        </div>
      )}

      {/* Filter Bar with live search */}
      <div className="filter-bar">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filters:</span>

        {/* Live Search */}
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by title, ID, or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER REVIEW">UNDER REVIEW</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="REOPENED">REOPENED</option>
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {['Academic','Hostel','Transport','Infrastructure','Internet/Wi-Fi','Harassment','Ragging','Safety','Other'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {['Academic Department','Hostel Administration','Transport Department','IT Department','Maintenance Department','Student Welfare / Anti-Ragging Committee','General Administration'].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {searchQuery && (
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            {filteredComplaints.length} result{filteredComplaints.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Main layout: Table left, Department stats right */}
      <div className="detail-layout">
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            Active Grievance Log ({filteredComplaints.length})
          </h3>

          {filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <ClipboardList className="empty-state-icon" size={48} />
              <p>{searchQuery ? `No results for "${searchQuery}"` : 'No complaints match the specified filters.'}</p>
            </div>
          ) : (
            <div className="table-container" style={{ marginTop: '0.5rem' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Student</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Department</th>
                    <th>Responsible Officer</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((c) => {
                    const isCritical = ['CRITICAL', 'HIGH'].includes(c.priority);
                    return (
                      <tr 
                        key={c._id}
                        style={isCritical ? {
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderLeft: '4px solid var(--priority-critical)'
                        } : {}}
                      >
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>
                          {c.complaintId}
                        </td>
                        <td>
                          {c.studentId ? c.studentId.name : 'Unknown'}
                          {c.anonymous && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--priority-medium)' }}>🔒 Anonymous</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {c.title.length > 28 ? c.title.substring(0, 28) + '…' : c.title}
                        </td>
                        <td><span className={getPriorityBadgeClass(c.priority)}>{c.priority}</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{c.department}</td>
                        <td style={{ fontSize: '0.8rem', color: c.assignedOfficer?.name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {c.assignedOfficer?.name ? (
                            <span>👤 {c.assignedOfficer.name} <small style={{ display: 'block', color: 'var(--accent-cyan)', fontSize: '0.7rem' }}>{c.assignedOfficer.role}</small></span>
                          ) : (
                            <span style={{ fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{formatDate(c.createdAt)}</td>
                        <td>
                          <button
                            className="btn btn-blue"
                            onClick={() => navigate(`/complaints/${c._id}`)}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Eye size={14} /> Process
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Department Load sidebar */}
        {stats && (
          <div className="detail-sidebar">
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Layers size={18} color="var(--accent-cyan)" /> Department Load
              </h3>
              {Object.entries(stats.departmentStats).map(([dept, count]) => (
                <div key={dept} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{dept}</span>
                  <span style={{
                    background: count > 0 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                    color: count > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600
                  }}>{count}</span>
                </div>
              ))}

              <button
                className="btn btn-outline"
                onClick={() => navigate('/admin/analytics')}
                style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}
              >
                <BarChart2 size={15} /> View Full Analytics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
