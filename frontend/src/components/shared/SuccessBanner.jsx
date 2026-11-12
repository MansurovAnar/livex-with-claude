import React, { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

// Green dismissible banner; auto-hides after `timeout` ms.
export default function SuccessBanner({ message, onDismiss, timeout = 4000 }) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, timeout);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  return (
    <div role="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
      <span className="wrap-text" style={{ minWidth: 0 }}>✓ {message}</span>
      <button type="button" onClick={onDismiss} aria-label={t('Dismiss')}
        style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flex: 'none' }}>
        ✕
      </button>
    </div>
  );
}
