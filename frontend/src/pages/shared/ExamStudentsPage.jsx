import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExam } from '../../api/exams.api';
import { listRegistrations, listRemovedRegistrations, updatePayment, removeFromExam, restoreToExam } from '../../api/registrations.api';
import { useAuth } from '../../contexts/AuthContext';
import StudentTicket from '../../components/shared/StudentTicket';
import PaymentMethodRadio, { paymentMethodLabel } from '../../components/shared/PaymentMethodRadio';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ExamStudentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tError } = useLanguage();
  const [exam, setExam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [payInput, setPayInput] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payError, setPayError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ticketReg, setTicketReg] = useState(null);
  const [removed, setRemoved] = useState([]);
  const [removedOpen, setRemovedOpen] = useState(false);
  const [removeModal, setRemoveModal] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const backPath = user?.role === 'reception' ? '/reception/exams' : '/admin/exams';

  const load = () => {
    Promise.all([getExam(id), listRegistrations(id), listRemovedRegistrations(id)])
      .then(([examRes, regRes, removedRes]) => {
        setExam(examRes.data.data);
        setRegistrations(regRes.data.data);
        setRemoved(removedRes.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openModal = (reg) => {
    setPaymentModal(reg);
    setPayInput(Number(reg.amount_paid) > 0 ? String(Number(reg.amount_paid)) : '');
    setPayMethod(reg.payment_method || '');
    setPayError('');
  };

  const closeModal = () => { setPaymentModal(null); setPayInput(''); setPayMethod(''); setPayError(''); };

  const handleSavePayment = async () => {
    const amt = parseFloat(payInput);
    if (isNaN(amt) || amt < 0) return;
    if (amt > 0 && !payMethod) { setPayError(t('Select Card or Cash.')); return; }
    const method = amt > 0 ? payMethod : null;
    setSaving(true);
    setPayError('');
    try {
      await updatePayment(paymentModal.id, amt, method);
      setRegistrations(prev => prev.map(r => r.id === paymentModal.id ? { ...r, amount_paid: amt, payment_method: method } : r));
      closeModal();
    } catch (err) {
      setPayError(tError(err, 'Failed to save payment'));
    } finally {
      setSaving(false);
    }
  };

  const openRemoveModal = (reg) => { setRemoveModal(reg); setRemoveReason(''); setRemoveError(''); };
  const closeRemoveModal = () => { setRemoveModal(null); setRemoveReason(''); setRemoveError(''); };

  const handleRemove = async () => {
    const reason = removeReason.trim();
    if (!reason) { setRemoveError(t('Please explain why the student is removed.')); return; }
    setRemoving(true);
    setRemoveError('');
    try {
      await removeFromExam(removeModal.id, reason);
      closeRemoveModal();
      load();
    } catch (err) {
      setRemoveError(tError(err, 'Failed to remove student'));
    } finally {
      setRemoving(false);
    }
  };

  const handleRestore = async (reg) => {
    if (!window.confirm(t('Restore {name} to this exam? Room and seat will be empty.', { name: reg.full_name }))) return;
    setRestoringId(reg.id);
    try {
      await restoreToExam(reg.id);
      load();
    } catch (err) {
      window.alert(tError(err, 'Failed to restore student'));
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) return <p style={{ padding: '1rem', color: '#94a3b8' }}>{t('Loading...')}</p>;
  if (!exam) return <p style={{ padding: '1rem', color: '#dc2626' }}>{t('Exam not found.')}</p>;

  const examCost = Number(exam.exam_cost);
  // Show the Extra Detail column when the exam type defines extra details or any registration has one
  const showExtraDetail = (exam.exam_type_extra_details || []).length > 0 || registrations.some(r => r.extra_detail);
  const filtered = search.trim()
    ? registrations.filter(r =>
        r.full_name.toLowerCase().includes(search.toLowerCase()) ||
        r.student_number.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        (r.mobile_number || '').includes(search)
      )
    : registrations;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <button onClick={() => navigate(backPath)}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: user?.role === 'reception' ? '#7e22ce' : '#2563eb' }}>
          &larr;
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{exam.title}</h2>
            {exam.exam_type_name && (
              <span style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, overflowWrap: 'anywhere' }}>
                {exam.exam_type_name}
              </span>
            )}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {exam.subject_code && <span>{exam.subject_code} &bull; </span>}
            {exam.exam_location} &bull; {new Date(exam.scheduled_at).toLocaleString()} &bull; {exam.duration_mins} {t('min')}
          </div>
        </div>
      </div>

      {/* Exam info strip */}
      <div style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
        <span><strong>{t('Entry opens:')}</strong> {new Date(exam.entry_opens_at).toLocaleString()}</span>
        <span><strong>{t('Entry closes:')}</strong> {new Date(exam.entry_closes_at).toLocaleString()}</span>
        <span><strong>{t('Exam Cost:')}</strong> <span style={{ color: '#15803d', fontWeight: 700 }}>{examCost.toFixed(2)} AZN</span></span>
        <span><strong>{t('Registered:')}</strong> {registrations.length}</span>
        <span><strong>{t('Removed from exam:')}</strong> <span style={{ color: removed.length ? '#dc2626' : undefined, fontWeight: 600 }}>{removed.length}</span></span>
        <span style={{ marginLeft: 'auto' }}>
          <span style={{ background: exam.status === 'ongoing' ? '#16a34a' : exam.status === 'scheduled' ? '#2563eb' : '#64748b', color: '#fff', padding: '0.15rem 0.75rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
            {t(exam.status)}
          </span>
        </span>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('Search by name, number, email or mobile...')}
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            {t('Clear')}
          </button>
        )}
      </div>

      {/* Students table */}
      <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['#', 'Full Name', 'Student Number', 'Email', 'Mobile', 'Room', 'Seat', ...(showExtraDetail ? ['Extra Detail'] : []), 'Exam Cost', 'Registered At', 'Paid', ''].map(h => (
                <th key={h} style={th}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showExtraDetail ? 12 : 11} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  {t('No students registered for this exam yet.')}
                </td>
              </tr>
            ) : filtered.map((r, i) => {
              const paid = Number(r.amount_paid);
              const remaining = examCost - paid;
              const fullyPaid = paid >= examCost;

              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                  <td style={td}>
                    <button
                      onClick={() => setTicketReg(r)}
                      style={{ background: 'none', border: 'none', color: '#7e22ce', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline' }}>
                      {r.full_name}
                    </button>
                  </td>
                  <td style={td}>
                    <span
                      title={r.partner_name ? t('Partner: {name}', { name: r.partner_name }) : t('No partner')}
                      style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>
                      {r.student_number}
                    </span>
                  </td>
                  <td style={td}>{r.email}</td>
                  <td style={td}>{r.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{r.room_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{r.seat_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  {showExtraDetail && <td style={{ ...td, overflowWrap: 'anywhere' }}>{r.extra_detail || <span style={{ color: '#cbd5e1' }}>—</span>}</td>}
                  <td style={{ ...td, fontWeight: 600, color: '#15803d' }}>{examCost.toFixed(2)} AZN</td>
                  <td style={td}>{new Date(r.registered_at).toLocaleString()}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {fullyPaid ? (
                        <button
                          onClick={() => openModal(r)}
                          title={`${t('Paid')}: ${paid.toFixed(2)} AZN${r.payment_method ? ` (${t(paymentMethodLabel(r.payment_method))})` : ''}`}
                          style={{ background: '#16a34a', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✓
                        </button>
                      ) : (
                        <button
                          onClick={() => openModal(r)}
                          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          {paid > 0 ? `${paid.toFixed(2)} AZN` : t('Pay')}
                        </button>
                      )}
                      {paid > 0 && r.payment_method && (
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                          {t(paymentMethodLabel(r.payment_method))}
                        </span>
                      )}
                      {!fullyPaid && examCost > 0 && (
                        <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                          -{remaining.toFixed(2)} AZN
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {paid > 0 ? (
                      <span title={t('Students with a recorded payment cannot be removed')} style={{ color: '#cbd5e1' }}>—</span>
                    ) : (
                      <button
                        onClick={() => openRemoveModal(r)}
                        style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '0.25rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                        {t('Remove')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Removed students (expandable) */}
      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setRemovedOpen(o => !o)}
          aria-expanded={removedOpen}
          className="btn-block"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 1rem', cursor: 'pointer', color: '#b91c1c', fontWeight: 600, fontSize: '0.9rem' }}>
          <span>{removedOpen ? '▾' : '▸'}</span>
          {t('Removed students ({n})', { n: removed.length })}
        </button>
        {removedOpen && (
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Full Name', 'Student Number', 'Mobile', 'Reason', 'Removed By', 'Removed At', ''].map(h => (
                    <th key={h} style={th}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {removed.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      {t('No students removed from this exam.')}
                    </td>
                  </tr>
                ) : removed.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.full_name}</td>
                    <td style={td}>{r.student_number}</td>
                    <td style={td}>{r.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={{ ...td, overflowWrap: 'anywhere', minWidth: 160 }}>{r.removal_reason}</td>
                    <td style={td}>{r.removed_by_name || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={td}>{new Date(r.removed_at).toLocaleString()}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleRestore(r)}
                        disabled={restoringId === r.id}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.7rem', cursor: restoringId === r.id ? 'not-allowed' : 'pointer', opacity: restoringId === r.id ? 0.7 : 1, fontSize: '0.8rem', fontWeight: 600 }}>
                        {restoringId === r.id ? t('Restoring...') : t('Restore')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remove Modal */}
      {removeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeRemoveModal(); }}>
          <div className="modal-card" style={{ '--modal-w': '420px', background: '#fff', borderRadius: 12, padding: '1.75rem', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.25rem' }}>{t('Remove from Exam')}</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem', overflowWrap: 'anywhere' }}>
              {t('{name} ({number}) will be removed from {exam}. Their room and seat will be freed.', { name: removeModal.full_name, number: removeModal.student_number, exam: exam.title })}
            </p>
            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' }}>
              {t('Reason')} <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={removeReason}
              onChange={e => { setRemoveReason(e.target.value); setRemoveError(''); }}
              autoFocus
              rows={4}
              placeholder={t('Why is this student removed from the exam?')}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: '1rem' }}
            />
            {removeError && (
              <div style={{ marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>{removeError}</div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={closeRemoveModal}
                style={{ padding: '0.5rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                {t('Cancel')}
              </button>
              <button onClick={handleRemove} disabled={removing}
                style={{ padding: '0.5rem 1.5rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: removing ? 'not-allowed' : 'pointer', opacity: removing ? 0.7 : 1, fontWeight: 600 }}>
                {removing ? t('Removing...') : t('Remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketReg && exam && (
        <StudentTicket
          data={{
            studentName: ticketReg.full_name,
            studentNumber: ticketReg.student_number,
            studentEmail: ticketReg.email,
            extraDetail: ticketReg.extra_detail || null,
            examTitle: exam.title,
            examDate: exam.scheduled_at,
            examLocation: exam.exam_location,
            roomNumber: ticketReg.room_number,
            seatNumber: ticketReg.seat_number,
          }}
          onClose={() => setTicketReg(null)}
        />
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-card" style={{ '--modal-w': '360px', background: '#fff', borderRadius: 12, padding: '1.75rem', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.25rem' }}>{t('Record Payment')}</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>
              {paymentModal.full_name}
            </p>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>{t('Exam Cost')}</span>
              <span style={{ fontWeight: 700 }}>{examCost.toFixed(2)} AZN</span>
            </div>

            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' }}>
              {t('Amount Paid (AZN)')}
            </label>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payInput}
                onChange={e => setPayInput(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSavePayment()}
                style={{ width: '100%', padding: '0.5rem 3rem 0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>AZN</span>
            </div>

            {payInput !== '' && !isNaN(parseFloat(payInput)) && (() => {
              const amt = parseFloat(payInput);
              const rem = examCost - amt;
              return rem > 0 ? (
                <div style={{ marginBottom: '1.25rem', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
                  {t('Remaining:')} {rem.toFixed(2)} AZN
                </div>
              ) : (
                <div style={{ marginBottom: '1.25rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600 }}>
                  {t('✓ Fully paid')}
                </div>
              );
            })()}

            <PaymentMethodRadio value={payMethod} onChange={(m) => { setPayMethod(m); setPayError(''); }} />

            {payError && (
              <div style={{ marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>{payError}</div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={closeModal}
                style={{ padding: '0.5rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                {t('Cancel')}
              </button>
              <button onClick={handleSavePayment} disabled={saving}
                style={{ padding: '0.5rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontWeight: 600 }}>
                {saving ? t('Saving...') : t('Save')}
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
