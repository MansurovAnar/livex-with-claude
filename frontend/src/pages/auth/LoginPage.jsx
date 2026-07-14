import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'security') navigate('/security');
      else if (user.role === 'reception') navigate('/reception');
      else if (user.role === 'partner') navigate('/partner');
      else navigate('/monitor');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2rem', borderRadius: 8, width: 360, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Exam Entrance Control</h2>
        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: 4, marginBottom: '1rem' }}>{error}</div>}
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
        <label style={labelStyle}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
        <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 };
const inputStyle = { width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box' };
const btnStyle = { width: '100%', padding: '0.6rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: '1rem', cursor: 'pointer' };
