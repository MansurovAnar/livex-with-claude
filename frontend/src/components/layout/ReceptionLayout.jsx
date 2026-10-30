import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitch from '../shared/LanguageSwitch';

export default function ReceptionLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh', background: '#fdf4ff' }}>
      {isMobile ? (
        <header style={{ background: '#7e22ce', color: '#fff', position: 'relative', zIndex: 1100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
            <button aria-label={open ? t('Close menu') : t('Open menu')} aria-expanded={open} onClick={() => setOpen(o => !o)}
              style={{ background: 'none', border: '1px solid #fff', color: '#fff', borderRadius: 6, fontSize: '1.25rem', padding: '0 12px', minHeight: 44, cursor: 'pointer' }}>
              {open ? '✕' : '☰'}
            </button>
            <span style={{ fontWeight: 'bold' }}>{t('Reception')}</span>
          </div>
          {open && (
            <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px 12px', gap: 4, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <NavLink to="/reception" end style={mobileNavStyle}>{t('Students')}</NavLink>
              <NavLink to="/reception/exams" style={mobileNavStyle}>{t('Exams')}</NavLink>
              <NavLink to="/reception/partners" style={mobileNavStyle}>{t('Partners')}</NavLink>
              <div className="wrap-text" style={{ fontSize: '0.85rem', opacity: 0.85, padding: '8px 0 4px' }}>{user?.full_name}</div>
              <LanguageSwitch fullWidth />
              <button onClick={handleLogout}
                style={{ background: 'none', border: '1px solid #fff', color: '#fff', padding: '0.25rem 0.75rem', minHeight: 44, cursor: 'pointer', borderRadius: 4 }}>
                {t('Logout')}
              </button>
            </nav>
          )}
        </header>
      ) : (
        <header style={{ background: '#7e22ce', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>{t('Reception')}</span>
            <NavLink to="/reception" end style={navStyle}>{t('Students')}</NavLink>
            <NavLink to="/reception/exams" style={navStyle}>{t('Exams')}</NavLink>
            <NavLink to="/reception/partners" style={navStyle}>{t('Partners')}</NavLink>
          </div>
          <span style={{ fontSize: '0.85rem' }}>{user?.full_name}
            <LanguageSwitch style={{ marginLeft: '1rem', verticalAlign: 'middle' }} />
            <button onClick={handleLogout} style={{ marginLeft: '0.5rem', background: 'none', border: '1px solid #fff', color: '#fff', padding: '0.25rem 0.75rem', cursor: 'pointer', borderRadius: 4 }}>{t('Logout')}</button>
          </span>
        </header>
      )}
      <main className="app-main" style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navStyle = ({ isActive }) => ({
  color: isActive ? '#e9d5ff' : '#fff',
  textDecoration: isActive ? 'underline' : 'none',
});

const mobileNavStyle = ({ isActive }) => ({
  color: '#fff',
  textDecoration: 'none',
  padding: '10px 8px',
  borderRadius: 6,
  background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
  fontWeight: isActive ? 600 : 400,
});
