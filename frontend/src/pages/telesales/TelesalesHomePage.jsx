import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

// Placeholder until the lead list (LV#44); mounted at /telesales and /admin/telesales/leads
export default function TelesalesHomePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const newPath = user?.role === 'admin' ? '/admin/telesales/leads/new' : '/telesales/leads/new';
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{t('Leads')}</h2>
        <Link to={newPath} style={{ background: '#c2410c', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.9rem', fontWeight: 500 }}>
          {t('+ Add Lead')}
        </Link>
      </div>
      <p style={{ color: '#64748b' }}>{t('Telesales leads will appear here.')}</p>
    </div>
  );
}
