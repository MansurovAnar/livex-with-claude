import React from 'react';
import { PAGE_SIZES } from '../../api/students.api';
import { useLanguage } from '../../i18n/LanguageContext';

// Page-size dropdown (top-right of the table).
export function PageSizeSelect({ limit, onLimitChange }) {
  const { t } = useLanguage();
  return (
    <label className="pagination-size" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
      {t('Show')}
      <select className="page-size-select" value={limit} onChange={e => onLimitChange(Number(e.target.value))}
        style={{ padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontSize: '0.85rem' }}>
        {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {t('per page')}
    </label>
  );
}

// Prev/Next controls with "Page X of Y · N students".
export function PaginationBar({ page, limit, total, onPageChange }) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const btn = disabled => ({
    padding: '0.4rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f1f5f9',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, color: '#475569',
  });
  return (
    <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
      <span className="wrap-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>
        {t(total === 1 ? 'Page {p} of {n} · 1 student' : 'Page {p} of {n} · {count} students', { p: page, n: totalPages, count: total })}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={btn(page <= 1)}>{t('Prev')}</button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={btn(page >= totalPages)}>{t('Next')}</button>
      </div>
    </div>
  );
}
