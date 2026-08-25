import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Send, AlertTriangle, ArrowLeft, Brain, Sparkles } from 'lucide-react';

const categories = [
  'Academic',
  'Hostel',
  'Transport',
  'Infrastructure',
  'Internet/Wi-Fi',
  'Harassment',
  'Ragging',
  'Safety',
  'Other'
];

const getTargetDepartment = (cat) => {
  switch (cat) {
    case 'Academic': return 'Academic Department';
    case 'Hostel': return 'Hostel Administration';
    case 'Transport': return 'Transport Department';
    case 'Internet/Wi-Fi': return 'IT Department';
    case 'Infrastructure': return 'Maintenance Department';
    case 'Harassment':
    case 'Ragging':
    case 'Safety': return 'Student Welfare / Anti-Ragging Committee';
    default: return 'General Administration';
  }
};

const SubmitComplaint = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Academic');
  const [locationName, setLocationName] = useState('');
  const [attachment, setAttachment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  // AI live preview state
  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Trigger AI preview when description changes (debounced or on blur)
  const triggerAIAnalysis = async () => {
    if (description.trim().length < 10) {
      setAiPreview(null);
      return;
    }
    
    setAiLoading(true);
    try {
      const result = await api.analyzeText(description);
      setAiPreview(result);
    } catch (err) {
      console.warn('AI analysis error on preview:', err.message);
      // Fail silently for preview
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.createComplaint({ 
        title, 
        description, 
        category, 
        location: locationName || 'Campus Premises', 
        attachment, 
        anonymous 
      });
      addToast(`Complaint ${result.complaintId} submitted successfully!`, 'success');
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to submit grievance.');
      addToast('Submission failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    return `badge badge-priority-${priority.toLowerCase()}`;
  };

  const getSentimentBadgeClass = (sentiment) => {
    return `badge badge-sentiment-${sentiment.toLowerCase()}`;
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/student/dashboard')}
          style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      <div className="dashboard-header">
        <div>
          <h2>Submit Campus Grievance</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fill in details. Our AI engine will automatically evaluate priority and route to the correct committee.</p>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="detail-layout">
        {/* Form Column */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Grievance Form
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Complaint Title</label>
              <input
                type="text"
                id="title"
                className="form-control"
                placeholder="Brief summary of the issue (e.g. Wi-Fi down, water leakage)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location / Building / Room No.</label>
              <input
                type="text"
                id="location"
                className="form-control"
                placeholder="e.g. Hostel Block A, Room 302 / Academic Block 1"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="attachment">Optional Attachment (Image / Document Link or File Name)</label>
              <input
                type="text"
                id="attachment"
                className="form-control"
                placeholder="e.g. error_screenshot.png or photo_evidence.jpg"
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Detailed Description</label>
              <textarea
                id="description"
                className="form-control"
                rows="6"
                placeholder="Explain the grievance in detail. Be specific. Urgency words (like repeated, water, internet, ragging, safety) and sentiment indicators will affect AI severity grading."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={triggerAIAnalysis}
                required
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Tip: Press outside the text area to trigger live AI preview.
              </p>
            </div>

            <div className="form-group">
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                <span>Submit Grievance Anonymously</span>
              </label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '1.6rem', marginTop: '0.1rem' }}>
                If checked, your name and email will be hidden on administration portals.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-blue" 
              style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} 
              disabled={loading}
            >
              <Send size={18} />
              {loading ? 'Submitting...' : 'Submit Grievance'}
            </button>
          </form>
        </div>

        {/* AI Preview Column */}
        <div className="detail-sidebar">
          <div className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.25)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--accent-cyan)' }}>
              <Sparkles size={18} />
            </div>

            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Brain size={18} color="var(--accent-cyan)" /> Live AI Assessment
            </h3>

            {aiLoading ? (
              <div style={{ padding: '2rem 0', textSelf: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>Analyzing complaint text...</p>
              </div>
            ) : aiPreview ? (
              <div>
                <div className="detail-meta-item">
                  <div className="detail-meta-label">Calculated Priority</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.25rem' }}>
                    <span className={getPriorityBadgeClass(aiPreview.priority)}>{aiPreview.priority}</span>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <div className="detail-meta-label">Urgency Score</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Severity weight:</span>
                      <span>{(aiPreview.score * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${aiPreview.score * 100}%`, 
                          height: '100%', 
                          background: `linear-gradient(to right, var(--accent-blue), var(--priority-${aiPreview.priority.toLowerCase()}))`,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <div className="detail-meta-label">Sentiment Polarized</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.25rem' }}>
                    <span className={getSentimentBadgeClass(aiPreview.sentiment)}>{aiPreview.sentiment}</span>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <div className="detail-meta-label">Automatic Department Routing</div>
                  <div className="detail-meta-val" style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', marginTop: '0.15rem' }}>
                    {getTargetDepartment(category)}
                  </div>
                </div>

                <div className="detail-meta-item" style={{ borderStyle: 'dashed' }}>
                  <div className="detail-meta-label">AI Logic Explanation</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                    {aiPreview.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Brain size={36} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Type details in description and click outside to see live AI priority scoring & department routing.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
