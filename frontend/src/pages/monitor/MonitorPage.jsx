import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExamMonitor, addExamExpense } from '../../api/monitor.api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import ExamPaymentsSummary, { formatAzn } from '../../components/monitor/ExamPaymentsSummary';
import ExamPapersTable from '../../components/monitor/ExamPapersTable';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitch from '../../components/shared/LanguageSwitch';

export default function MonitorPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { connect, disconnect } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);
  const [insideCount, setInsideCount] = useState(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // After an expense is added: refresh the money figures only (live feed / inside count stay as they are)
  const reloadMoney = () => getExamMonitor(examId).then(res => {
    const fresh = res.data.data;
    setData(prev => ({ ...prev, payments: fresh.payments, expenses: fresh.expenses }));
  });

  useEffect(() => {
    getExamMonitor(examId).then(res => {
      setData(res.data.data);
      setInsideCount(res.data.data.currently_inside);
      setLiveFeed(res.data.data.recent_logs);
    }).finally(() => setLoading(false));

    connect(examId, (msg) => {
      if (msg.type === 'entry_event') {
        setLiveFeed(prev => [msg.data, ...prev.slice(0, 49)]);
        setInsideCount(prev => msg.data.event_type === 'entry' ? prev + 1 : Math.max(0, prev - 1));
      }
    });

    return () => disconnect();
  }, [examId]);

  if (loading) return <p style={{ padding: '2rem' }}>{t('Loading...')}</p>;
  if (!data) return <p style={{ padding: '2rem' }}>{t('Exam not found.')}</p>;

  const { exam, registered_count } = data;

  return (
    <div className="page-pad" style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {(user?.role === 'admin' || user?.role === 'reception') && (
          <button onClick={() => navigate(user.role === 'admin' ? '/admin/exams' : '/reception/exams')} title={t('Back to Exams')} aria-label={t('Back to Exams')}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#2563eb', minWidth: 44, minHeight: 44, padding: 0, flex: 'none' }}>
            &larr;
          </button>
        )}
        <h2 className="wrap-text" style={{ minWidth: 0 }}>{exam.title}</h2>
        <LanguageSwitch tone="light" style={{ marginLeft: 'auto' }} />
      </div>
      <div className="wrap-text" style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        {exam.exam_location} &bull; {new Date(exam.scheduled_at).toLocaleString()}
        <span style={{ marginLeft: '1rem', background: '#0369a1', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.8rem' }}>{t(exam.status)}</span>
      </div>

      <div className="stat-row" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label={t('Registered')} value={registered_count} color="#2563eb" />
        <StatCard label={t('Inside')} value={insideCount} color="#16a34a" />
        <StatCard label={t('Outside')} value={registered_count - insideCount} color="#dc2626" />
        <StatCard label={t('Capacity')} value={exam.capacity} color="#7e22ce" />
      </div>

      {data.paper_breakdown && <ExamPapersTable breakdown={data.paper_breakdown} />}

      {data.expenses && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="wrap-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <h3>{t('Expenses')}</h3>
            <button onClick={() => setShowExpenseModal(true)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 500, minHeight: 44 }}>
              + {t('Add Expense')}
            </button>
          </div>
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>{t('Explanation')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('Amount')}</th>
                  <th style={th}>{t('Source')}</th>
                  <th className="hide-mobile" style={th}>{t('Added by')}</th>
                  <th className="hide-mobile" style={th}>{t('Date')}</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t('No expenses added.')}</td></tr>
                ) : data.expenses.map((x, i) => (
                  <tr key={x.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td className="wrap-text" style={td}>{x.explanation}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatAzn(x.amount)}</td>
                    <td style={td}>{t(x.source === 'card' ? 'Card' : 'Cash')}</td>
                    <td className="hide-mobile wrap-text" style={td}>{x.created_by_name || '—'}</td>
                    <td className="hide-mobile" style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(x.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.payments && <ExamPaymentsSummary payments={data.payments} />}

      {showExpenseModal && (
        <ExpenseModal examId={examId} onClose={() => setShowExpenseModal(false)}
          onSaved={() => { setShowExpenseModal(false); reloadMoney(); }} />
      )}

      <h3>{t('Live Entry Feed')}</h3>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        {liveFeed.length === 0 && <p style={{ padding: '1rem', color: '#94a3b8' }}>{t('No entries yet.')}</p>}
        {liveFeed.map((log, i) => (
          <div key={i} className="wrap-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <div className="wrap-mobile" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ background: log.event_type === 'entry' ? '#16a34a' : '#dc2626', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                {log.event_type === 'entry' ? t('ENTRY') : t('EXIT')}
              </span>
              <span className="wrap-text" style={{ fontWeight: 500 }}>{log.student_name}</span>
              {log.seat_number && <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{t('Seat')} {log.seat_number}</span>}
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(log.logged_at).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseModal({ examId, onClose, onSaved }) {
  const { t, tError } = useLanguage();
  const [form, setForm] = useState({ amount: '', source: 'cash', explanation: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) { setError(t('Amount must be greater than 0.')); return; }
    setSaving(true);
    setError('');
    try {
      await addExamExpense(examId, { amount, source: form.source, explanation: form.explanation.trim() });
      onSaved();
    } catch (err) {
      setError(tError(err, t('Failed to add expense')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ '--modal-w': '460px', background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('Add Expense')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Cancel')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={field}>
            <label style={labelStyle}>{t('Amount')} (AZN) <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} min="0.01" step="0.01" required style={inputStyle} placeholder="0.00" />
          </div>
          <div style={field}>
            <label style={labelStyle}>{t('Source')} <span style={{ color: '#dc2626' }}>*</span></label>
            <select name="source" value={form.source} onChange={handleChange} required style={inputStyle}>
              <option value="cash">{t('Cash')}</option>
              <option value="card">{t('Card')}</option>
            </select>
          </div>
          <div style={field}>
            <label style={labelStyle}>{t('Explanation')} <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea name="explanation" value={form.explanation} onChange={handleChange} required maxLength={500} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} placeholder={t('What was the expense for?')} />
          </div>
          <div className="wrap-mobile" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose}
              style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer' }}>
              {t('Cancel')}
            </button>
            <button type="submit" disabled={saving}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: saving ? 'default' : 'pointer', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
              {saving ? t('Saving...') : t('Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: `2px solid ${color}`, borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{label}</div>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const field = { marginBottom: '1rem' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
