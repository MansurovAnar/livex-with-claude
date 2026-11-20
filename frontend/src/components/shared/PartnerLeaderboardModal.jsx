import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';

// Partner leaderboard (LV#38): active partners ranked by fully paid registrations
// in completed exams. Places 1-3 with at least one registration get 3/2/1 stars;
// the logged-in partner's row is highlighted. Fits the phone screen without
// horizontal scroll: names wrap inside the name column.
export default function PartnerLeaderboardModal({ onClose }) {
  const { t, tError } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/partner/leaderboard')
      .then(res => setRows(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load leaderboard')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title"
        style={{ '--modal-w': '560px', background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="leaderboard-title" style={{ margin: 0, fontSize: '1.1rem' }}>{t('Partner Leaderboard')}</h2>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {t('Paid registrations in completed exams')}
            </div>
          </div>
          <button onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.875rem' }}>{error}</div>
        ) : rows.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>{t('No partners yet.')}</p>
        ) : (
          <div className="table-scroll" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 52 }} />
                <col />
                <col style={{ width: 96 }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th} aria-label={t('Photo')} />
                  <th style={th}>{t('Partner')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('Registrations')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const stars = p.paid_registrations > 0 && i < 3 ? 3 - i : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: p.is_me ? '#ecfdf5' : '#fff' }}>
                      <td style={td}>
                        <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: '#cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                          {initials(p.full_name)}
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: p.is_me ? 700 : 500 }}>
                        <div className="wrap-text">
                          {stars > 0 && (
                            <span aria-label={`${stars} ★`} style={{ color: '#f59e0b', marginRight: '0.35rem', whiteSpace: 'nowrap' }}>{'★'.repeat(stars)}</span>
                          )}
                          {p.full_name}
                          {p.is_me && <span style={{ color: '#047857', fontWeight: 500, fontSize: '0.8rem' }}> ({t('you')})</span>}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{p.paid_registrations}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={onClose} className="btn-block"
            style={{ padding: '0.5rem 1.25rem', background: '#064e3b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

const th = { padding: '0.6rem 0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', overflowWrap: 'anywhere' };
const td = { padding: '0.5rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'middle' };
