import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getExam } from '../../api/exams.api';
import { updatePayment } from '../../api/registrations.api';
import apiClient from '../../api/apiClient';

export default function PartnerExamStudentsPage() {
  const { partnerId, examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [payInput, setPayInput] = useState('');
  const [saving, setSaving] = useState(false);

  const canPay = user?.role === 'reception';
  const backPath = user?.role === 'reception'
    ? `/reception/partners/${partnerId}/exams`
    : `/admin/partners/${partnerId}/exams`;

  const load = () => {
    Promise.all([
      getExam(examId),
      apiClient.get(`/partners/${partnerId}/exams/${examId}/students`),
    ]).then(([examRes, studRes]) => {
      setExam(examRes.data.data);
      setStudents(studRes.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [examId, partnerId]);

  const openModal = (reg) => {
    setPaymentModal(reg);
    setPayInput(Number(reg.amount_paid) > 0 ? String(Number(reg.amount_paid)) : '');
  };
  const closeModal = () => { setPaymentModal(null); setPayInput(''); };

  const handleSavePayment = async () => {
    const amt = parseFloat(payInput);
    if (isNaN(amt) || amt < 0) return;
    setSaving(true);
    try {
      await updatePayment(paymentModal.id, amt);
      setStudents(prev => prev.map(r => r.id === paymentModal.id ? { ...r, amount_paid: amt } : r));
      closeModal();
    } finally { setSaving(false); }
  };

  if (loading) return <p style={{ padding: '1rem', color: '#94a3b8' }}>Loading...</p>;
  if (!exam) return <p style={{ padding: '1rem', color: '#dc2626' }}>Exam not found.</p>;

  const examCost = Number(exam.exam_cost);
  const filtered = search.trim()
    ? students.filter(r =>
        r.full_name.toLowerCase().includes(search.toLowerCase()) ||
        r.student_number.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        (r.mobile_number || '').includes(search)
      )
    : students;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <button onClick={() => navigate(backPath)}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: canPay ? '#2563eb' : '#7e22ce' }}>
          &larr;
        </button>
        <div>
          <h2 style={{ margin: 0 }}>{exam.title}</h2>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {exam.subject_code && <span>{exam.subject_code} &bull; </span>}
            {exam.exam_location} &bull; {new Date(exam.scheduled_at).toLocaleString()} &bull; {exam.duration_mins} min
          </div>
        </div>
      </div>

      {/* Exam info strip */}
      <div style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
        <span><strong>Exam Cost:</strong> <span style={{ color: '#15803d', fontWeight: 700 }}>{examCost.toFixed(2)} AZN</span></span>
        <span><strong>Partner Students:</strong> {students.length}</span>
        <span style={{ marginLeft: 'auto' }}>
          <span style={{ background: exam.status === 'ongoing' ? '#16a34a' : exam.status === 'scheduled' ? '#2563eb' : '#64748b', color: '#fff', padding: '0.15rem 0.75rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
            {exam.status}
          </span>
        </span>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, number, email or mobile..."
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }} />
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
              {['#', 'Full Name', 'Number', 'Email', 'Mobile', 'Class', 'Sector', 'Language', 'Room', 'Seat', 'Registered At', ...(canPay ? ['Paid'] : [])].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canPay ? 12 : 11} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No students found.
                </td>
              </tr>
            ) : filtered.map((r, i) => {
              const paid = Number(r.amount_paid);
              const remaining = examCost - paid;
              const fullyPaid = paid >= examCost;

              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.full_name}</td>
                  <td style={td}>{r.student_number}</td>
                  <td style={td}>{r.email}</td>
                  <td style={td}>{r.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.class_level || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{r.sector || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{r.language || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{r.room_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{r.seat_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{new Date(r.registered_at).toLocaleString()}</td>
                  {canPay && (
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {fullyPaid ? (
                          <button onClick={() => openModal(r)} title={`Paid: ${paid.toFixed(2)} AZN`}
                            style={{ background: '#16a34a', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✓
                          </button>
                        ) : (
                          <button onClick={() => openModal(r)}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            {paid > 0 ? `${paid.toFixed(2)} AZN` : 'Pay'}
                          </button>
                        )}
                        {!fullyPaid && examCost > 0 && (
                          <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                            -{remaining.toFixed(2)} AZN
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Payment Modal — admin only */}
      {canPay && paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.75rem', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.25rem' }}>Record Payment</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>{paymentModal.full_name}</p>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Exam Cost</span>
              <span style={{ fontWeight: 700 }}>{examCost.toFixed(2)} AZN</span>
            </div>
            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' }}>Amount Paid (AZN)</label>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input type="number" min="0" step="0.01" value={payInput} onChange={e => setPayInput(e.target.value)}
                autoFocus onKeyDown={e => e.key === 'Enter' && handleSavePayment()}
                style={{ width: '100%', padding: '0.5rem 3rem 0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>AZN</span>
            </div>
            {payInput !== '' && !isNaN(parseFloat(payInput)) && (() => {
              const rem = examCost - parseFloat(payInput);
              return rem > 0
                ? <div style={{ marginBottom: '1.25rem', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>Remaining: {rem.toFixed(2)} AZN</div>
                : <div style={{ marginBottom: '1.25rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600 }}>✓ Fully paid</div>;
            })()}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ padding: '0.5rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSavePayment} disabled={saving}
                style={{ padding: '0.5rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
