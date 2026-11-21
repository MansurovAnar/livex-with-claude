import React, { useEffect, useState } from 'react';
import { listCallbacks } from '../../api/telesalesLeads.api';
import { useAuth } from '../../contexts/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import { CALLBACKS_CHANGED } from '../../hooks/useDueCallbacks';
import { useLanguage } from '../../i18n/LanguageContext';
import { LogCallModal } from '../../pages/telesales/LeadCalls';

const POLL_MS = 60 * 1000;
const MAX_STRIP_ICONS = 8;

const PhoneIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
  </svg>
);

/**
 * LV#73: right-side "Overdue calls" panel in the telesales layout. Lists every open callback whose
 * due time has passed (all telesales users, like the Callbacks page) and refreshes every minute,
 * on navigation and after a call is logged. Minimizable to a strip of call icons (desktop) or a
 * floating call button (mobile, where it starts minimized). Renders nothing once no call is overdue.
 */
export default function OverdueCallsPanel({ refreshKey }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [overdue, setOverdue] = useState([]);
  const [minimized, setMinimized] = useState(isMobile);
  const [logCallFor, setLogCallFor] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => listCallbacks({})
      .then(res => {
        if (cancelled) return;
        const now = new Date();
        setOverdue(res.data.data.filter(cb => new Date(cb.due_at) < now));
      })
      .catch(() => { /* panel is best-effort, like the sidebar badge */ });
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(CALLBACKS_CHANGED, load);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener(CALLBACKS_CHANGED, load); };
  }, [refreshKey]);

  const modal = logCallFor && (
    <LogCallModal
      lead={{ id: logCallFor.lead_id, first_name: logCallFor.first_name, last_name: logCallFor.last_name, primary_phone: logCallFor.primary_phone, primary_phone_owner: logCallFor.primary_phone_owner }}
      onClose={() => setLogCallFor(null)} />
  );

  // All overdue calls cleared → the panel closes
  if (overdue.length === 0) return modal || null;

  const countLabel = t('{n} overdue calls', { n: overdue.length });

  if (minimized) {
    if (isMobile) {
      return (
        <>
          <button type="button" className="overdue-fab" onClick={() => setMinimized(false)} aria-label={countLabel} title={countLabel} style={fab}>
            <PhoneIcon size={24} />
            <span style={{ ...badge, position: 'absolute', top: -4, right: -4 }}>{overdue.length}</span>
          </button>
          {modal}
        </>
      );
    }
    const shown = overdue.slice(0, MAX_STRIP_ICONS);
    return (
      <>
        <aside className="overdue-strip" aria-label={t('Overdue calls')} style={strip}>
          <button type="button" onClick={() => setMinimized(false)} aria-label={countLabel} title={countLabel} style={stripToggle}>
            <PhoneIcon size={20} />
            <span style={badge}>{overdue.length}</span>
          </button>
          {shown.map(cb => (
            <button key={cb.id} type="button" onClick={() => setLogCallFor(cb)} style={stripIcon}
              title={`${cb.first_name} ${cb.last_name} — ${new Date(cb.due_at).toLocaleString()}`}
              aria-label={`${t('Log call')} — ${cb.first_name} ${cb.last_name}`}>
              <PhoneIcon size={16} />
            </button>
          ))}
          {overdue.length > shown.length && (
            <button type="button" onClick={() => setMinimized(false)} style={{ ...stripIcon, fontSize: '0.72rem', fontWeight: 700 }}>
              +{overdue.length - shown.length}
            </button>
          )}
        </aside>
        {modal}
      </>
    );
  }

  return (
    <>
      <aside className="overdue-panel" aria-label={t('Overdue calls')} style={isMobile ? { ...panel, ...panelMobile } : panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0.9rem', borderBottom: '1px solid #fecaca', background: '#fef2f2', position: 'sticky', top: 0, zIndex: 1 }}>
          <span style={{ color: '#b91c1c' }}><PhoneIcon size={18} /></span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#b91c1c', flex: 1, minWidth: 0 }}>{t('Overdue calls')}</h3>
          <span style={badge}>{overdue.length}</span>
          <button type="button" onClick={() => setMinimized(true)} aria-label={t('Minimize')} title={t('Minimize')} style={minimizeBtn}>—</button>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: '0.5rem' }}>
          {overdue.map(cb => (
            <li key={cb.id} style={item}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>{new Date(cb.due_at).toLocaleString()}</div>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }} className="wrap-text">{cb.first_name} {cb.last_name}</div>
              <div style={meta} className="wrap-text">{cb.school_name} · {t('Class')} {cb.class_level}</div>
              {cb.primary_phone && (
                <div style={{ fontSize: '0.85rem' }}>
                  <a href={`tel:${cb.primary_phone.replace(/[^\d+]/g, '')}`} style={{ color: '#1e293b' }}>{cb.primary_phone}</a>
                  {cb.primary_phone_owner && <span style={meta}> · {t(cb.primary_phone_owner)}</span>}
                </div>
              )}
              {(cb.answer || cb.note) && (
                <div style={meta} className="wrap-text">
                  {t('Last answer')}: {cb.answer ? t(cb.answer) : '—'}
                  {cb.note && <div style={{ whiteSpace: 'pre-wrap' }}>{cb.note}</div>}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <span style={meta} className="wrap-text">
                  {t('Scheduled by')}: {cb.scheduled_by_name || '—'}{cb.scheduled_by === user?.id ? ` (${t('me')})` : ''}
                </span>
                <button type="button" onClick={() => setLogCallFor(cb)} className="overdue-call-btn" style={callBtn}>{t('Log call')}</button>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      {modal}
    </>
  );
}

const badge = { minWidth: 20, padding: '0 6px', borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: '0.72rem', fontWeight: 700, lineHeight: '20px', textAlign: 'center', flex: 'none' };
const meta = { fontSize: '0.78rem', color: '#64748b' };
// Desktop: a flex column beside <main>, so it narrows the content instead of covering it
const panel = { width: 300, flex: 'none', position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh', overflowY: 'auto', background: '#fff', borderLeft: '1px solid #fecaca', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' };
// Mobile: drawer from the right that leaves a strip of the page visible
const panelMobile = { position: 'fixed', top: 0, right: 0, bottom: 0, height: 'auto', width: 'min(320px, calc(100vw - 48px))', zIndex: 900, boxShadow: '-4px 0 16px rgba(0,0,0,0.18)' };
const strip = { width: 56, flex: 'none', position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh', overflowY: 'auto', background: '#fff', borderLeft: '1px solid #fecaca', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0' };
const stripToggle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '0.4rem', cursor: 'pointer' };
const stripIcon = { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '50%', cursor: 'pointer', padding: 0 };
const fab = { position: 'fixed', right: 16, bottom: 16, zIndex: 900, width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', cursor: 'pointer', padding: 0 };
const minimizeBtn = { background: 'none', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, width: 32, height: 28, cursor: 'pointer', fontWeight: 700, flex: 'none', padding: 0 };
const item = { background: '#fff', border: '1px solid #fee2e2', borderRadius: 8, padding: '0.6rem 0.7rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' };
const callBtn = { background: '#c2410c', color: '#fff', border: 'none', borderRadius: 4, padding: '0.3rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' };
