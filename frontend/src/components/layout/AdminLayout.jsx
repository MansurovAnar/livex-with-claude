import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: '#1e293b', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>Exam Control</div>
        <NavLink to="/admin" end style={navStyle}>Dashboard</NavLink>
        <NavLink to="/admin/exams" style={navStyle}>Exams</NavLink>
        <NavLink to="/admin/students" style={navStyle}>Students</NavLink>
        <NavLink to="/admin/users" style={navStyle}>Users</NavLink>
        <NavLink to="/admin/partners" style={navStyle}>Partners</NavLink>
        <NavLink to="/admin/schools" style={navStyle}>Schools</NavLink>
        <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>{user?.full_name}</div>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #475569', color: '#fff', padding: '0.4rem', cursor: 'pointer', borderRadius: 4 }}>
          Logout
        </button>
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navStyle = ({ isActive }) => ({
  color: isActive ? '#38bdf8' : '#cbd5e1',
  textDecoration: 'none',
  padding: '0.4rem 0.5rem',
  borderRadius: 4,
  background: isActive ? '#0f172a' : 'transparent',
  display: 'block',
});
