import React, { useEffect, useState } from 'react';
import { listExamApplications, markApplicationMoved } from '../../api/examApplications.api';
import { useLanguage } from '../../i18n/LanguageContext';

// Applications sent from the landing page form (LV#81). "Added to Exam" only moves the
// application to "Students moved to exam"; the student is added to the exam by hand.
const fmtDateTime = v => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fullName = a => [a.first_name, a.last_name, a.father_name].filter(Boolean).join(' ');
const whatsappUrl = mobile => `https://wa.me/994${String(mobile).replace(/^0/, '')}`;

export default function ExamApplicationsPage() {
  const { t, tError } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [movedOpen, setMovedOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    listExamApplications()
      .then(res => { setItems(res.data.data); setError(''); })
      .catch(err => setError(tError(err, 'Failed to load applications')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleMoved = async app => {
    setBusyId(app.id);
    setError('');
    try {
      const res = await markApplicationMoved(app.id);
      setItems(list => list.map(a => (a.id === app.id ? { ...a, ...res.data.data } : a)));
    } catch (err) {
      setError(tError(err, 'Failed to update the application'));
      load();
    } finally {
      setBusyId(null);
    }
  };

  const exams = [...new Map(items.map(a => [a.exam_id, { id: a.exam_id, title: a.exam_title, at: a.exam_scheduled_at }])).values()]
    .sort((a, b) => new Date(a.at) - new Date(b.at));
  const filtered = examFilter ? items.filter(a => a.exam_id === examFilter) : items;
  const pending = filtered.filter(a => a.status === 'new');
  const moved = filtered.filter(a => a.status === 'moved');

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{t('Applications for Exams')}</h2>
        <div className="toolbar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={examFilter} onChange={e => setExamFilter(e.target.value)} style={{ ...inputStyle, width: 260 }}>
            <option value="">{t('All exams')}</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title} — {fmtDateTime(e.at)}</option>)}
          </select>
          <button type="button" onClick={load} style={secondaryBtn}>{t('Refresh')}</button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>
      ) : (
        <>
          <h3 style={h3Style}>{t('New applications ({n})', { n: pending.length })}</h3>
          {pending.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>{t('No new applications.')}</p>
          ) : (
            <ApplicationsTable rows={pending} t={t} action={a => (
              <button type="button" onClick={() => handleMoved(a)} disabled={busyId === a.id}
                style={{ ...primaryBtn, opacity: busyId === a.id ? 0.7 : 1, cursor: busyId === a.id ? 'not-allowed' : 'pointer' }}>
                {t('Added to Exam')}
              </button>
            )} />
          )}

          <div style={{ marginTop: '2rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <button type="button" onClick={() => setMovedOpen(o => !o)} aria-expanded={movedOpen}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: '0.85rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, color: '#334155', textAlign: 'left' }}>
              <span aria-hidden="true" style={{ display: 'inline-block', transition: 'transform .15s ease', transform: movedOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
              {t('Students moved to exam ({n})', { n: moved.length })}
            </button>
            {movedOpen && (
              <div style={{ padding: '0 1rem 1rem' }}>
                {moved.length === 0 ? (
                  <p style={{ color: '#94a3b8', margin: 0 }}>{t('No students moved to exam yet.')}</p>
                ) : (
                  <ApplicationsTable rows={moved} t={t} movedColumns />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationsTable({ rows, t, action, movedColumns = false }) {
  return (
    <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={th} className="hide-mobile">{t('Applied At')}</th>
            <th style={th}>{t('Full Name')}</th>
            <th style={th}>{t('Exam')}</th>
            <th style={th}>{t('Class')}</th>
            <th style={th} className="hide-mobile">{t('Section')}</th>
            <th style={th} className="hide-mobile">{t('Foreign Language')}</th>
            <th style={th}>{t('Mobile')}</th>
            {movedColumns && <th style={th}>{t('Moved At')}</th>}
            {movedColumns && <th style={th} className="hide-mobile">{t('Moved By')}</th>}
            {action && <th style={th} />}
          </tr>
        </thead>
        <tbody>
          {rows.map(a => (
            <tr key={a.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={{ ...td, whiteSpace: 'nowrap' }} className="hide-mobile">{fmtDateTime(a.created_at)}</td>
              <td style={td} className="wrap-text">{fullName(a)}</td>
              <td style={td} className="wrap-text">
                {a.exam_title}
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmtDateTime(a.exam_scheduled_at)}</div>
              </td>
              <td style={td}>{a.class_level}</td>
              <td style={td} className="hide-mobile">{t(a.sector)}</td>
              <td style={td} className="hide-mobile">{t(a.language)}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <a href={whatsappUrl(a.mobile_number)} target="_blank" rel="noopener noreferrer" title={t('Open in WhatsApp')} style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 500 }}>
                  {a.mobile_number}
                </a>
              </td>
              {movedColumns && <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDateTime(a.moved_at)}</td>}
              {movedColumns && <td style={td} className="hide-mobile wrap-text">{a.moved_by_name || '—'}</td>}
              {action && <td style={{ ...td, whiteSpace: 'nowrap' }}>{action(a)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'left' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const h3Style = { margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#334155' };
const inputStyle = { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box', background: '#fff' };
const primaryBtn = { background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 0.9rem', fontSize: '0.85rem', fontWeight: 600 };
const secondaryBtn = { background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.5rem 0.9rem', fontSize: '0.9rem', cursor: 'pointer' };
