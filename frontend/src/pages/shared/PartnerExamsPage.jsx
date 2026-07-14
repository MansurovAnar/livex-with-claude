import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';

export default function PartnerExamsPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [exams, setExams] = useState([]);
  const [bonusInfo, setBonusInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bonusModal, setBonusModal] = useState(false);

  const isAdmin = user?.role === 'admin';
  const backPath = user?.role === 'reception' ? '/reception/partners' : '/admin/partners';
  const examBasePath = user?.role === 'reception'
    ? `/reception/partners/${partnerId}/exams`
    : `/admin/partners/${partnerId}/exams`;

  const load = () => {
    setLoading(true);
    const reqs = [
      apiClient.get('/partners'),
      apiClient.get(`/partners/${partnerId}/exams`),
    ];
    if (isAdmin) reqs.push(apiClient.get(`/partners/${partnerId}/bonus`));
    Promise.all(reqs).then(([partnersRes, examsRes, bonusRes]) => {
      setPartner(partnersRes.data.data.find(p => p.id === partnerId) || null);
      setExams(examsRes.data.data);
      if (bonusRes) setBonusInfo(bonusRes.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [partnerId]);

  if (loading) return <p style={{ padding: '1rem', color: '#94a3b8' }}>Loading...</p>;
  if (!partner) return <p style={{ padding: '1rem', color: '#dc2626' }}>Partner not found.</p>;

  const remaining = Number(bonusInfo?.remaining ?? 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <button onClick={() => navigate(backPath)}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: isAdmin ? '#2563eb' : '#7e22ce' }}>
          &larr;
        </button>
        <div>
          <h2 style={{ margin: 0 }}>{partner.full_name}</h2>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {partner.school} &bull; {partner.school_address}
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display: 'flex', gap: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem 1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem', alignItems: 'center' }}>
        <span><strong>School:</strong> {partner.school}</span>
        <span><strong>Address:</strong> {partner.school_address}</span>
        <span><strong>School Students:</strong> {partner.number_of_students}</span>
        <span><strong>Exams Registered:</strong> {exams.length}</span>
        {isAdmin && (
          <span style={{ marginLeft: 'auto' }}>
            <button onClick={() => setBonusModal(true)}
              style={{ background: remaining > 0 ? '#7c3aed' : '#64748b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
              Left Bonus: {remaining.toFixed(2)} AZN
            </button>
          </span>
        )}
        {!isAdmin && (
          <span style={{ marginLeft: 'auto' }}>
            <span style={{ background: partner.is_active ? '#16a34a' : '#64748b', color: '#fff', padding: '0.15rem 0.75rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
              {partner.is_active ? 'Active' : 'Inactive'}
            </span>
          </span>
        )}
      </div>

      {/* Exams table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['#', 'Exam Title', 'Location', 'Date & Time', 'Duration', 'Cost', 'Registered',
                ...(isAdmin ? ['Bonus'] : []),
                'Status'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No exam registrations for this partner yet.
                </td>
              </tr>
            ) : exams.map((ex, i) => (
              <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                <td style={td}>
                  <button
                    onClick={() => navigate(`${examBasePath}/${ex.id}/students`)}
                    style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline' }}>
                    {ex.title}
                  </button>
                </td>
                <td style={td}>{ex.exam_location}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(ex.scheduled_at).toLocaleString()}</td>
                <td style={td}>{ex.duration_mins} min</td>
                <td style={{ ...td, fontWeight: 600, color: '#15803d' }}>{Number(ex.exam_cost).toFixed(2)} AZN</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.8rem' }}>
                    {ex.registered_count}
                  </span>
                </td>
                {isAdmin && (
                  <td style={td}>
                    <button onClick={() => setBonusModal(true)}
                      style={{
                        background: remaining > 0 ? '#ede9fe' : '#f1f5f9',
                        color: remaining > 0 ? '#7c3aed' : '#94a3b8',
                        border: 'none', borderRadius: 6, padding: '0.2rem 0.6rem',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                      }}>
                      {remaining.toFixed(2)} AZN
                    </button>
                  </td>
                )}
                <td style={td}>
                  <span style={{ background: ex.status === 'ongoing' ? '#16a34a' : ex.status === 'scheduled' ? '#2563eb' : '#64748b', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                    {ex.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bonusModal && (
        <BonusModal
          partnerId={partnerId}
          partnerName={partner.full_name}
          onClose={() => { setBonusModal(false); load(); }}
        />
      )}
    </div>
  );
}

function BonusModal({ partnerId, partnerName, onClose }) {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const loadBonus = () =>
    apiClient.get(`/partners/${partnerId}/bonus`).then(res => setData(res.data.data));

  useEffect(() => { loadBonus(); }, []);

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter a positive amount.'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/partners/${partnerId}/bonus/payments`, { amount: amt, note: note || undefined });
      setAmount('');
      setNote('');
      await loadBonus();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Bonus — {partnerName}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {!data ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <BonusCard label="Total Earned" value={`${Number(data.total_earned).toFixed(2)} AZN`} color="#7c3aed" />
              <BonusCard label="Paid Out" value={`${Number(data.total_paid).toFixed(2)} AZN`} color="#16a34a" />
              <BonusCard label="Remaining" value={`${Number(data.remaining).toFixed(2)} AZN`} color={data.remaining > 0 ? '#dc2626' : '#64748b'} />
            </div>

            {/* Pay form */}
            {Number(data.remaining) > 0 && (
              <form onSubmit={handlePay} style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Record Payment
                </div>
                {error && (
                  <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                  <div>
                    <label style={lbl}>Amount (max {Number(data.remaining).toFixed(2)} AZN)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" min="0.01" step="0.01" max={Number(data.remaining)}
                        value={amount} onChange={e => setAmount(e.target.value)} required
                        style={{ ...inp, paddingRight: '2.75rem' }}
                      />
                      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.8rem', pointerEvents: 'none' }}>AZN</span>
                    </div>
                  </div>
                  <button type="submit" disabled={saving}
                    style={{ padding: '0.5rem 1rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                    {saving ? '...' : 'Pay'}
                  </button>
                </div>
                <div>
                  <label style={lbl}>Note (optional)</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Cash payment" style={inp} />
                </div>
              </form>
            )}

            {/* Payment history */}
            <div>
              <button onClick={() => setExpanded(x => !x)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', transition: 'transform 0.15s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                Payment History ({data.payments.length})
              </button>

              {expanded && (
                data.payments.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0' }}>No payments recorded yet.</p>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          {['Date & Time', 'Amount', 'Note', 'Paid By'].map(h => (
                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: i < data.payments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                              {new Date(p.paid_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#16a34a' }}>
                              {Number(p.amount).toFixed(2)} AZN
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>
                              {p.note || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>
                              {p.paid_by_name || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BonusCard({ label, value, color }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.65rem 0.75rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const lbl = { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' };
const inp = { width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box' };
