import React, { useEffect, useState } from 'react';
import { getLeadFilterOptions, listAnswerOptions } from '../../api/telesalesLeads.api';
import { listSchoolOptions } from '../../api/schools.api';
import { listVillages } from '../../api/villages.api';
import useExtraInfoOptions from '../../hooks/useExtraInfoOptions';
import { useLanguage } from '../../i18n/LanguageContext';
import { extraInfoLabel } from './leadOptions';

/**
 * "More Filters" of the telesales lead list (LV#80). The values are kept in the URL and sent
 * to GET /api/telesales/leads with the same names; list fields are comma-separated there.
 */
const LIST_KEYS = ['last_answer', 'extra_info', 'school_ids', 'village_ids'];
const TEXT_KEYS = [
  'called_from', 'called_to', 'never_called', 'call_note', 'call_note_contains',
  'father_name', 'parent_name', 'income_source', 'knows_hedef', 'other_info', 'other_info_contains',
];

export const EMPTY_MORE_FILTERS = {
  ...Object.fromEntries(LIST_KEYS.map(k => [k, []])),
  ...Object.fromEntries(TEXT_KEYS.map(k => [k, ''])),
};

// URLSearchParams → filter object
export function moreFiltersFromParams(searchParams) {
  const f = { ...EMPTY_MORE_FILTERS };
  LIST_KEYS.forEach(k => { f[k] = (searchParams.get(k) || '').split(',').filter(Boolean); });
  TEXT_KEYS.forEach(k => { f[k] = searchParams.get(k) || ''; });
  return f;
}

// Filter object → query params (only the filled ones)
export function moreFiltersToParams(f) {
  const params = {};
  LIST_KEYS.forEach(k => { if (f[k].length) params[k] = f[k].join(','); });
  TEXT_KEYS.forEach(k => { if (f[k].trim()) params[k] = f[k].trim(); });
  if (params.never_called) { delete params.called_from; delete params.called_to; }
  return params;
}

// Number of filters in use, shown on the button; the date range counts as one
export function countMoreFilters(f) {
  const p = moreFiltersToParams(f);
  const range = p.called_from || p.called_to ? 1 : 0;
  return Object.keys(p).filter(k => k !== 'called_from' && k !== 'called_to').length + range;
}

// Long saved texts are cut in the dropdown; the full text is the value
const short = (s) => (s.length > 80 ? `${s.slice(0, 80)}…` : s);

