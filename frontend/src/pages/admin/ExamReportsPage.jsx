import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExamPaymentsReport } from '../../api/exams.api';
import ExamPaymentsSummary, { formatAzn } from '../../components/monitor/ExamPaymentsSummary';
import { useLanguage } from '../../i18n/LanguageContext';

const MONEY_COLUMNS = [
  { key: 'expected_total', label: 'Expected' },
  { key: 'paid_total', label: 'Paid' },
  { key: 'paid_card', label: 'Card' },
  { key: 'paid_cash', label: 'Cash' },
  { key: 'paid_unspecified', label: 'Unspecified', optional: true },
  { key: 'outstanding_total', label: 'Outstanding' },
  { key: 'commission_total', label: 'Commission' },
  { key: 'expenses_total', label: 'Expenses' },
  { key: 'left_in_hand', label: 'Left in hand' },
];
const COUNT_FIELDS = ['registered_count', 'fully_paid_count', 'partly_paid_count', 'unpaid_count'];

// Exam states selectable in the report (LV#71); completed only by default
const STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing', color: '#16a34a' },
  { value: 'completed', label: 'Completed', color: '#64748b' },
  { value: 'scheduled', label: 'Scheduled', color: '#2563eb' },
  { value: 'cancelled', label: 'Cancelled', color: '#dc2626' },
];
const statusColor = (s) => STATUS_OPTIONS.find(o => o.value === s)?.color || '#64748b';

// Totals over the exams currently shown, so they follow the exam selection
function sumTotals(exams) {
  const totals = { exam_count: exams.length };
  for (const f of [...MONEY_COLUMNS.map(c => c.key), ...COUNT_FIELDS]) {
    totals[f] = Math.round(exams.reduce((sum, e) => sum + Number(e[f] || 0), 0) * 100) / 100;
  }
  return totals;
}

