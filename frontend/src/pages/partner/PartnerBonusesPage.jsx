import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PartnerBonusesPage() {
  const { t, tError } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/partner/bonus')
      .then(res => setData(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load bonuses')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>;
  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;

  const payments = data?.payments ?? [];
  const remaining = Number(data?.remaining ?? 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('Bonuses')}</h2>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{payments.length === 1 ? t('1 bonus payment') : t('{n} bonus payments', { n: payments.length })}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <SummaryCard label={t('Total Earned')} value={`${Number(data?.total_earned ?? 0).toFixed(2)} AZN`} color="#7c3aed" />
        <SummaryCard label={t('Received')} value={`${Number(data?.total_received ?? 0).toFixed(2)} AZN`} color="#16a34a" />
        <SummaryCard label={t('Remaining')} value={`${remaining.toFixed(2)} AZN`} color={remaining > 0 ? '#dc2626' : '#64748b'} />
      </div>

      {/* Received bonuses */}
      <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['#', 'Date & Time', 'Amount', 'Description'].map(h => (
                <th key={h} style={th}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t('No bonuses received yet.')}</td></tr>
            ) : payments.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(p.paid_at).toLocaleString()}</td>
                <td style={{ ...td, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>{Number(p.amount).toFixed(2)} AZN</td>
                <td className="wrap-text" style={{ ...td, color: '#475569', minWidth: 160 }}>
                  {p.note || <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1.25rem', minWidth: 160 }}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
