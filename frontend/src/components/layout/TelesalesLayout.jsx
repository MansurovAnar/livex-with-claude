import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import useDueCallbacks from '../../hooks/useDueCallbacks';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitch from '../shared/LanguageSwitch';

export default function TelesalesLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const dueCallbacks = useDueCallbacks([location.pathname]);
  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="app-topbar" style={{ display: 'none', alignItems: 'center', gap: 12, background: '#7c2d12', color: '#fff', padding: '8px 12px' }}>
        <button aria-label={t('Open menu')} onClick={() => setOpen(true)}
          style={{ background: 'none', border: '1px solid #9a3412', color: '#ffedd5', borderRadius: 6, fontSize: '1.25rem', padding: '0 12px', minHeight: 44, cursor: 'pointer' }}>☰</button>
        <span style={{ fontWeight: 'bold', color: '#fdba74' }}>{t('Telesales')}</span>
        {dueCallbacks > 0 && (
          <NavLink to="/telesales/callbacks" aria-label={t('{n} callbacks due', { n: dueCallbacks })} style={{ ...countBadge, textDecoration: 'none' }}>{dueCallbacks}</NavLink>
        )}
      </div>
      {open && isMobile && <div className="app-backdrop" onClick={() => setOpen(false)} />}
      <nav className={`app-sidebar${open ? ' open' : ''}`} style={{ width: 220, background: '#7c2d12', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', color: '#fdba74' }}>{t('Telesales')}</div>
        <div style={{ fontSize: '0.75rem', color: '#fdba74', marginBottom: '1rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.full_name}
        </div>
        <NavLink to="/telesales" end style={navStyle}>{t('Leads')}</NavLink>
        <NavLink to="/telesales/callbacks" style={navStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('Callbacks')}
            {dueCallbacks > 0 && <span style={countBadge} aria-label={t('{n} callbacks due', { n: dueCallbacks })}>{dueCallbacks}</span>}
          </span>
        </NavLink>
        <NavLink to="/telesales/leads/new" style={navStyle}>{t('Add Lead')}</NavLink>
        <div style={{ marginTop: 'auto' }}>
          <LanguageSwitch fullWidth style={{ marginBottom: '0.5rem' }} />
          <button onClick={handleLogout} style={{ width: '100%', background: 'none', border: '1px solid #9a3412', color: '#ffedd5', padding: '0.4rem', cursor: 'pointer', borderRadius: 4, fontSize: '0.875rem' }}>
            {t('Logout')}
          </button>
        </div>
      </nav>
      <main className="app-main" style={{ flex: 1, minWidth: 0, padding: '2rem', background: '#fff7ed' }}>
        <Outlet />
      </main>
    </div>
  );
}

const countBadge = { marginLeft: 'auto', minWidth: 20, padding: '0 6px', borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: '0.72rem', fontWeight: 700, lineHeight: '20px', textAlign: 'center' };
const navStyle = ({ isActive }) => ({
  color: isActive ? '#fdba74' : '#ffedd5',
  textDecoration: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: 6,
  background: isActive ? '#9a3412' : 'transparent',
  display: 'block',
  fontSize: '0.9rem',
});
