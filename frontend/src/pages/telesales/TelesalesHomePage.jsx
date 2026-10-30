import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function TelesalesHomePage() {
  const { t } = useLanguage();
  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>{t('Leads')}</h2>
      <p style={{ color: '#64748b' }}>{t('Telesales leads will appear here.')}</p>
    </div>
  );
}