export function MoreFiltersModal({ value, onApply, onClose }) {
  const { lang, t, tError } = useLanguage();
  const { options: extraOptions } = useExtraInfoOptions();
  const [draft, setDraft] = useState(value);
  const [answers, setAnswers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [villages, setVillages] = useState([]);
  const [saved, setSaved] = useState({ call_notes: [], income_sources: [], other_info: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    const toOptions = (res) => (res.data.data || []).map(r => ({ value: r.id, label: r.name }));
    Promise.all([listAnswerOptions(), listSchoolOptions(), listVillages(), getLeadFilterOptions()])
      .then(([a, s, v, o]) => {
        setAnswers(a.data.data.map(r => ({ value: r.id, label: t(r.label) })));
        setSchools(toOptions(s));
        setVillages(toOptions(v));
        setSaved(o.data.data);
      })
      .catch(err => setError(tError(err, 'Failed to load filter options')));
  }, []);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (name, v) => setDraft(d => ({ ...d, [name]: v }));
  const text = (name) => ({ value: draft[name], onChange: e => set(name, e.target.value), style: inputStyle });
  const savedSelect = (name, list) => (
    <select value={draft[name]} onChange={e => set(name, e.target.value)} style={inputStyle}>
      <option value="">{t('Any')}</option>
      {/* Keep a value from the URL that is no longer saved anywhere */}
      {draft[name] && !list.some(o => o.value.toLowerCase() === draft[name].toLowerCase()) && <option value={draft[name]}>{short(draft[name])}</option>}
      {list.map(o => <option key={o.value} value={o.value}>{short(o.value)} ({o.count})</option>)}
    </select>
  );
  const extraList = extraOptions.map(o => ({
    value: o.key,
    label: `${extraInfoLabel(o, lang)}${o.is_active ? '' : ` (${t('inactive')})`}`,
  }));

  const submit = (e) => { e.preventDefault(); onApply(draft); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="modal-card" role="dialog" aria-modal="true" aria-label={t('More Filters')}
        style={{ '--modal-w': '720px', background: '#fff', borderRadius: 12, padding: '1.75rem', width: 'min(720px, calc(100vw - 24px))', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('More Filters')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1, flex: 'none' }}>✕</button>
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">{error}</div>}

        <h3 style={sectionTitle}>{t('Calls')}</h3>
        <Field label={t('Last call response')}>
          <CheckList options={answers} selected={draft.last_answer} onChange={v => set('last_answer', v)} />
        </Field>
        <div className="form-grid" style={grid}>
          <Field label={t('Called from')}>
            <input type="date" {...text('called_from')} disabled={!!draft.never_called} />
          </Field>
          <Field label={t('Called to')}>
            <input type="date" {...text('called_to')} disabled={!!draft.never_called} />
          </Field>
        </div>
        <label className="lead-check" style={checkLabel}>
          <input type="checkbox" checked={!!draft.never_called} onChange={e => set('never_called', e.target.checked ? 'true' : '')} style={checkbox} />
          <span>{t('Never called')}</span>
        </label>
        <div className="form-grid" style={{ ...grid, marginTop: '0.75rem' }}>
          <Field label={t('Call note')}>{savedSelect('call_note', saved.call_notes)}</Field>
          <Field label={t('Call note contains')}><input {...text('call_note_contains')} /></Field>
        </div>

        <h3 style={sectionTitle}>{t('Student')}</h3>
        <div className="form-grid" style={grid}>
          <Field label={t('School')}>
            <CheckList options={schools} selected={draft.school_ids} onChange={v => set('school_ids', v)} searchPlaceholder={t('Search school...')} />
          </Field>
          <Field label={t('Village / Street')}>
            <CheckList options={villages} selected={draft.village_ids} onChange={v => set('village_ids', v)} searchPlaceholder={t('Search village / street...')} />
          </Field>
        </div>

        <h3 style={sectionTitle}>{t('Family')}</h3>
        <div className="form-grid" style={grid}>
          <Field label={t('Father Name')}><input {...text('father_name')} placeholder={t('Contains...')} /></Field>
          <Field label={t('Mother / parent in charge')}><input {...text('parent_name')} placeholder={t('Contains...')} /></Field>
          <Field label={t('How they earn money')}>{savedSelect('income_source', saved.income_sources)}</Field>
          <Field label={t('Knows someone studying in HƏDƏF?')}>
            <div className="radio-row" role="radiogroup" style={{ display: 'flex', gap: '1rem', alignItems: 'center', minHeight: 38 }}>
              {[['', 'Any'], ['yes', 'Yes'], ['no', 'No']].map(([v, label]) => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" name="knows_hedef" checked={draft.knows_hedef === v} onChange={() => set('knows_hedef', v)} />
                  {t(label)}
                </label>
              ))}
            </div>
          </Field>
        </div>

        <h3 style={sectionTitle}>{t('Extra information')}</h3>
        <Field label={t('Has all checked options')}>
          <CheckList options={extraList} selected={draft.extra_info} onChange={v => set('extra_info', v)} />
        </Field>
        <div className="form-grid" style={grid}>
          <Field label={t('Other information')}>{savedSelect('other_info', saved.other_info)}</Field>
          <Field label={t('Other information contains')}><input {...text('other_info_contains')} /></Field>
        </div>

        <div className="stack-mobile" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" onClick={() => setDraft(EMPTY_MORE_FILTERS)} style={{ ...secondaryBtn, marginRight: 'auto' }}>{t('Reset')}</button>
          <button type="button" onClick={onClose} style={secondaryBtn}>{t('Cancel')}</button>
          <button type="submit" style={primaryBtn}>{t('Apply filters')}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0, marginBottom: '0.75rem' }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

// Multi-select as a scrollable checkbox list; optional search box for long lists
function CheckList({ options, selected, onChange, searchPlaceholder }) {
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const needle = q.trim().toLowerCase();
  // Checked ones stay visible while searching
  const shown = needle ? options.filter(o => selected.includes(o.value) || o.label.toLowerCase().includes(needle)) : options;
  return (
    <div>
      {searchPlaceholder && (
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder} style={{ ...inputStyle, marginBottom: '0.35rem' }} />
      )}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, maxHeight: 180, overflowY: 'auto', padding: '0.25rem 0.6rem' }}>
        {shown.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.35rem 0' }}>{t('No options')}</div>}
        {shown.map(o => (
          <label key={o.value} className="lead-check" style={checkLabel}>
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} style={checkbox} />
            <span className="wrap-text">{o.label}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{t('{n} selected', { n: selected.length })}</div>
      )}
    </div>
  );
}

const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' };
const sectionTitle = { fontSize: '0.95rem', color: '#7c2d12', margin: '0.5rem 0 0.75rem', paddingBottom: '0.35rem', borderBottom: '1px solid #fed7aa' };
const labelStyle = { fontWeight: 500, fontSize: '0.85rem', marginBottom: '0.3rem', color: '#374151' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' };
const checkLabel = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.9rem', cursor: 'pointer' };
const checkbox = { width: 16, height: 16, flex: 'none' };
const secondaryBtn = { padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' };
const primaryBtn = { padding: '0.55rem 1.5rem', background: '#c2410c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' };
