import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function SecurityLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f9ff' }}>
      <header style={{ background: '#0369a1', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>Security — Exam Entrance</span>
        <span style={{ fontSize: '0.85rem' }}>{user?.full_name}
          <button onClick={handleLogout} style={{ marginLeft: '1rem', background: 'none', border: '1px solid #fff', color: '#fff', padding: '0.25rem 0.75rem', cursor: 'pointer', borderRadius: 4 }}>Logout</button>
        </span>
      </header>
      <main style={{ padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
