import React, { useEffect, useState } from 'react';
import { listCallbacks } from '../../api/telesalesLeads.api';
import { useAuth } from '../../contexts/AuthContext';
import { endOfToday } from '../../hooks/useDueCallbacks';
import { useLanguage } from '../../i18n/LanguageContext';
import { LogCallModal } from './LeadCalls';
import { LeadDetailsModal } from './LeadsPage';

const dash = <span style={{ color: '#cbd5e1' }}>—</span>;

const GROUPS = [
  { key: 'overdue', title: 'Overdue', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  { key: 'today', title: 'Due today', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { key: 'upcoming', title: 'Upcoming', color: '#334155', bg: '#fff', border: '#e2e8f0' },
];

/**
 * Open callbacks of every telesales user, grouped into overdue / due today / upcoming (in the
 * browser's time zone), with the owner shown. Mounted at /telesales/callbacks and
 * /admin/telesales/callbacks. Logging a call for the lead closes its callback.
 */
export default function CallbacksPage() {
  const { user } = useAuth();
  const { t, tError } = useLanguage();
  const formBase = user?.role === 'admin' ? '/admin/telesales/leads' : '/telesales/leads';

  const [callbacks, setCallbacks] = useState([]);
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [logCallFor, setLogCallFor] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const load = (onlyMine = mine, quiet = false) => {
    if (!quiet) setLoading(true);
    return listCallbacks(onlyMine ? { mine: 'true' } : {})
      .then(res => { setCallbacks(res.data.data); setNow(new Date()); setError(''); })
      .catch(err => setError(tError(err, 'Failed to load callbacks')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleMine = (value) => { setMine(value); load(value); };

  const afterCall = () => { setNotice(t('Call saved')); load(mine, true); };
  const afterStatusChange = (lead) => {
    setDetailsId(null);
    if (lead.is_phone_invalid) {
      setNotice(t('{name} was moved to "Phone numbers are invalid".', { name: `${lead.first_name} ${lead.last_name}` }));
    }
    load(mine, true);
  };

  const dayEnd = endOfToday();
  const groups = { overdue: [], today: [], upcoming: [] };
  callbacks.forEach(cb => {
    const due = new Date(cb.due_at);
    groups[due < now ? 'overdue' : due <= dayEnd ? 'today' : 'upcoming'].push(cb);
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{t('Callbacks')}</h2>
        <div className="callback-filter" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" aria-pressed={!mine} onClick={() => toggleMine(false)} style={tabBtn(!mine)}>{t('All callbacks')}</button>
          <button type="button" aria-pressed={mine} onClick={() => toggleMine(true)} style={tabBtn(mine)}>{t('Only mine')}</button>
          <button type="button" onClick={() => load(mine)} style={tabBtn(false)}>{t('Refresh')}</button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">{error}</div>}
      {notice && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">{notice}</div>}

      {loading ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : (
        callbacks.length === 0 ? (
          <p style={{ color: '#94a3b8', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>{t('No callbacks scheduled.')}</p>
        ) : GROUPS.map(g => (
          <section key={g.key} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: g.color, margin: '0 0 0.5rem' }}>{t(g.title)} ({groups[g.key].length})</h3>
            {groups[g.key].length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>{t('None')}</p>
            ) : (
              <div className="table-scroll" style={{ background: g.bg, border: `1px solid ${g.border}`, borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${g.border}` }}>
                      <th style={th}>{t('Call back on')}</th>
                      <th style={th}>{t('Name / Surname')}</th>
                      <th style={th}>{t('Primary phone')}</th>
                      <th style={th} className="hide-mobile">{t('Last answer')}</th>
                      <th style={th}>{t('Scheduled by')}</th>
                      <th style={th}>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups[g.key].map(cb => (
                      <tr key={cb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 600, color: g.color }}>
                          {g.key === 'upcoming' ? new Date(cb.due_at).toLocaleString() : new Date(cb.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {g.key === 'overdue' && <div style={{ fontSize: '0.75rem', fontWeight: 400 }}>{new Date(cb.due_at).toLocaleDateString()}</div>}
                        </td>
                        <td style={td} className="wrap-text">
                          <button type="button" onClick={() => setDetailsId(cb.lead_id)} className="lead-name-btn" style={nameBtn}>
                            {cb.first_name} {cb.last_name}
                          </button>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cb.school_name} · {t('Class')} {cb.class_level}</div>
                        </td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          {cb.primary_phone ? <a href={`tel:${cb.primary_phone.replace(/[^\d+]/g, '')}`} style={{ color: '#1e293b' }}>{cb.primary_phone}</a> : dash}
                          {cb.primary_phone_owner && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t(cb.primary_phone_owner)}</div>}
                        </td>
                        <td style={td} className="hide-mobile wrap-text">
                          {cb.answer ? t(cb.answer) : dash}
                          {cb.note && <div style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'pre-wrap' }}>{cb.note}</div>}
                        </td>
                        <td style={td} className="wrap-text">
                          {cb.scheduled_by_name || dash}
                          {cb.scheduled_by === user?.id && <span style={meBadge}>{t('me')}</span>}
                        </td>
                        <td style={td}>
                          <button type="button" onClick={() => { setNotice(''); setLogCallFor(cb); }} className="lead-action-btn callback-call-btn" style={callBtn}>{t('Log call')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))
      )}

      {logCallFor && (
        <LogCallModal
          lead={{ id: logCallFor.lead_id, first_name: logCallFor.first_name, last_name: logCallFor.last_name, primary_phone: logCallFor.primary_phone, primary_phone_owner: logCallFor.primary_phone_owner }}
          onClose={() => setLogCallFor(null)} onSaved={afterCall} />
      )}
      {detailsId && (
        <LeadDetailsModal id={detailsId} editPath={`${formBase}/${detailsId}/edit`} onClose={() => setDetailsId(null)}
          onCallLogged={() => load(mine, true)} onStatusChange={afterStatusChange} />
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'top' };
const nameBtn = { font: 'inherit', background: 'none', border: 'none', padding: 0, color: '#c2410c', fontWeight: 600, cursor: 'pointer', textAlign: 'left' };
const callBtn = { background: '#c2410c', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' };
const meBadge = { marginLeft: '0.4rem', background: '#ffedd5', color: '#9a3412', padding: '0.05rem 0.45rem', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 };
const tabBtn = (active) => ({
  padding: '0.45rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
  border: `1px solid ${active ? '#c2410c' : '#cbd5e1'}`, background: active ? '#c2410c' : '#fff', color: active ? '#fff' : '#334155',
});
