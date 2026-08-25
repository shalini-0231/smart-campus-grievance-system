import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, ShieldCheck, Zap, MessageSquareQuote, ShieldAlert } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      <div className="hero-section">
        <div className="hero-tagline">AI-Powered Grievance Redressal</div>
        <h1 className="hero-title">Smart Campus Grievance Redressal System</h1>
        <p className="hero-desc">
          An automated, intelligent portal enabling students to voice grievances. SCGRS pre-processes complaint texts, executes rule-based sentiment scoring, automatically assigns severity priorities, and maps cases directly to responsible department administrators.
        </p>
        <div className="hero-cta">
          <button className="btn btn-blue" onClick={handleGetStarted} style={{ fontSize: '1.05rem', padding: '0.9rem 2rem' }}>
            Get Started
          </button>
          {!user && (
            <button className="btn btn-outline" onClick={() => navigate('/register')} style={{ fontSize: '1.05rem', padding: '0.9rem 2rem' }}>
              Create Account
            </button>
          )}
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Brain size={24} />
          </div>
          <h3>AI Priority Engine</h3>
          <p>Scans complaint text for urgency keywords to classify severity levels (Low, Medium, High, Critical) in real time.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Zap size={24} />
          </div>
          <h3>Auto-Department Routing</h3>
          <p>Directs submissions straight to the relevant department (e.g. IT, Hostel, Student Welfare) depending on category rules.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrap">
            <MessageSquareQuote size={24} />
          </div>
          <h3>Sentiment Analysis</h3>
          <p>Extracts negative sentiment indicators from descriptions to weigh in on severity priorities dynamically.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrap">
            <ShieldCheck size={24} />
          </div>
          <h3>Anonymous Submit</h3>
          <p>Allows students to mask their identities in the portal, hiding name/email details from admin screens.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
