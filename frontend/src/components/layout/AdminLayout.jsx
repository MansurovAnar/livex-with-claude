import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="app-topbar" style={{ display: 'none', alignItems: 'center', gap: 12, background: '#1e293b', color: '#fff', padding: '8px 12px' }}>
        <button aria-label="Open menu" onClick={() => setOpen(true)}
          style={{ background: 'none', border: '1px solid #475569', color: '#fff', borderRadius: 6, fontSize: '1.25rem', padding: '0 12px', cursor: 'pointer' }}>☰</button>
        <span style={{ fontWeight: 'bold' }}>Exam Control</span>
      </div>
      {open && isMobile && <div className="app-backdrop" onClick={() => setOpen(false)} />}
      <nav className={`app-sidebar${open ? ' open' : ''}`} style={{ width: 220, background: '#1e293b', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
      <main className="app-main" style={{ flex: 1, padding: '2rem', background: '#f8fafc' }}>
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
