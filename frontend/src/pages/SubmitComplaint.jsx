import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Send, AlertTriangle, ArrowLeft, Brain, Sparkles, FileText, CheckCircle2, ShieldCheck, Presentation } from 'lucide-react';

const categories = [
  'Academic',
  'Hostel',
  'Transport',
  'Infrastructure',
  'Internet/Wi-Fi',
  'Harassment',
  'Ragging',
  'Safety',
  'OD Form Issue',
  'Canteen Dish Issue',
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
    case 'OD Form Issue': return 'Academic Office / OD Cell';
    case 'Canteen Dish Issue': return 'Canteen & Hospitality';
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
  
  // OD Specific State
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [facultyInChargeName, setFacultyInChargeName] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [classCounsellorName, setClassCounsellorName] = useState('');
  const [hodName, setHodName] = useState('');
  const [pendingApprovalFrom, setPendingApprovalFrom] = useState('MENTOR');
  const [odFormStatus, setOdFormStatus] = useState('PENDING_APPROVAL');
  const [verificationProof, setVerificationProof] = useState('');
  const [eventReturnStatus, setEventReturnStatus] = useState('NOT_RETURNED');
  const [presentationRemarks, setPresentationRemarks] = useState('');

  // Canteen Dish Issue Specific State
  const [canteenLocation, setCanteenLocation] = useState('Block A Canteen');
  const [dishName, setDishName] = useState('');
  const [issueType, setIssueType] = useState('QUALITY');
  const [mealTime, setMealTime] = useState('Lunch');
  const [dishPhoto, setDishPhoto] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('quick'); // 'quick' | 'guided'
  const navigate = useNavigate();
  const { addToast } = useToast();

  const updateFormData = (fields) => {
    if (fields.title !== undefined) setTitle(fields.title);
    if (fields.description !== undefined) setDescription(fields.description);
    if (fields.category !== undefined) setCategory(fields.category);
    if (fields.locationName !== undefined) setLocationName(fields.locationName);
    if (fields.attachment !== undefined) setAttachment(fields.attachment);
    if (fields.anonymous !== undefined) setAnonymous(fields.anonymous);
    if (fields.canteenLocation !== undefined) setCanteenLocation(fields.canteenLocation);
    if (fields.dishName !== undefined) setDishName(fields.dishName);
    if (fields.issueType !== undefined) setIssueType(fields.issueType);
    if (fields.mealTime !== undefined) setMealTime(fields.mealTime);
    if (fields.dishPhoto !== undefined) setDishPhoto(fields.dishPhoto);
    if (fields.eventName !== undefined) setEventName(fields.eventName);
    if (fields.eventDate !== undefined) setEventDate(fields.eventDate);
    if (fields.facultyInChargeName !== undefined) setFacultyInChargeName(fields.facultyInChargeName);
    if (fields.pendingApprovalFrom !== undefined) setPendingApprovalFrom(fields.pendingApprovalFrom);
    if (fields.odFormStatus !== undefined) setOdFormStatus(fields.odFormStatus);
  };

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
      const result = await api.analyzeText(
        description, 
        category === 'OD Form Issue' ? eventDate : undefined,
        category === 'Canteen Dish Issue' ? issueType : undefined
      );
      setAiPreview(result);
    } catch (err) {
      console.warn('AI analysis error on preview:', err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = { 
        title, 
        description, 
        category, 
        location: locationName || 'Campus Premises', 
        attachment, 
        anonymous 
      };

      if (category === 'OD Form Issue') {
        payload.eventName = eventName;
        payload.eventDate = eventDate;
        payload.facultyInChargeName = facultyInChargeName;
        payload.mentorName = mentorName;
        payload.classCounsellorName = classCounsellorName;
        payload.hodName = hodName;
        payload.pendingApprovalFrom = pendingApprovalFrom;
        payload.odFormStatus = odFormStatus;
        payload.verificationProof = verificationProof;
        payload.eventReturnStatus = eventReturnStatus;
        payload.presentationRemarks = presentationRemarks;
      }

      if (category === 'Canteen Dish Issue') {
        payload.canteenLocation = canteenLocation;
        payload.dishName = dishName;
        payload.issueType = issueType;
        payload.mealTime = mealTime;
        payload.dishPhoto = dishPhoto;
      }

      const result = await api.createComplaint(payload);
      addToast(`Grievance ${result.complaintId} submitted successfully!`, 'success');
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
                placeholder="Brief summary of the issue (e.g. Wi-Fi down, OD form signature pending)"
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

            {/* OD Form Specific Fields */}
            {category === 'OD Form Issue' && (
              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(6, 182, 212, 0.04)', 
                border: '1px solid rgba(6, 182, 212, 0.3)', 
                borderRadius: '8px', 
                marginBottom: '1.5rem' 
              }}>
                <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <FileText size={18} /> On-Duty (OD) Details & Signature Workflow
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Event / Competition Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. National Technical Symposium / Inter-College Sports"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required={category === 'OD Form Issue'}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Event Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={eventDate}
                      onChange={(e) => {
                        setEventDate(e.target.value);
                        if (description.length >= 10) triggerAIAnalysis();
                      }}
                      required={category === 'OD Form Issue'}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Faculty In-Charge / Coordinator</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Prof. Arunkumar"
                      value={facultyInChargeName}
                      onChange={(e) => setFacultyInChargeName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Current OD Form Status</label>
                    <select
                      className="form-control"
                      value={odFormStatus}
                      onChange={(e) => setOdFormStatus(e.target.value)}
                    >
                      <option value="NOT_SUBMITTED">Not Submitted Yet</option>
                      <option value="PENDING_APPROVAL">Pending Approval / Signatures</option>
                      <option value="REJECTED">Rejected by Faculty</option>
                      <option value="APPROVED_NOT_UPDATED">Approved but Not Updated in Attendance</option>
                    </select>
                  </div>
                </div>

                {/* Multi-Stage Signature Tracking */}
                <div style={{ marginTop: '0.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block' }}>
                    Where is the Signature / Approval Currently Stuck?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    {[
                      { id: 'MENTOR', label: '1. Mentor Sign' },
                      { id: 'CLASS_COUNSELLOR', label: '2. Class Counsellor' },
                      { id: 'HOD', label: '3. HOD Approval' },
                      { id: 'ACADEMIC_CELL', label: '4. Academic Cell' }
                    ].map((stage) => (
                      <label key={stage.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.3rem', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer',
                        padding: '0.4rem',
                        background: pendingApprovalFrom === stage.id ? 'rgba(6,182,212,0.15)' : 'transparent',
                        border: `1px solid ${pendingApprovalFrom === stage.id ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                        borderRadius: '4px'
                      }}>
                        <input
                          type="radio"
                          name="pendingApprovalFrom"
                          value={stage.id}
                          checked={pendingApprovalFrom === stage.id}
                          onChange={(e) => setPendingApprovalFrom(e.target.value)}
                        />
                        <span>{stage.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Approvers Names */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Mentor Name</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8rem' }}
                      placeholder="Mentor name"
                      value={mentorName}
                      onChange={(e) => setMentorName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Class Counsellor Name</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8rem' }}
                      placeholder="Counsellor name"
                      value={classCounsellorName}
                      onChange={(e) => setClassCounsellorName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>HOD Name</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8rem' }}
                      placeholder="HOD name"
                      value={hodName}
                      onChange={(e) => setHodName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Event Proof Attachment for Fake OD Guard */}
                <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ShieldCheck size={14} color="var(--status-resolved)" /> 
                    Genuine OD Proof (Certificate / Hall Ticket / Registration Receipt Link or File)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. certificate_proof.pdf or official_event_registration_pass.jpg"
                    value={verificationProof}
                    onChange={(e) => setVerificationProof(e.target.value)}
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    Class handling faculty review this proof to verify genuine ODs and reject fraudulent submissions.
                  </p>
                </div>

                {/* Event Return & Class Presentation Tracker */}
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Presentation size={14} color="var(--accent-blue)" /> Event Return & Class Presentation
                      </label>
                      <select
                        className="form-control"
                        value={eventReturnStatus}
                        onChange={(e) => setEventReturnStatus(e.target.value)}
                      >
                        <option value="NOT_RETURNED">Not Returned Yet (Event Ongoing)</option>
                        <option value="RETURNED_PENDING_PRESENTATION">Returned — Class Presentation Pending</option>
                        <option value="PRESENTATION_COMPLETED">Class Presentation & Report Completed</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Presentation Remarks / Summary</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Presented paper in class on Friday"
                        value={presentationRemarks}
                        onChange={(e) => setPresentationRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Canteen Dish Issue Specific Fields */}
            {category === 'Canteen Dish Issue' && (
              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(234, 179, 8, 0.04)', 
                border: '1px solid rgba(234, 179, 8, 0.3)', 
                borderRadius: '8px', 
                marginBottom: '1.5rem' 
              }}>
                <h4 style={{ color: '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <FileText size={18} /> Canteen & Food Quality Inspection Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Canteen / Mess Location *</label>
                    <select
                      className="form-control"
                      value={canteenLocation}
                      onChange={(e) => setCanteenLocation(e.target.value)}
                      required={category === 'Canteen Dish Issue'}
                    >
                      <option value="Block A Canteen">Block A Main Canteen</option>
                      <option value="Block B Snacks Bar">Block B Snacks Bar</option>
                      <option value="Hostel Boys Mess">Hostel Boys Mess</option>
                      <option value="Hostel Girls Mess">Hostel Girls Mess</option>
                      <option value="Central Food Court">Central Food Court</option>
                      <option value="Library Cafe">Library Cafe</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Dish / Food Item Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Chicken Biryani, Paneer Butter Masala, Tea"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      required={category === 'Canteen Dish Issue'}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Primary Issue Type *</label>
                    <select
                      className="form-control"
                      value={issueType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setIssueType(newType);
                        if (description.length >= 10) {
                          api.analyzeText(description, undefined, newType).then(res => setAiPreview(res)).catch(() => {});
                        }
                      }}
                    >
                      <option value="QUALITY">Poor Quality / Taste</option>
                      <option value="HYGIENE">Hygiene / Sanitation Concern (HIGH Priority)</option>
                      <option value="FOREIGN_OBJECT">Foreign Object / Contamination (CRITICAL Priority)</option>
                      <option value="PRICING">Overpricing / Bill Discrepancy</option>
                      <option value="AVAILABILITY">Item Unavailable Despite Menu</option>
                      <option value="OTHER">Other Food Issue</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meal Time</label>
                    <select
                      className="form-control"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Dish Photo / Attachment Link</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. dish_photo.jpg or image URL"
                      value={dishPhoto}
                      onChange={(e) => setDishPhoto(e.target.value)}
                    />
                  </div>
                </div>

                {(issueType === 'FOREIGN_OBJECT' || issueType === 'HYGIENE') && (
                  <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🛡️ Health Safety Override Active: Food safety issues trigger automatic HIGH or CRITICAL priority escalation.</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="location">Location / Building / Room No.</label>
              <input
                type="text"
                id="location"
                className="form-control"
                placeholder="e.g. Academic Block 1 / Room 204"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="attachment">Optional General Attachment</label>
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
                rows="5"
                placeholder="Explain the grievance in detail. Mention specific delays (e.g. mentor signed but counsellor delayed, attendance not updated)."
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
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>Analyzing complaint text...</p>
              </div>
            ) : aiPreview ? (
              <div>
                <div className="detail-meta-item">
                  <div className="detail-meta-label">Calculated Priority</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={getPriorityBadgeClass(aiPreview.priority)}>{aiPreview.priority}</span>
                    {(aiPreview.isFoodSafetyOverride || (category === 'Canteen Dish Issue' && (issueType === 'FOREIGN_OBJECT' || issueType === 'HYGIENE'))) && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', fontWeight: 700 }}>
                        🛡️ Food Safety Priority Override
                      </span>
                    )}
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

