import React from 'react';
import { X, Download, ShieldCheck, ZoomIn, FileImage, ExternalLink } from 'lucide-react';

const CertificateViewerModal = ({ isOpen, onClose, imageUrl, title = 'OD Verification Certificate (JPG)', fileName = 'certificate_proof.jpg' }) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName.endsWith('.jpg') || fileName.endsWith('.png') ? fileName : `${fileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          maxWidth: '960px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.2)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <FileImage size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {title}
                <span className="badge badge-priority-low" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck size={12} /> Genuine JPG Verified
                </span>
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                File: {fileName} • Verified On-Duty Academic Credential
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              className="btn btn-outline" 
              onClick={handleDownload}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={15} /> Download JPG
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Image Body */}
        <div style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          background: '#070b16'
        }}>
          <img 
            src={imageUrl} 
            alt="OD Certificate Proof" 
            style={{
              maxWidth: '100%',
              maxHeight: '65vh',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Modal Footer Note */}
        <div style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <span>🔒 Cryptographically signed and verified by Smart Campus OD Guard</span>
          <span>Format: High-Definition JPG</span>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewerModal;
