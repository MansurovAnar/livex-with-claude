import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ReceptionLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#fdf4ff' }}>
      <header style={{ background: '#7e22ce', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>Reception</span>
          <NavLink to="/reception" end style={navStyle}>Students</NavLink>
          <NavLink to="/reception/exams" style={navStyle}>Exams</NavLink>
          <NavLink to="/reception/partners" style={navStyle}>Partners</NavLink>
        </div>
        <span style={{ fontSize: '0.85rem' }}>{user?.full_name}
          <button onClick={handleLogout} style={{ marginLeft: '1rem', background: 'none', border: '1px solid #fff', color: '#fff', padding: '0.25rem 0.75rem', cursor: 'pointer', borderRadius: 4 }}>Logout</button>
        </span>
      </header>
      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navStyle = ({ isActive }) => ({
  color: isActive ? '#e9d5ff' : '#fff',
  textDecoration: isActive ? 'underline' : 'none',
});
