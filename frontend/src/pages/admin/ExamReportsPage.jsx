import React, { useEffect, useState } from 'react';
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
  { key: 'left_in_hand', label: 'Left in hand' },
];

export default function ExamReportsPage() {
  const navigate = useNavigate();
  const { t, tError } = useLanguage();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
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
    getExamPaymentsReport({ from: from || undefined, to: to || undefined })
      .then(res => setReport(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load report')))
      .finally(() => setLoading(false));
  }, [from, to]);

  const exams = report?.exams || [];
  const totals = report?.totals;
  const columns = MONEY_COLUMNS.filter(c => !c.optional || (totals && totals[c.key] > 0));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('Exam Reports')}</h2>
        <button onClick={() => navigate('/admin/exams')}
          style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          {t('Back to Exams')}
        </button>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
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
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>
        {from || to ? t('Completed exams only. Left in hand = paid − partner commissions.') : t('Completed exams only (all dates). Left in hand = paid − partner commissions.')}
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
                  <th className="hide-mobile" style={th}>{t('Location')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('Students')}</th>
                  {columns.map(c => <th key={c.key} style={{ ...th, textAlign: 'right' }}>{t(c.label)}</th>)}
                </tr>
              </thead>
              <tbody>
                {exams.length === 0 ? (
                  <tr><td colSpan={4 + columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t('No completed exams in this period.')}</td></tr>
                ) : exams.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={td}>
                      <button onClick={() => navigate(`/monitor/${e.id}`)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline', textAlign: 'left' }}>
                        {e.title}
                      </button>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(e.scheduled_at).toLocaleDateString()}</td>
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
