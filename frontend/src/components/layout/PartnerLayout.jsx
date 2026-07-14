import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PartnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: '#064e3b', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', color: '#6ee7b7' }}>Partner Portal</div>
        <div style={{ fontSize: '0.75rem', color: '#6ee7b7', marginBottom: '1rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.full_name}
        </div>
        <NavLink to="/partner" end style={navStyle}>My Students</NavLink>
        <NavLink to="/partner/register" style={navStyle}>Register to Exam</NavLink>
        <NavLink to="/partner/payments" style={navStyle}>Payments</NavLink>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: 'none', border: '1px solid #065f46', color: '#d1fae5', padding: '0.4rem', cursor: 'pointer', borderRadius: 4, fontSize: '0.875rem' }}>
            Logout
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f0fdf4' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navStyle = ({ isActive }) => ({
  color: isActive ? '#6ee7b7' : '#d1fae5',
  textDecoration: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: 6,
  background: isActive ? '#065f46' : 'transparent',
  display: 'block',
  fontSize: '0.9rem',
});
