import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  Send, Bot, User, Sparkles, RefreshCw, CheckCircle2, ShieldCheck, 
  ArrowRight, Edit3, MessageSquare, AlertTriangle, Layers, ShieldAlert 
} from 'lucide-react';

const ComplaintChatbot = ({ formData, updateFormData, onSubmit, onSwitchToQuick, loading }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I am your AI Campus Grievance Assistant. 👋 Tell me what issue or problem you are facing on campus today?",
      quickReplies: [
        "Food/hygiene issue in canteen",
        "OD form signature delayed",
        "Wi-Fi / Internet connection down",
        "Hostel room maintenance issue"
      ]
    }
  ]);
  
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0); // 0: initial description, 1: follow up 1, 2: follow up 2, 3: anonymous, 4: summary
  const [botTyping, setBotTyping] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping]);

  // Initial trigger if formData already has description from Quick Form
  useEffect(() => {
    if (formData.description && formData.description.length >= 10 && step === 0) {
      triggerAiAnalysis(formData.description);
    }
  }, []);

  const triggerAiAnalysis = async (text, cat, issueType) => {
    try {
      const res = await api.analyzeText(
        text, 
        formData.eventDate || undefined, 
        issueType || formData.issueType || undefined
      );
      setAiPreview(res);
      if (res && res.category && !formData.category) {
        updateFormData({ category: res.category });
      }
    } catch (err) {
      console.warn('AI analysis error in chatbot:', err.message);
    }
  };

  const handleSend = async (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setBotTyping(true);

    // Step 0: User describes main issue
    if (step === 0) {
      const titleCandidate = textToSend.length > 50 ? textToSend.substring(0, 47) + '...' : textToSend;
      updateFormData({ 
        description: textToSend,
        title: formData.title || titleCandidate
      });

      // Analyze text via AI
      await triggerAiAnalysis(textToSend);

      // Fetch next question from AI microservice engine
      const questionData = await api.getNextQuestion(textToSend, formData.category, 1);
      
      if (questionData.category) {
        updateFormData({ category: questionData.category });
      }

      setTimeout(() => {
        setBotTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: questionData.prompt,
            quickReplies: questionData.quickReplies || []
          }
        ]);
        setStep(1);
      }, 700);

    // Step 1: User answers follow-up 1 (location/canteen/event)
    } else if (step === 1) {
      if (formData.category === 'Canteen Dish Issue') {
        updateFormData({ canteenLocation: textToSend, locationName: textToSend });
      } else if (formData.category === 'OD Form Issue') {
        updateFormData({ eventName: textToSend });
      } else {
        updateFormData({ locationName: textToSend });
      }

      // Fetch next question for Step 2
      const questionData = await api.getNextQuestion(formData.description, formData.category, 2);

      setTimeout(() => {
        setBotTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 2,
            sender: 'bot',
            text: questionData.prompt,
            quickReplies: questionData.quickReplies || []
          }
        ]);
        setStep(2);
      }, 700);

    // Step 2: User answers follow-up 2 (dish name / OD pending / anonymous)
    } else if (step === 2) {
      if (formData.category === 'Canteen Dish Issue') {
        updateFormData({ dishName: textToSend });
        if (textToSend.toLowerCase().includes('cockroach') || textToSend.toLowerCase().includes('insect') || textToSend.toLowerCase().includes('foreign')) {
          updateFormData({ issueType: 'FOREIGN_OBJECT' });
          triggerAiAnalysis(formData.description, 'Canteen Dish Issue', 'FOREIGN_OBJECT');
        } else if (textToSend.toLowerCase().includes('hygiene') || textToSend.toLowerCase().includes('stale') || textToSend.toLowerCase().includes('dirty')) {
          updateFormData({ issueType: 'HYGIENE' });
          triggerAiAnalysis(formData.description, 'Canteen Dish Issue', 'HYGIENE');
        }
      } else if (formData.category === 'OD Form Issue') {
        if (textToSend.includes('1.') || textToSend.toLowerCase().includes('mentor')) updateFormData({ pendingApprovalFrom: 'MENTOR' });
        else if (textToSend.includes('2.') || textToSend.toLowerCase().includes('counsellor')) updateFormData({ pendingApprovalFrom: 'CLASS_COUNSELLOR' });
        else if (textToSend.includes('3.') || textToSend.toLowerCase().includes('hod')) updateFormData({ pendingApprovalFrom: 'HOD' });
        else if (textToSend.includes('4.') || textToSend.toLowerCase().includes('cell')) updateFormData({ pendingApprovalFrom: 'ACADEMIC_CELL' });
      }

      // Ask Anonymous Question (Step 3)
      setTimeout(() => {
        setBotTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 3,
            sender: 'bot',
            text: "Would you like to submit this grievance anonymously to protect your privacy?",
            quickReplies: ["Yes, keep me anonymous 🔒", "No, include my details 👤"]
          }
        ]);
        setStep(3);
      }, 700);

    // Step 3: Anonymous response
    } else if (step === 3) {
      const isAnon = textToSend.toLowerCase().includes('yes') || textToSend.includes('🔒');
      updateFormData({ anonymous: isAnon });

      setTimeout(() => {
        setBotTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 4,
            sender: 'bot',
            text: "Awesome! I have gathered all necessary information for your complaint. Please review your summary card below and confirm to submit."
          }
        ]);
        setStep(4);
      }, 600);
    }
  };

  const handleEditPrevious = (targetStep) => {
    setStep(targetStep);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'bot',
        text: targetStep === 0 
          ? "No problem! Please re-describe your main issue or complaint."
          : "Sure thing! Update your answer for this step below.",
        quickReplies: targetStep === 0 ? ["Food issue in canteen", "OD form delay", "Wi-Fi issue"] : []
      }
    ]);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: '1.5rem', alignItems: 'start' }}>
      
      {/* Main Chat Interface */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '620px', padding: 0, overflow: 'hidden' }}>
        
        {/* Chat Header */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)'
            }}>
              <Bot size={20} color="#ffffff" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>AI Guided Chat Assistant</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-resolved)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-resolved)' }} />
                Online & Evaluating Priority
              </span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={onSwitchToQuick}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Edit3 size={14} /> Switch to Quick Form
          </button>
        </div>

        {/* Messages Stream */}
        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                gap: '0.5rem',
                maxWidth: '85%',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: msg.sender === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(6,182,212,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {msg.sender === 'user' ? <User size={14} color="var(--accent-blue)" /> : <Bot size={14} color="var(--accent-cyan)" />}
                </div>

                <div style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.sender === 'user' 
                    ? 'linear-gradient(135deg, var(--accent-blue), #2563eb)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.45',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {msg.text}
                </div>
              </div>

              {/* Quick Reply Chips */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem', marginLeft: '2.2rem' }}>
                  {msg.quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(reply)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        background: 'rgba(6, 182, 212, 0.08)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        borderRadius: '16px',
                        color: 'var(--accent-cyan)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {botTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bot size={16} color="var(--accent-cyan)" />
              <span style={{ fontStyle: 'italic' }}>AI Assistant is analyzing & formulating next step...</span>
            </div>
          )}

          {/* Interactive Summary Review Card (Step 4) */}
          {step === 4 && (
            <div style={{
              margin: '0.5rem 0 1rem 2.2rem',
              padding: '1.25rem',
              background: 'rgba(6, 182, 212, 0.04)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '12px'
            }}>
              <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} /> Grievance Summary & Verification Card
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Grievance Category</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formData.category || 'General'}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Target Department</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{aiPreview?.department || 'General Administration'}</span>
                </div>

                {formData.canteenLocation && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Canteen Location</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formData.canteenLocation}</span>
                  </div>
                )}

                {formData.dishName && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Dish Name</span>
                    <span style={{ fontWeight: 600, color: '#eab308' }}>{formData.dishName}</span>
                  </div>
                )}

                {formData.eventName && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Event Name</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formData.eventName}</span>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Submission Mode</span>
                  <span style={{ fontWeight: 600, color: formData.anonymous ? '#f87171' : 'var(--status-resolved)' }}>
                    {formData.anonymous ? '🔒 Anonymous' : '👤 Student Identified'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Captured Description</span>
                <p style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.82rem', margin: 0, color: 'var(--text-secondary)' }}>
                  "{formData.description}"
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-blue"
                  onClick={onSubmit}
                  disabled={loading}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} />
                  {loading ? 'Submitting...' : '🚀 Confirm & Submit Grievance'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleEditPrevious(0)}
                  style={{ fontSize: '0.8rem' }}
                >
                  ✏️ Edit Answers
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid var(--border-color)' }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '0.65rem' }}
          >
            <input
              type="text"
              className="form-control"
              placeholder={step === 4 ? "Grievance ready for submission..." : "Type your message or answer here..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={step === 4 || loading}
              style={{ borderRadius: '20px' }}
            />
            <button
              type="submit"
              className="btn btn-blue"
              disabled={!input.trim() || step === 4 || loading}
              style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Live AI Assessment Sidebar Banner */}
      <div className="glass-card" style={{ border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(15, 23, 42, 0.6)' }}>
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--accent-cyan)' }}>
          <Sparkles size={18} /> Real-Time AI Intelligence
        </h4>

        {aiPreview ? (
          <div>
            <div className="detail-meta-item" style={{ marginBottom: '0.85rem' }}>
              <div className="detail-meta-label">Evaluated Priority</div>
              <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge-priority-${aiPreview.priority.toLowerCase()}`}>
                  {aiPreview.priority}
                </span>
                {aiPreview.isFoodSafetyOverride && (
                  <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', fontWeight: 700 }}>
                    🛡️ Safety Override
                  </span>
                )}
              </div>
            </div>

            <div className="detail-meta-item" style={{ marginBottom: '0.85rem' }}>
              <div className="detail-meta-label">Sentiment Polarization</div>
              <div style={{ marginTop: '0.35rem' }}>
                <span className={`badge badge-sentiment-${aiPreview.sentiment.toLowerCase()}`}>
                  {aiPreview.sentiment}
                </span>
              </div>
            </div>

            <div className="detail-meta-item" style={{ marginBottom: '0.85rem' }}>
              <div className="detail-meta-label">Automatic Department Routing</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                🏢 {aiPreview.department || 'General Administration'}
              </div>
            </div>

            <div className="detail-meta-item" style={{ borderStyle: 'dashed' }}>
              <div className="detail-meta-label">AI Logic Explanation</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                {aiPreview.reason}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Bot size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
            <p>Start chatting to view real-time priority scoring & department routing.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ComplaintChatbot;
