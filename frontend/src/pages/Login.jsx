import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, Info, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setFormLoading(true);

    try {
      const loggedUser = await login(email, password);
      addToast(`Welcome back, ${loggedUser.name.split(' ')[0]}!`, 'success');
      if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
      addToast('Login failed. Please check credentials.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFillDemo = (role) => {
    setError('');
    const demoEmail = role === 'admin' ? 'admin@scgrs.com' : 'student@scgrs.com';
    const demoPassword = 'password123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    // Auto submit using a small timeout so the user sees the filled values
    setTimeout(() => {
      setFormLoading(true);
      login(demoEmail, demoPassword)
        .then((loggedUser) => {
          if (loggedUser.role === 'admin') navigate('/admin/dashboard');
          else navigate('/student/dashboard');
        })
        .catch((err) => {
          setError(err.message || 'Demo Login failed.');
          setFormLoading(false);
        });
    }, 400);
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Login to file grievances and view progress</p>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="student@scgrs.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-blue" style={{ width: '100%', marginTop: '0.5rem' }} disabled={formLoading}>
            <LogIn size={18} />
            {formLoading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-credentials-helper">
          <h4>
            <Info size={16} /> Quick Demo Logins
          </h4>
          <p>Click below to automatically log in to demo accounts:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button className="demo-fill-btn" onClick={() => handleFillDemo('student')} disabled={formLoading}>
              Student Account
            </button>
            <button className="demo-fill-btn" onClick={() => handleFillDemo('admin')} disabled={formLoading}>
              Admin Account
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
