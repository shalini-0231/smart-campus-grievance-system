import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

/**
 * SLACountdownBadge
 * Real-time color-coded countdown timer for grievance SLA deadlines.
 * 
 * Thresholds:
 * - Resolved: Green badge "Resolved within SLA"
 * - Expired: Red badge "Breached / Escalated"
 * - Critical (< 4 hours): Flashing red badge with live countdown
 * - Warning (< 12 hours): Amber badge with live countdown
 * - On Track (> 12 hours): Cyan / Blue badge
 */
const SLACountdownBadge = ({ deadline, status, isEscalated, size = 'normal' }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(null);

  useEffect(() => {
    if (!deadline) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('SLA Breached');
        setHoursLeft(0);
      } else {
        setIsExpired(false);
        const totalHours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setHoursLeft(totalHours);

        if (totalHours > 24) {
          const days = Math.floor(totalHours / 24);
          const remHours = totalHours % 24;
          setTimeLeft(`${days}d ${remHours}h left`);
        } else if (totalHours > 0) {
          setTimeLeft(`${totalHours}h ${minutes}m left`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s left`);
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No SLA set</span>;
  }

  if (status === 'RESOLVED') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        background: 'rgba(16, 185, 129, 0.12)',
        color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        padding: size === 'small' ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        fontWeight: 600
      }}>
        <CheckCircle2 size={size === 'small' ? 12 : 14} /> SLA Met
      </span>
    );
  }

  if (isExpired || isEscalated || status === 'ESCALATED') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        padding: size === 'small' ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        fontWeight: 700,
        boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)'
      }}>
        <ShieldAlert size={size === 'small' ? 12 : 14} /> {isEscalated ? 'Escalated (Breached)' : 'SLA Breached'}
      </span>
    );
  }

  // Warning thresholds
  const isCriticalWindow = hoursLeft !== null && hoursLeft < 4;
  const isWarningWindow = hoursLeft !== null && hoursLeft < 12;

  let badgeBg = 'rgba(56, 189, 248, 0.1)';
  let badgeColor = '#38bdf8';
  let badgeBorder = 'rgba(56, 189, 248, 0.3)';

  if (isCriticalWindow) {
    badgeBg = 'rgba(239, 68, 68, 0.12)';
    badgeColor = '#f87171';
    badgeBorder = 'rgba(239, 68, 68, 0.35)';
  } else if (isWarningWindow) {
    badgeBg = 'rgba(245, 158, 11, 0.12)';
    badgeColor = '#fbbf24';
    badgeBorder = 'rgba(245, 158, 11, 0.35)';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      background: badgeBg,
      color: badgeColor,
      border: `1px solid ${badgeBorder}`,
      padding: size === 'small' ? '2px 8px' : '4px 10px',
      borderRadius: '9999px',
      fontSize: size === 'small' ? '0.72rem' : '0.8rem',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums'
    }}>
      {isCriticalWindow ? (
        <AlertTriangle size={size === 'small' ? 12 : 14} />
      ) : (
        <Clock size={size === 'small' ? 12 : 14} />
      )}
      {timeLeft || 'Calculating...'}
    </span>
  );
};

export default SLACountdownBadge;
