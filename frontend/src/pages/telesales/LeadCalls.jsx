import React, { useEffect, useMemo, useState } from 'react';
import { createLeadCall, listAnswerOptions, listLeadCalls } from '../../api/telesalesLeads.api';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { useLanguage } from '../../i18n/LanguageContext';

// 'YYYY-MM-DDTHH:mm' in local time, for <input type="datetime-local">
const toLocalInput = (date) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const NEW_PREFIX = 'new:';

/**
 * Log a call for a lead: searchable answer (typing an answer that matches no option adds it as a
 * new shared option on save), when the call was made (defaults to now) and an optional note.
 */
export function CallLogForm({ leadId, onSaved }) {
  const { t, tError } = useLanguage();
  const [options, setOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [newAnswers, setNewAnswers] = useState([]);
  const [answer, setAnswer] = useState('');
  const [calledAt, setCalledAt] = useState(() => toLocalInput(Date.now()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const loadOptions = () => listAnswerOptions()
    .then(res => setOptions(res.data.data))
    .catch(err => setError(tError(err, 'Failed to load answers')))
    .finally(() => setOptionsLoading(false));
  useEffect(() => { loadOptions(); }, []);

  const selectOptions = useMemo(() => [
    ...options.map(o => ({ value: o.id, label: t(o.label) })),
    ...newAnswers.map(text => ({ value: NEW_PREFIX + text, label: text })),
  ], [options, newAnswers, t]);

  const addAnswer = (text) => {
    setNewAnswers(list => (list.includes(text) ? list : [...list, text]));
    setAnswer(NEW_PREFIX + text);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaved(false);
    if (!answer) { setError(t('Answer is required')); return; }
    const payload = {
      note,
      called_at: calledAt ? new Date(calledAt).toISOString() : null,
      ...(answer.startsWith(NEW_PREFIX) ? { answer: answer.slice(NEW_PREFIX.length) } : { answer_id: answer }),
    };
    setSaving(true);
    try {
      const res = await createLeadCall(leadId, payload);
      if (res.data.data.answer_created) loadOptions();
      setNewAnswers([]); setAnswer(''); setNote(''); setCalledAt(toLocalInput(Date.now()));
      setSaved(true);
      onSaved?.(res.data.data);
    } catch (err) {
      setError(tError(err, 'Failed to save call'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.85rem', marginBottom: '1rem' }}>
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>{t('Answer')} *</label>
          <SearchableSelect options={selectOptions} value={answer} onChange={v => setAnswer(v)} onCreate={addAnswer}
            loading={optionsLoading} required placeholder={t('Search or type an answer...')} />
        </div>
        <div>
          <label style={labelStyle}>{t('Called at')}</label>
          <input type="datetime-local" value={calledAt} max={toLocalInput(Date.now())} onChange={e => setCalledAt(e.target.value)}
            style={inputStyle} />
        </div>
      </div>
      <label style={labelStyle}>{t('Note')}</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={2000}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />

      {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }} className="wrap-text">{error}</div>}
      {saved && !error && <div style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.5rem' }}>{t('Call saved')}</div>}

      <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
        <button type="submit" disabled={saving} className="btn-block"
          style={{ padding: '0.5rem 1.25rem', background: '#c2410c', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'default' : 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('Saving...') : t('Save call')}
        </button>
      </div>
    </form>
  );
}

/** Call history, newest first */
export function CallHistory({ calls, loading, error }) {
  const { t } = useLanguage();
  if (loading) return <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>{t('Loading...')}</p>;
  if (error) return <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }} className="wrap-text">{error}</p>;
  if (!calls.length) return <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>{t('No calls yet.')}</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {calls.map(c => (
        <li key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem', minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.6rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{new Date(c.called_at).toLocaleString()}</span>
            <span style={answerBadge} className="wrap-text">{t(c.answer)}</span>
            <span style={{ color: '#64748b' }} className="wrap-text">{c.called_by_name || '—'}</span>
          </div>
          {c.note && <div style={{ color: '#334155', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }} className="wrap-text">{c.note}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Loads a lead's calls; reloads whenever `version` changes */
export function useLeadCalls(leadId, version = 0) {
  const { tError } = useLanguage();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    listLeadCalls(leadId)
      .then(res => { if (!cancelled) { setCalls(res.data.data); setError(''); } })
      .catch(err => { if (!cancelled) setError(tError(err, 'Failed to load calls')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leadId, version]);
  return { calls, loading, error };
}

/** Expanded list row: the lead's full call history */
export function CallHistoryPanel({ leadId, version }) {
  const { calls, loading, error } = useLeadCalls(leadId, version);
  return <CallHistory calls={calls} loading={loading} error={error} />;
}

/** "Log call" dialog opened from the lead list */
export function LogCallModal({ lead, onClose, onSaved }) {
  const { t } = useLanguage();

  useEffect(() => {
    // The answer dropdown handles Escape itself (closes its list) and marks the event as handled
    const onKey = e => e.key === 'Escape' && !e.defaultPrevented && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true"
        style={{ '--modal-w': '560px', background: '#fff', borderRadius: 12, padding: '1.5rem', width: 'min(560px, calc(100vw - 24px))', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }} className="wrap-text">{t('Log call')} — {lead.first_name} {lead.last_name}</h2>
            {lead.primary_phone && (
              <a href={`tel:${lead.primary_phone.replace(/[^\d+]/g, '')}`} style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                {lead.primary_phone}{lead.primary_phone_owner ? ` · ${t(lead.primary_phone_owner)}` : ''}
              </a>
            )}
          </div>
          <button onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1, flex: 'none' }}>✕</button>
        </div>
        <CallLogForm leadId={lead.id} onSaved={call => { onSaved?.(call); onClose(); }} />
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box', background: '#fff' };
const answerBadge = { background: '#ffedd5', color: '#9a3412', padding: '0.1rem 0.55rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 };