export default function ExamReportsPage() {
  const navigate = useNavigate();
  const { t, tError } = useLanguage();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statuses, setStatuses] = useState(['completed']);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (from && to && from > to) {
      setError(t("'From' date must not be after 'To' date."));
      return;
    }
    setError('');
    setLoading(true);
    getExamPaymentsReport({ from: from || undefined, to: to || undefined, status: statuses.join(',') })
      .then(res => {
        const data = res.data.data;
        setReport(data);
        // Keep only selections that are still in the filtered list
        const ids = new Set(data.exams.map(e => e.id));
        setSelectedIds(prev => prev.filter(id => ids.has(id)));
      })
      .catch(err => setError(tError(err, 'Failed to load report')))
      .finally(() => setLoading(false));
  }, [from, to, statuses]);

  const allExams = report?.exams || [];
  const exams = selectedIds.length ? allExams.filter(e => selectedIds.includes(e.id)) : allExams;
  const totals = useMemo(() => (report ? sumTotals(exams) : null), [report, selectedIds]);
  const columns = MONEY_COLUMNS.filter(c => !c.optional || (totals && totals[c.key] > 0));

  const search = examSearch.trim().toLowerCase();
  const pickerExams = search
    ? allExams.filter(e => `${e.title} ${e.exam_location || ''}`.toLowerCase().includes(search))
    : allExams;

  const toggleStatus = (value) => {
    setStatuses(prev => {
      if (prev.includes(value)) return prev.length === 1 ? prev : prev.filter(s => s !== value);
      return STATUS_OPTIONS.map(o => o.value).filter(s => s === value || prev.includes(s));
    });
  };
  const toggleExam = (id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const statusLabels = STATUS_OPTIONS.filter(o => statuses.includes(o.value)).map(o => t(o.label)).join(', ');
  const examsLabel = selectedIds.length
    ? t('{n} of {total} exams selected', { n: selectedIds.length, total: allExams.length })
    : t('All exams ({n})', { n: allExams.length });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('Exam Reports')}</h2>
        <button onClick={() => navigate('/admin/exams')}
          style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          {t('Back to Exams')}
        </button>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>{t('Exam date from')}</label>
          <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('Exam date to')}</label>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={inputStyle} />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }}
            style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
            {t('Clear dates')}
          </button>
        )}
      </div>

      <div className="report-filters" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>{t('Exam state')}</label>
          <div className="report-status-chips" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(o => {
              const active = statuses.includes(o.value);
              return (
                <label key={o.value} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: 16, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, border: `1px solid ${active ? o.color : '#cbd5e1'}`, background: active ? `${o.color}14` : '#fff', color: active ? o.color : '#475569' }}>
                  <input type="checkbox" checked={active} onChange={() => toggleStatus(o.value)} style={{ margin: 0, accentColor: o.color }} />
                  {t(o.label)}
                </label>
              );
            })}
          </div>
        </div>

        <div className="report-exam-picker" style={{ minWidth: 0, width: 'min(420px, 100%)' }}>
          <label style={labelStyle}>{t('Exams')}</label>
          <button type="button" onClick={() => setPickerOpen(o => !o)} disabled={!report}
            style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <span className="wrap-text">{examsLabel}</span>
            <span style={{ color: '#94a3b8' }}>{pickerOpen ? '▲' : '▼'}</span>
          </button>
          {pickerOpen && (
            <div style={{ marginTop: '0.4rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.5rem' }}>
              <input type="text" value={examSearch} onChange={e => setExamSearch(e.target.value)} placeholder={t('Search exams...')} style={inputStyle} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                <button type="button" onClick={() => setSelectedIds(prev => [...new Set([...prev, ...pickerExams.map(e => e.id)])])} disabled={pickerExams.length === 0} style={smallBtn}>
                  {t('Select all')}
                </button>
                <button type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0} style={smallBtn}>
                  {t('Clear selection')}
                </button>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {pickerExams.length === 0 ? (
                  <div style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem' }}>{t('No exams found.')}</div>
                ) : pickerExams.map(e => (
                  <label key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.45rem 0.35rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggleExam(e.id)} style={{ marginTop: 3 }} />
                    <span style={{ minWidth: 0 }}>
                      <span className="wrap-text" style={{ display: 'block', fontWeight: 600, color: '#1e293b' }}>{e.title}</span>
                      <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                        {new Date(e.scheduled_at).toLocaleDateString()} · <span style={{ color: statusColor(e.status) }}>{t(e.status)}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>
        {t('Exam states: {states}{dates}. Left in hand = paid − partner commissions − expenses.', { states: statusLabels, dates: from || to ? '' : ` (${t('all dates')})` })}
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : !error && totals && (
        <>
          <ExamPaymentsSummary payments={totals} title={totals.exam_count === 1 ? t('Totals (1 exam)') : t('Totals ({n} exams)', { n: totals.exam_count })} />

          <h3>{t('By exam')}</h3>
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>{t('Exam')}</th>
                  <th style={th}>{t('Date')}</th>
                  <th style={th}>{t('Status')}</th>
                  <th className="hide-mobile" style={th}>{t('Location')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('Students')}</th>
                  {columns.map(c => <th key={c.key} style={{ ...th, textAlign: 'right' }}>{t(c.label)}</th>)}
                </tr>
              </thead>
              <tbody>
                {exams.length === 0 ? (
                  <tr><td colSpan={5 + columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t('No exams match the selected filters.')}</td></tr>
                ) : exams.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={td}>
                      <button onClick={() => navigate(`/monitor/${e.id}`)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline', textAlign: 'left' }}>
                        {e.title}
                      </button>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(e.scheduled_at).toLocaleDateString()}</td>
                    <td style={td}>
                      <span style={{ background: statusColor(e.status), color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {t(e.status)}
                      </span>
                    </td>
                    <td className="hide-mobile wrap-text" style={td}>{e.exam_location}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{e.registered_count}</td>
                    {columns.map(c => <td key={c.key} style={{ ...td, ...num }}>{formatAzn(e[c.key])}</td>)}
                  </tr>
                ))}
              </tbody>
              {exams.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td style={{ ...td, fontWeight: 700 }}>{t('Total')}</td>
                    <td style={td} />
                    <td style={td} />
                    <td className="hide-mobile" style={td} />
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{totals.registered_count}</td>
                    {columns.map(c => <td key={c.key} style={{ ...td, ...num, fontWeight: 700 }}>{formatAzn(totals[c.key])}</td>)}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const num = { textAlign: 'right', whiteSpace: 'nowrap' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const smallBtn = { padding: '0.3rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' };
