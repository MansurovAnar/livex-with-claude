import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitch from '../shared/LanguageSwitch';

export default function SecurityLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f9ff' }}>
      <header className="app-header" style={{ background: '#0369a1', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>{t('Security — Exam Entrance')}</span>
        <span className="wrap-text" style={{ fontSize: '0.85rem' }}>{user?.full_name}
          <LanguageSwitch style={{ marginLeft: '1rem', verticalAlign: 'middle' }} />
          <button onClick={handleLogout} style={{ marginLeft: '0.5rem', background: 'none', border: '1px solid #fff', color: '#fff', padding: '0.25rem 0.75rem', cursor: 'pointer', borderRadius: 4 }}>{t('Logout')}</button>
        </span>
      </header>
      <main className="app-main" style={{ padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
