import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart2, PieChart, TrendingUp, Target, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

// ─── CSS-Only Horizontal Bar Chart ───────────────────────────────────────────
const BarChart = ({ data, colorFn }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ marginTop: '1rem' }}>
      {data.map((item) => (
        <div key={item.label} className="chart-bar-row">
          <span className="chart-bar-label">{item.label}</span>
          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: colorFn ? colorFn(item.label) : 'var(--accent-blue)'
              }}
            />
          </div>
          <span className="chart-bar-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── SVG Donut Ring Chart ─────────────────────────────────────────────────────
const RingChart = ({ segments, total, centerLabel }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="ring-chart-wrap">
      <div className="ring-chart">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
          {segments.map((seg, i) => {
            const dash = (seg.pct / 100) * circ;
            const el = (
              <circle
                key={i}
                cx="70" cy="70" r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="ring-chart-center">
          <span className="value">{total}</span>
          <span className="label">{centerLabel}</span>
        </div>
      </div>
      <div className="ring-legend">
        {segments.map((seg) => (
          <div key={seg.label} className="ring-legend-item">
            <div className="ring-legend-dot" style={{ background: seg.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text-primary)', paddingLeft: '1rem' }}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Analytics Page ──────────────────────────────────────────────────────
const AdminAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getAdminStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading Analytics...</div>
  );

  if (error) return (
    <div className="alert-box alert-error"><AlertTriangle size={18} /><span>{error}</span></div>
  );

  const { total, pending, underReview, inProgress, resolved, reopened, high, critical, categoryStats, departmentStats } = stats;
  const active = pending + underReview + inProgress + reopened;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Priority ring data
  const prioritySegments = [
    { label: 'Critical', value: critical, color: 'hsl(0,85%,55%)', pct: total > 0 ? (critical / total) * 100 : 0 },
    { label: 'High', value: high, color: 'hsl(25,95%,50%)', pct: total > 0 ? (high / total) * 100 : 0 },
    { label: 'Resolved', value: resolved, color: 'hsl(142,70%,45%)', pct: total > 0 ? (resolved / total) * 100 : 0 },
    { label: 'Active', value: active, color: 'hsl(217,91%,60%)', pct: total > 0 ? (active / total) * 100 : 0 },
  ];

  // Category bar chart data
  const categoryData = Object.entries(categoryStats)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const categoryColor = (label) => {
    const map = {
      'Harassment': 'hsl(0,85%,55%)',
      'Ragging': 'hsl(0,70%,50%)',
      'Safety': 'hsl(0,75%,60%)',
      'Academic': 'hsl(217,91%,60%)',
      'Hostel': 'hsl(45,90%,50%)',
      'Transport': 'hsl(190,95%,50%)',
      'Internet/Wi-Fi': 'hsl(270,85%,60%)',
      'Infrastructure': 'hsl(25,95%,50%)',
      'Other': 'hsl(215,15%,52%)',
    };
    return map[label] || 'var(--accent-blue)';
  };

  // Department bar data
  const departmentData = Object.entries(departmentStats)
    .map(([label, value]) => ({ label, value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Status bar data
  const statusData = [
    { label: 'Submitted', value: pending },
    { label: 'Under Review', value: underReview },
    { label: 'In Progress', value: inProgress },
    { label: 'Resolved', value: resolved },
    { label: 'Reopened', value: reopened },
  ];

  const statusColor = (label) => {
    const map = {
      'Submitted': 'hsl(210,100%,65%)',
      'Under Review': 'hsl(45,100%,60%)',
      'In Progress': 'hsl(280,100%,65%)',
      'Resolved': 'hsl(142,70%,45%)',
      'Reopened': 'hsl(0,85%,60%)',
    };
    return map[label] || 'var(--accent-blue)';
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart2 size={24} color="var(--accent-cyan)" /> Analytics & Insights
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Visual breakdown of campus grievance data for informed decision-making.
          </p>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="metric-card total">
          <div className="metric-icon-wrap"><BarChart2 size={20} /></div>
          <div className="metric-info"><h4>Total Filed</h4><div className="metric-value">{total}</div></div>
        </div>
        <div className="metric-card resolved">
          <div className="metric-icon-wrap"><CheckCircle2 size={20} /></div>
          <div className="metric-info"><h4>Resolved</h4><div className="metric-value">{resolved}</div></div>
        </div>
        <div className="metric-card pending">
          <div className="metric-icon-wrap"><Clock size={20} /></div>
          <div className="metric-info"><h4>Active</h4><div className="metric-value">{active}</div></div>
        </div>
        <div className="metric-card critical">
          <div className="metric-icon-wrap"><ShieldAlert size={20} /></div>
          <div className="metric-info"><h4>Critical</h4><div className="metric-value">{critical}</div></div>
        </div>
        {/* Resolution Rate Card */}
        <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-cyan)', background: 'rgba(0,200,220,0.04)' }}>
          <div className="metric-icon-wrap" style={{ color: 'var(--accent-cyan)' }}><Target size={20} /></div>
          <div className="metric-info">
            <h4>Resolution Rate</h4>
            <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>{resolutionRate}%</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        {[
          { id: 'overview', icon: <PieChart size={15} />, label: 'Overview' },
          { id: 'categories', icon: <BarChart2 size={15} />, label: 'Categories' },
          { id: 'departments', icon: <TrendingUp size={15} />, label: 'Departments' },
          { id: 'status', icon: <Target size={15} />, label: 'Status Flow' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="detail-layout">
          <div className="glass-card">
            <h3 style={{ marginBottom: '0.5rem' }}>Priority Distribution</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Breakdown of all complaints by AI-assigned priority level
            </p>
            <RingChart segments={prioritySegments} total={total} centerLabel="Total" />
          </div>
          <div className="glass-card">
            <h3 style={{ marginBottom: '0.5rem' }}>Resolution Progress</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Campus complaint resolution performance at a glance
            </p>

            {/* Big resolution rate display */}
            <div style={{ textAlign: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '3.5rem',
                fontFamily: 'var(--font-title)',
                fontWeight: 800,
                background: `linear-gradient(135deg, var(--status-resolved), var(--accent-cyan))`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {resolutionRate}%
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Resolution Rate</p>
              {/* Progress bar */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', height: '8px', margin: '1rem auto', maxWidth: '240px', overflow: 'hidden' }}>
                <div style={{
                  width: `${resolutionRate}%`,
                  height: '100%',
                  borderRadius: '6px',
                  background: 'linear-gradient(to right, var(--accent-blue), var(--status-resolved))',
                  transition: 'width 0.8s ease'
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Submitted', value: pending, color: 'var(--status-submitted)' },
                { label: 'Under Review', value: underReview, color: 'var(--status-review)' },
                { label: 'In Progress', value: inProgress, color: 'var(--status-progress)' },
                { label: 'Reopened', value: reopened, color: 'var(--status-reopened)' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem' }}>Complaints by Category</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Distribution of grievances across all campus issue categories
          </p>
          <BarChart data={categoryData} colorFn={categoryColor} />
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem' }}>Department Workload</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Number of complaints assigned to each department
          </p>
          {departmentData.length === 0 ? (
            <div className="empty-state"><p>No department data available.</p></div>
          ) : (
            <BarChart
              data={departmentData}
              colorFn={() => 'hsl(217,91%,60%)'}
            />
          )}
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(59,130,246,0.06)',
            borderRadius: '8px',
            border: '1px solid rgba(59,130,246,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <TrendingUp size={18} color="var(--accent-cyan)" />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent-cyan)' }}>Student Welfare / Anti-Ragging Committee</strong> handles all Safety, Harassment, and Ragging categories — these complaints should always be prioritized.
            </p>
          </div>
        </div>
      )}

      {/* Status Flow Tab */}
      {activeTab === 'status' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem' }}>Status Flow Distribution</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Current status of all grievances in the system
          </p>
          <BarChart data={statusData} colorFn={statusColor} />

          {/* Status pipeline visual */}
          <div style={{ marginTop: '2.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              Grievance Lifecycle Pipeline
            </h4>
            <div className="status-stepper" style={{ paddingBottom: '3rem', position: 'relative' }}>
              {[
                { label: 'Submitted', value: pending, state: 'completed' },
                { label: 'Under Review', value: underReview, state: 'completed' },
                { label: 'In Progress', value: inProgress, state: 'completed' },
                { label: 'Resolved', value: resolved, state: 'active' },
              ].map((step, idx, arr) => (
                <div key={step.label} className="step-item">
                  <div style={{ position: 'relative' }}>
                    <div className={`step-circle ${step.state}`}>
                      {idx + 1}
                    </div>
                    <span className={`step-label ${step.state}`}>{step.label}<br />
                      <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{step.value}</span>
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`step-line ${step.value > 0 ? 'completed' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
