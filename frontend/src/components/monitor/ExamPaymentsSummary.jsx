import React from 'react';

export const formatAzn = (n) => `${Number(n || 0).toFixed(2)} AZN`;

// Payment tiles for one exam (Monitor page) or for report totals (Exam Reports page).
export default function ExamPaymentsSummary({ payments, title = 'Payments' }) {
  const tiles = [
    { label: 'Expected', value: payments.expected_total, color: '#475569' },
    { label: 'Paid', value: payments.paid_total, color: '#16a34a' },
    { label: 'Outstanding', value: payments.outstanding_total, color: '#dc2626' },
    { label: 'Paid by card', value: payments.paid_card, color: '#2563eb' },
    { label: 'Paid in cash', value: payments.paid_cash, color: '#ca8a04' },
    ...(payments.paid_unspecified > 0
      ? [{ label: 'Method unspecified', value: payments.paid_unspecified, color: '#94a3b8' }]
      : []),
    { label: 'Commission', value: payments.commission_total, color: '#7e22ce' },
    { label: 'Left in hand', value: payments.left_in_hand, color: '#0369a1' },
  ];

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3>{title}</h3>
      <div className="pay-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${t.color}`, borderRadius: 8, padding: '0.75rem 1rem', minWidth: 0 }}>
            <div className="wrap-text" style={{ fontSize: '1.15rem', fontWeight: 700, color: t.color }}>{formatAzn(t.value)}</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{t.label}</div>
          </div>
        ))}
      </div>
      <div className="wrap-text" style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.6rem' }}>
        Students: {payments.fully_paid_count} fully paid &bull; {payments.partly_paid_count} partly paid &bull; {payments.unpaid_count} unpaid
        {payments.exam_cost !== undefined && (
          <> &nbsp;(exam cost {formatAzn(payments.exam_cost)}, commission {formatAzn(payments.commission_amount)} per fully paid partner student)</>
        )}
      </div>
    </div>
  );
}
