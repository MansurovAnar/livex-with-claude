import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';

export default function PartnerPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get('/partner/payments')
      .then(res => {
        setPayments(res.data.data);
        setBonusBalance(res.data.meta?.bonus_balance ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? payments.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.student_number.toLowerCase().includes(search.toLowerCase()) ||
        p.exam_title.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const totalCost = filtered.reduce((s, p) => s + Number(p.exam_cost), 0);
  const totalPaid = filtered.reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalRemaining = totalCost - totalPaid;

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Payments</h2>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{payments.length} registration{payments.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <SummaryCard label="Total Cost" value={`${totalCost.toFixed(2)} AZN`} color="#2563eb" />
        <SummaryCard label="Total Paid" value={`${totalPaid.toFixed(2)} AZN`} color="#16a34a" />
        <SummaryCard label="Remaining" value={`${totalRemaining.toFixed(2)} AZN`} color={totalRemaining > 0 ? '#dc2626' : '#16a34a'} />
        <div style={{ marginLeft: 'auto' }}>
          <SummaryCard label="Bonus" value={`${Number(bonusBalance).toFixed(2)} AZN`} color="#7c3aed" />
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by student name, number or exam..."
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['#', 'Student', 'Number', 'Exam', 'Exam Date', 'Cost', 'Paid', 'Remaining', 'Status', 'Registered'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No payments found.</td></tr>
            ) : filtered.map((p, i) => {
              const cost = Number(p.exam_cost);
              const paid = Number(p.amount_paid);
              const remaining = cost - paid;
              const fullyPaid = paid >= cost;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.full_name}</td>
                  <td style={td}>{p.student_number}</td>
                  <td style={td}>{p.exam_title}</td>
                  <td style={td}>{new Date(p.scheduled_at).toLocaleDateString()}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{cost.toFixed(2)} AZN</td>
                  <td style={{ ...td, color: '#16a34a', fontWeight: 600 }}>{paid.toFixed(2)} AZN</td>
                  <td style={{ ...td, color: remaining > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {remaining > 0 ? `-${remaining.toFixed(2)} AZN` : '—'}
                  </td>
                  <td style={td}>
                    {fullyPaid
                      ? <span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>Paid</span>
                      : paid > 0
                        ? <span style={{ background: '#fef9c3', color: '#ca8a04', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>Partial</span>
                        : <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>Unpaid</span>
                    }
                  </td>
                  <td style={{ ...td, color: '#64748b' }}>{new Date(p.registered_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
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
