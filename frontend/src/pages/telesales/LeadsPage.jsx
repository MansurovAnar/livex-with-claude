import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLead, listLeads, setLeadPhoneInvalid } from '../../api/telesalesLeads.api';
import { PageSizeSelect, PaginationBar } from '../../components/shared/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { CLASSES, EXTRA_INFO, LANGUAGES, SECTORS } from './leadOptions';

const emptyFilters = { class_level: '', sector: '', language: '' };
const dash = <span style={{ color: '#cbd5e1' }}>—</span>;

/**
 * Telesales lead list. Mounted at /telesales (telesales) and /admin/telesales/leads (admin);
 * both roles see every lead and can edit it. Clicking a name opens the details modal.
 * Leads marked "phone number is not valid" live in a separate section and can be restored from there.
 */
export default function LeadsPage() {
  const { user } = useAuth();
  const { t, tError } = useLanguage();
  const formBase = user?.role === 'admin' ? '/admin/telesales/leads' : '/telesales/leads';

  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsId, setDetailsId] = useState(null);
  const [invalidView, setInvalidView] = useState(false);
  const [invalidTotal, setInvalidTotal] = useState(0);
  const [notice, setNotice] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const load = (q = search, f = filters, p = 1, l = limit, inv = invalidView) => {
    setLoading(true);
    const params = { page: p, limit: l };
    if (inv) params.invalid = 'true';
    if (q.trim()) params.q = q.trim();
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
    return listLeads(params)
      .then(res => {
        const { data, meta } = res.data;
        setLeads(data); setTotal(meta.total); setInvalidTotal(meta.invalid_total || 0); setPage(p); setError('');
      })
      .catch(err => setError(tError(err, 'Failed to load leads')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const changeFilter = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    load(search, next, 1);
  };
  const clearAll = () => {
    setSearch(''); setFilters(emptyFilters);
    load('', emptyFilters, 1);
  };
  const handleLimitChange = (l) => { setLimit(l); load(search, filters, 1, l); };
  const hasFilter = search.trim() || Object.values(filters).some(Boolean);

  const switchView = (inv) => {
    if (inv === invalidView) return;
    setInvalidView(inv); setNotice('');
    load(search, filters, 1, limit, inv);
  };

  // Called after a lead was moved to / restored from the invalid section; stays on the same page if it still exists
  const afterStatusChange = (lead) => {
    const name = `${lead.first_name} ${lead.last_name}`;
    setDetailsId(null);
    setNotice(lead.is_phone_invalid
      ? t('{name} was moved to "Phone numbers are invalid".', { name })
      : t('{name} was restored to the main list.', { name }));
    const lastPage = Math.max(1, Math.ceil((total - 1) / limit));
    load(search, filters, Math.min(page, lastPage));
  };

  const restore = (l) => {
    if (!window.confirm(t('Restore {name} to the main list?', { name: `${l.first_name} ${l.last_name}` }))) return;
    setRestoringId(l.id);
    setLeadPhoneInvalid(l.id, false)
      .then(res => afterStatusChange(res.data.data))
      .catch(err => setError(tError(err, 'Failed to update lead')))
      .finally(() => setRestoringId(null));
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{t('Leads')}</h2>
        <Link to={`${formBase}/new`} style={{ background: '#c2410c', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.9rem', fontWeight: 500 }}>
          {t('+ Add Lead')}
        </Link>
      </div>

      <div className="lead-tabs" role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button type="button" role="tab" aria-selected={!invalidView} onClick={() => switchView(false)} style={tabBtn(!invalidView)}>
          {t('Main list')}
        </button>
        <button type="button" role="tab" aria-selected={invalidView} onClick={() => switchView(true)} style={tabBtn(invalidView)}>
          {t('Phone numbers are invalid')} ({invalidTotal})
        </button>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(search, filters, 1)}
          placeholder={t('Search name, school or phone...')}
          style={{ flex: '1 1 240px', minWidth: 0, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.95rem' }} />
        <select value={filters.class_level} onChange={e => changeFilter('class_level', e.target.value)} style={filterSelect}>
          <option value="">{t('All classes')}</option>
          {CLASSES.map(c => <option key={c} value={c}>{t('Class')} {c}</option>)}
        </select>
        <select value={filters.sector} onChange={e => changeFilter('sector', e.target.value)} style={filterSelect}>
          <option value="">{t('All sectors')}</option>
          {SECTORS.map(s => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <select value={filters.language} onChange={e => changeFilter('language', e.target.value)} style={filterSelect}>
          <option value="">{t('All languages')}</option>
          {LANGUAGES.map(l => <option key={l} value={l}>{t(l)}</option>)}
        </select>
        <button onClick={() => load(search, filters, 1)} style={{ padding: '0.5rem 1rem', background: '#c2410c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{t('Search')}</button>
        {hasFilter && (
          <button onClick={clearAll} style={{ padding: '0.5rem 1rem', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}>{t('Clear')}</button>
        )}
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">{error}</div>}
      {notice && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">{notice}</div>}

      <div className="pagination-top" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <PageSizeSelect limit={limit} onLimitChange={handleLimitChange} />
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : (
        <>
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>{t('Name / Surname')}</th>
                  <th style={th} className="hide-mobile">{t('School')}</th>
                  <th style={th}>{t('Class')}</th>
                  <th style={th}>{t('Primary phone')}</th>
                  <th style={th} className="hide-mobile">{t('Last call')}</th>
                  <th style={th} className="hide-mobile">{t('Last answer')}</th>
                  <th style={th}>{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{invalidView ? t('No leads with an invalid phone number.') : t('No leads found.')}</td></tr>
                ) : leads.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={td} className="wrap-text">
                      <button type="button" onClick={() => setDetailsId(l.id)} className="lead-name-btn" style={nameBtn}>
                        {l.first_name} {l.last_name}
                      </button>
                    </td>
                    <td style={td} className="hide-mobile wrap-text">{l.school_name}</td>
                    <td style={td}>{l.class_level}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {l.primary_phone ? <a href={`tel:${l.primary_phone.replace(/[^\d+]/g, '')}`} style={{ color: '#1e293b' }}>{l.primary_phone}</a> : dash}
                      {l.primary_phone_owner && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t(l.primary_phone_owner)}</div>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }} className="hide-mobile">{l.last_call_at ? new Date(l.last_call_at).toLocaleString() : dash}</td>
                    <td style={td} className="hide-mobile wrap-text">{l.last_answer || dash}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <div className="lead-row-actions" style={{ display: 'flex', gap: '0.4rem' }}>
                        <Link to={`${formBase}/${l.id}/edit`} className="lead-edit-link" style={editLink}>{t('Edit')}</Link>
                        {l.is_phone_invalid && (
                          <button type="button" onClick={() => restore(l)} disabled={restoringId === l.id} className="lead-restore-btn" style={restoreBtn}>
                            {t('Restore')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} limit={limit} total={total} onPageChange={p => load(search, filters, p)} />
        </>
      )}

      {detailsId && <LeadDetailsModal id={detailsId} editPath={`${formBase}/${detailsId}/edit`} onClose={() => setDetailsId(null)} onStatusChange={afterStatusChange} />}
    </div>
  );
}

function LeadDetailsModal({ id, editPath, onClose, onStatusChange }) {
  const { t, tError } = useLanguage();
  const [lead, setLead] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const togglePhoneInvalid = () => {
    const name = `${lead.first_name} ${lead.last_name}`;
    const question = lead.is_phone_invalid
      ? t('Restore {name} to the main list?', { name })
      : t('Mark the phone number of {name} as not valid? The lead moves to "Phone numbers are invalid".', { name });
    if (!window.confirm(question)) return;
    setSaving(true);
    setLeadPhoneInvalid(lead.id, !lead.is_phone_invalid)
      .then(res => onStatusChange(res.data.data))
      .catch(err => { setError(tError(err, 'Failed to update lead')); setSaving(false); });
  };

  useEffect(() => {
    getLead(id)
      .then(res => setLead(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load lead')));
  }, [id]);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const extras = lead ? EXTRA_INFO.filter(o => (lead.extra_info || []).includes(o.value)) : [];
  const parent = lead && [lead.parent_name, lead.parent_relation && `(${t(lead.parent_relation)})`].filter(Boolean).join(' ');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true"
        style={{ '--modal-w': '640px', background: '#fff', borderRadius: 12, padding: '1.75rem', width: 'min(640px, calc(100vw - 24px))', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }} className="wrap-text">
            {lead ? `${lead.first_name} ${lead.last_name}` : t('Lead details')}
          </h2>
          <button onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1, flex: 'none' }}>✕</button>
        </div>

        {lead?.is_phone_invalid && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.6rem 0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {t('Phone number is not valid')}
          </div>
        )}
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">{error}</div>}
        {!lead && !error && <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>}

        {lead && (
          <>
            <h3 style={sectionTitle}>{t('Student')}</h3>
            <dl className="form-grid" style={detailGrid}>
              <Item label={t('School')}>{lead.school_name}</Item>
              <Item label={t('Village / Street')}>{lead.village_name}</Item>
              <Item label={t('Class')}>{lead.class_level}</Item>
              <Item label={t('Sector')}>{lead.sector && t(lead.sector)}</Item>
              <Item label={t('Language')}>{lead.language && t(lead.language)}</Item>
            </dl>

            <h3 style={sectionTitle}>{t('Phone numbers')}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
              {(lead.phones || []).map(p => (
                <li key={p.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '0.35rem 0', fontSize: '0.9rem' }}>
                  <a href={`tel:${p.phone_number.replace(/[^\d+]/g, '')}`} style={{ color: '#1e293b', fontWeight: 600 }}>{p.phone_number}</a>
                  {p.owner_label && <span style={{ color: '#64748b' }}>{t(p.owner_label)}</span>}
                  {p.is_primary && <span style={badge}>{t('Main phone')}</span>}
                </li>
              ))}
            </ul>

            <h3 style={sectionTitle}>{t('Family')}</h3>
            <dl className="form-grid" style={detailGrid}>
              <Item label={t('Father Name')}>{lead.father_name}</Item>
              <Item label={t('Mother / parent in charge')}>{parent}</Item>
              <Item label={t('How they earn money')} wide>{lead.income_source}</Item>
              <Item label={t('Knows someone studying in HƏDƏF?')} wide>
                {lead.knows_hedef_student ? `${t('Yes')}${lead.hedef_student_name ? ` — ${lead.hedef_student_name}` : ''}` : t('No')}
              </Item>
            </dl>

            <h3 style={sectionTitle}>{t('Extra information')}</h3>
            {extras.length ? (
              <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#1e293b' }}>
                {extras.map(o => (
                  <li key={o.value}>
                    {t(o.label)}
                    {o.value === 'another_student_at_home' && lead.another_student_class && ` — ${t('Class')} ${lead.another_student_class}`}
                  </li>
                ))}
              </ul>
            ) : <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{dash}</p>}
            <dl style={{ margin: 0 }}>
              <Item label={t('Other information')}>{lead.extra_info_other}</Item>
            </dl>

            <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.5rem 0 1.25rem' }} className="wrap-text">
              {t('Added {date} by {name}', { date: new Date(lead.created_at).toLocaleString(), name: lead.created_by_name || '—' })}
              <br />
              {t('Last updated {date} by {name}', { date: new Date(lead.updated_at).toLocaleString(), name: lead.updated_by_name || '—' })}
            </div>

            <div className="stack-mobile" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={togglePhoneInvalid} disabled={saving} className="btn-block"
                style={lead.is_phone_invalid ? restoreModalBtn : invalidModalBtn}>
                {lead.is_phone_invalid ? t('Restore to main list') : t('Phone number is not valid')}
              </button>
              <button type="button" onClick={onClose}
                style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                {t('Close')}
              </button>
              <Link to={editPath} className="btn-block"
                style={{ padding: '0.55rem 1.5rem', background: '#c2410c', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: '0.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('Edit')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Item({ label, children, wide }) {
  const empty = children === null || children === undefined || children === '' || children === false;
  return (
    <div style={{ minWidth: 0, marginBottom: '0.75rem', gridColumn: wide ? '1 / -1' : undefined }}>
      <dt style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.15rem' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }} className="wrap-text">{empty ? dash : children}</dd>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'top' };
const nameBtn = { font: 'inherit', background: 'none', border: 'none', padding: 0, color: '#c2410c', fontWeight: 600, cursor: 'pointer', textAlign: 'left' };
const editLink = { background: '#475569', color: '#fff', borderRadius: 4, padding: '0.25rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-block' };
const restoreBtn = { background: '#15803d', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' };
const invalidModalBtn = { padding: '0.55rem 1.25rem', background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem', marginRight: 'auto' };
const restoreModalBtn = { ...invalidModalBtn, background: '#15803d', color: '#fff', border: '1px solid #15803d' };
const tabBtn = (active) => ({
  padding: '0.45rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
  border: `1px solid ${active ? '#c2410c' : '#cbd5e1'}`, background: active ? '#c2410c' : '#fff', color: active ? '#fff' : '#334155',
});
const filterSelect = { padding: '0.5rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.9rem', background: '#fff' };
const sectionTitle = { fontSize: '0.95rem', color: '#7c2d12', margin: '0.25rem 0 0.75rem', paddingBottom: '0.35rem', borderBottom: '1px solid #fed7aa' };
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', margin: '0 0 0.5rem' };
const badge = { background: '#ffedd5', color: '#c2410c', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 };
