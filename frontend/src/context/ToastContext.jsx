import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '380px',
        width: '90vw'
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const config = {
    success: {
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.4)',
      color: 'hsl(142, 70%, 60%)',
      icon: '✓'
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      color: 'hsl(0, 85%, 65%)',
      icon: '✕'
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.4)',
      color: 'hsl(217, 91%, 70%)',
      icon: 'ℹ'
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      color: 'hsl(45, 90%, 60%)',
      icon: '⚠'
    }
  };

  const c = config[toast.type] || config.success;

  return (
    <div style={{
      background: 'hsl(222, 47%, 9%)',
      border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.color}`,
      borderRadius: '10px',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(16px)',
      animation: 'slideInToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer'
    }} onClick={() => onRemove(toast.id)}>
      <span style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: c.bg,
        color: c.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.9rem',
        flexShrink: 0
      }}>
        {c.icon}
      </span>
      <span style={{ fontSize: '0.9rem', color: 'hsl(210, 40%, 92%)', flex: 1 }}>
        {toast.message}
      </span>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
