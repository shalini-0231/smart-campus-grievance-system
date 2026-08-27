import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Bot, X, Send, User, Sparkles, Volume2, VolumeX, Search, 
  Clock, ShieldAlert, ArrowUpRight, HelpCircle, FileText, CheckCircle2 
} from 'lucide-react';

const GlobalFloatingChatbot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'track' | 'actions'
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "👋 Hi! I am your site-wide SCGRS AI Copilot. Ask me anything about OD forms, canteen safety, SLA rules, or tracking your complaints!",
      quickReplies: ["File a Complaint", "How to get OD approval?", "Canteen food safety rules", "Check complaint SLA"]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Grievance tracking state
  const [trackSearchId, setTrackSearchId] = useState('');
  const [myComplaints, setMyComplaints] = useState([]);
  const [trackLoading, setTrackLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Load student complaints for Quick Tracking tab
  useEffect(() => {
    if (user && user.role === 'student' && isOpen && activeTab === 'track') {
      fetchMyComplaints();
    }
  }, [user, isOpen, activeTab]);

  const fetchMyComplaints = async () => {
    setTrackLoading(true);
    try {
      const data = await api.getStudentComplaints();
      setMyComplaints(data || []);
    } catch (e) {
      console.warn('Error fetching complaints for bot tracker:', e.message);
    } finally {
      setTrackLoading(false);
    }
  };

  const speakText = (text) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_#📌🛡️🍲⚡📶📊]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleSendMessage = async (customMessage) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim()) return;

    // Automatically switch to chat tab so user sees the message stream instantly
    setActiveTab('chat');

    const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatWithAI(textToSend, user?.role || 'student');
      
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.answer,
        action: res.action,
        quickReplies: res.quickReplies || []
      };

      setMessages(prev => [...prev, botMsg]);
      speakText(res.answer);

      if (res.action === 'NAVIGATE_SUBMIT') {
        setTimeout(() => {
          if (user?.role === 'student') navigate('/student/submit');
        }, 1800);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: "Sorry, I ran into a network error. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'var(--font-family, sans-serif)' }}>
      
      {/* Floating Drawer Window */}
      {isOpen && (
        <div style={{
          width: '380px',
          height: '560px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(6, 182, 212, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '1rem',
          overflow: 'hidden',
          animation: 'fadeInUp 0.3s ease-out'
        }}>

          {/* Drawer Header */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,58,138,0.4))',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)'
              }}>
                <Bot size={18} color="#ffffff" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>SCGRS AI Copilot</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-resolved)' }} />
                  Site-Wide Assistant
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {/* Text-To-Speech Toggle */}
              <button
                type="button"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                title={ttsEnabled ? "Mute Voice Reading" : "Enable Voice Reading"}
                style={{
                  background: ttsEnabled ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  border: 'none',
                  color: ttsEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: '6px'
                }}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Sub-Tabs Bar */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '0.55rem',
                border: 'none',
                background: activeTab === 'chat' ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'chat' ? 600 : 400,
                borderBottom: activeTab === 'chat' ? '2px solid var(--accent-cyan)' : 'none',
                cursor: 'pointer'
              }}
            >
              💬 Ask AI
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('track')}
              style={{
                flex: 1,
                padding: '0.55rem',
                border: 'none',
                background: activeTab === 'track' ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: activeTab === 'track' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'track' ? 600 : 400,
                borderBottom: activeTab === 'track' ? '2px solid var(--accent-cyan)' : 'none',
                cursor: 'pointer'
              }}
            >
              🔍 Track Status
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('actions')}
              style={{
                flex: 1,
                padding: '0.55rem',
                border: 'none',
                background: activeTab === 'actions' ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: activeTab === 'actions' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'actions' ? 600 : 400,
                borderBottom: activeTab === 'actions' ? '2px solid var(--accent-cyan)' : 'none',
                cursor: 'pointer'
              }}
            >
              ⚡ Quick Shortcuts
            </button>
          </div>

          {/* TAB 1: Chat Stream */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '0.85rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: '0.4rem',
                      maxWidth: '88%',
                      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: msg.sender === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(6,182,212,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {msg.sender === 'user' ? <User size={12} color="var(--accent-blue)" /> : <Bot size={12} color="var(--accent-cyan)" />}
                      </div>

                      <div style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        background: msg.sender === 'user' 
                          ? 'linear-gradient(135deg, var(--accent-blue), #2563eb)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.text}
                      </div>
                    </div>

                    {/* Action button if present */}
                    {msg.action === 'NAVIGATE_SUBMIT' && (
                      <button
                        type="button"
                        className="btn btn-blue"
                        onClick={() => {
                          setIsOpen(false);
                          if (user?.role === 'student') navigate('/student/submit');
                        }}
                        style={{ marginTop: '0.5rem', marginLeft: '1.8rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <FileText size={13} /> Open Submission Form <ArrowUpRight size={13} />
                      </button>
                    )}

                    {/* Quick Replies */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem', marginLeft: '1.8rem' }}>
                        {msg.quickReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(reply)}
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.72rem',
                              background: 'rgba(6, 182, 212, 0.08)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              borderRadius: '12px',
                              color: 'var(--accent-cyan)',
                              cursor: 'pointer'
                            }}
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Bot size={14} color="var(--accent-cyan)" /> AI is formulating answer...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid var(--border-color)' }}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{ display: 'flex', gap: '0.5rem' }}
                >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ask AI anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{ borderRadius: '16px', fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-blue"
                    disabled={!input.trim() || loading}
                    style={{ borderRadius: '50%', width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Grievance Tracker */}
          {activeTab === 'track' && (
            <div style={{ flex: 1, padding: '0.85rem', overflowY: 'auto' }}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  Search by Complaint ID (e.g., CMP-1002)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter CMP ID"
                    value={trackSearchId}
                    onChange={(e) => setTrackSearchId(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      if (trackSearchId.trim()) {
                        setIsOpen(false);
                        navigate(`/complaints/${trackSearchId.trim().toUpperCase()}`);
                      }
                    }}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    <Search size={14} />
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <h5 style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={14} /> Your Active Grievances & SLA
                </h5>

                {trackLoading ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading grievances...</p>
                ) : myComplaints.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {myComplaints.slice(0, 4).map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/complaints/${c.complaintId}`);
                        }}
                        style={{
                          padding: '0.6rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.complaintId}</span>
                          <span className={`badge badge-priority-${c.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                            {c.priority}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.title}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No active grievances found.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Quick Shortcuts */}
          {activeTab === 'actions' && (
            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto' }}>
              <button
                type="button"
                className="btn btn-blue"
                onClick={() => handleSendMessage("I want to file a new campus grievance")}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem' }}
              >
                <FileText size={16} /> 📝 File New Campus Grievance
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendMessage("Tell me about canteen food hygiene and foreign object rules")}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem' }}
              >
                🍲 Canteen & Food Safety Rules
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendMessage("Explain the multi-stage OD form approval procedure")}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem' }}
              >
                🎓 On-Duty (OD) Form Procedure
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendMessage("How does SLA auto-escalation work?")}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem' }}
              >
                ⚡ SLA Escalation Timeframes
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendMessage("Anti-ragging and harassment helpline contact and policies")}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem' }}
              >
                🛡️ Anti-Ragging & Harassment Helpline
              </button>
            </div>
          )}

        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
          border: 'none',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4), 0 0 12px rgba(59, 130, 246, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          position: 'relative',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
        }}
      >
        {isOpen ? <X size={24} /> : <Bot size={26} />}
        
        {/* Pulsing online badge */}
        {!isOpen && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'var(--status-resolved)',
            border: '2px solid #0f172a',
            boxShadow: '0 0 8px var(--status-resolved)'
          }} />
        )}
      </button>

    </div>
  );
};

export default GlobalFloatingChatbot;
