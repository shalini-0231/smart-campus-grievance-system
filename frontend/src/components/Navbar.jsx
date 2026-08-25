import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, PlusCircle, LayoutDashboard, ClipboardList, LogIn, UserPlus, BarChart2 } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => navigate('/')}>
        <ShieldAlert size={26} color="var(--accent-cyan)" />
        <span>SCGRS</span>
      </div>

      <ul className="nav-links">
        {/* Public Landing Link */}
        <li className="nav-link" onClick={() => navigate('/')}>Home</li>

        {user ? (
          <>
            {/* Student Links */}
            {user.role === 'student' && (
              <>
                <li 
                  className={`nav-link ${isActive('/student/dashboard') ? 'active' : ''}`}
                  onClick={() => navigate('/student/dashboard')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <LayoutDashboard size={16} /> Dashboard
                  </span>
                </li>
                <li 
                  className={`nav-link ${isActive('/student/complaints') ? 'active' : ''}`}
                  onClick={() => navigate('/student/complaints')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardList size={16} /> My Complaints
                  </span>
                </li>
                <li 
                  className={`nav-link btn-primary ${isActive('/student/submit') ? 'active' : ''}`}
                  onClick={() => navigate('/student/submit')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <PlusCircle size={16} /> File Grievance
                  </span>
                </li>
              </>
            )}

            {/* Admin Links */}
            {user.role === 'admin' && (
              <>
                <li 
                  className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                  onClick={() => navigate('/admin/dashboard')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <LayoutDashboard size={16} /> Admin Panel
                  </span>
                </li>
                <li 
                  className={`nav-link ${isActive('/admin/complaints') ? 'active' : ''}`}
                  onClick={() => navigate('/admin/complaints')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardList size={16} /> Grievances
                  </span>
                </li>
                <li 
                  className={`nav-link ${isActive('/admin/analytics') ? 'active' : ''}`}
                  onClick={() => navigate('/admin/analytics')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BarChart2 size={16} /> Analytics
                  </span>
                </li>
              </>
            )}

            {/* User Session Info */}
            <div className="nav-user">
              <span className="user-badge">{user.role}</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                {user.name.split(' ')[0]}
              </span>
              <button 
                onClick={handleLogout}
                className="btn btn-outline" 
                style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Guest Links */}
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/login')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogIn size={16} /> Login
            </button>
            <button 
              className="btn btn-blue"
              onClick={() => navigate('/register')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={16} /> Register
            </button>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
