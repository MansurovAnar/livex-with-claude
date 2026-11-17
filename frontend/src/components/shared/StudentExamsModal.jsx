import React, { useEffect, useState } from 'react';
import { getStudentExams } from '../../api/students.api';
import { paymentMethodLabel } from './PaymentMethodRadio';
import { useLanguage } from '../../i18n/LanguageContext';

// Exams a student is registered for (newest first) with cost and payment.
// Exams the student was removed from are listed too, with the removal reason.
export default function StudentExamsModal({ student, onClose }) {
  const { t, tError } = useLanguage();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getStudentExams(student.id)
      .then(res => setExams(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load exams')))
      .finally(() => setLoading(false));
  }, [student.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ '--modal-w': '760px', background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('Student exams')}</h2>
            <div className="wrap-text" style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {student.full_name} ({student.student_number})
            </div>
          </div>
          <button onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.875rem' }}>{error}</div>
        ) : exams.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>{t('This student is not registered for any exam.')}</p>
        ) : (
          <div className="table-scroll" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>{t('Exam')}</th>
                  <th style={th}>{t('Date')}</th>
                  <th style={th}>{t('Exam Cost')}</th>
                  <th style={th}>{t('Paid')}</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(r => {
                  const cost = Number(r.exam_cost);
                  const due = Number(r.due_amount);
                  const paid = Number(r.amount_paid) || 0;
                  const removed = !!r.removed_at;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: removed ? '#fef2f2' : '#fff' }}>
                      <td style={td}>
                        <div className="wrap-text" style={{ fontWeight: 600, color: removed ? '#64748b' : '#1e293b' }}>{r.title}</div>
                        {removed && (
                          <div className="wrap-text" style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            {t('Removed from exam:')} {r.removal_reason || '—'}
                            <span style={{ color: '#94a3b8' }}> ({new Date(r.removed_at).toLocaleDateString()})</span>
                          </div>
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(r.scheduled_at).toLocaleString()}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {cost.toFixed(2)} AZN
                        {due !== cost && (
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{t('Due')}: {due.toFixed(2)} AZN</div>
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {paid > 0 ? (
                          <>
                            <span style={{ color: paid >= due ? '#15803d' : '#b45309', fontWeight: 600 }}>{paid.toFixed(2)} AZN</span>
                            {r.payment_method && (
                              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{t(paymentMethodLabel(r.payment_method))}</div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>{t('Unpaid')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' };
const td = { padding: '0.6rem 0.75rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'top' };
