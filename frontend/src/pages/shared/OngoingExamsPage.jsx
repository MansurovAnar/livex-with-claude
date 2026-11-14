import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExams } from '../../api/exams.api';
import { listRegistrations, updatePayment } from '../../api/registrations.api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import PaymentMethodRadio, { paymentMethodLabel } from '../../components/shared/PaymentMethodRadio';
import CourseDiscountBadge from '../../components/shared/CourseDiscountBadge';

// Price the student owes: course students get their discount (FREE = 0), see due_amount from the API
const dueOf = (reg, examCost) => (reg.due_amount != null ? Number(reg.due_amount) : examCost);

const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const SECTORS = ['Azerbaijan', 'Rus'];
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const NO_PARTNER = '__none__';
const EMPTY_FILTERS = { exam: '', partner: '', classLevel: '', sector: '', language: '', payment: '' };

export default function OngoingExamsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tError } = useLanguage();
  const [exams, setExams] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [paymentModal, setPaymentModal] = useState(null);
  const [payInput, setPayInput] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payError, setPayError] = useState('');
  const [saving, setSaving] = useState(false);

  const isReception = user?.role === 'reception';
  const base = isReception ? '/reception' : '/admin';
  const accent = isReception ? '#7e22ce' : '#2563eb';

  useEffect(() => {
    listExams({ status: 'ongoing' })
      .then(async (examRes) => {
        const ongoing = examRes.data.data;
        const regResults = await Promise.all(ongoing.map(e => listRegistrations(e.id)));
        setExams(ongoing);
        // One row per registration, tagged with its exam
        setRows(ongoing.flatMap((e, idx) => regResults[idx].data.data.map(r => ({
          ...r,
          exam_id: e.id,
          exam_title: e.title,
          exam_cost: Number(e.exam_cost),
          due: dueOf(r, Number(e.exam_cost)),
        }))));
      })
      .finally(() => setLoading(false));
  }, []);

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
      setRows(prev => prev.map(r => r.id === paymentModal.id ? { ...r, amount_paid: amt, payment_method: method } : r));
      closeModal();
    } catch (err) {
      setPayError(tError(err, 'Failed to save payment'));
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const searched = q
    ? rows.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        r.student_number.toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.mobile_number || '').includes(search.trim())
      )
    : rows;
  const partnerNames = [...new Set(rows.map(r => r.partner_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const hasNoPartner = rows.some(r => !r.partner_name);
  const filtersActive = Object.values(filters).some(Boolean);
  const filtered = searched.filter(r => {
    if (filters.exam && String(r.exam_id) !== filters.exam) return false;
    if (filters.partner && (filters.partner === NO_PARTNER ? !!r.partner_name : r.partner_name !== filters.partner)) return false;
    if (filters.classLevel && String(r.class_level ?? '') !== filters.classLevel) return false;
    if (filters.sector && r.sector !== filters.sector) return false;
    if (filters.language && r.language !== filters.language) return false;
    if (filters.payment) {
      const fullyPaid = Number(r.amount_paid) >= r.due;
      if ((filters.payment === 'paid') !== fullyPaid) return false;
    }
    return true;
  });
  const setFilter = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <button onClick={() => navigate(`${base}/exams`)} aria-label={t('Exams')}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: accent }}>
          &larr;
        </button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{t('Ongoing Exams')}</h2>
          {!loading && (
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
              {t('{exams} ongoing exams • {students} registered students', { exams: exams.length, students: rows.length })}
            </div>
          )}
        </div>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : (
        <>
          {/* Search */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('Search by name, number, email or mobile...')}
              style={{ flex: 1, minWidth: 0, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
                {t('Clear')}
              </button>
            )}
          </div>

          {/* Filter by */}
          <div className="toolbar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>{t('Filter by:')}</span>
            <select value={filters.exam} onChange={setFilter('exam')} aria-label={t('Exam')} style={filterSelect}>
              <option value="">{t('All exams')}</option>
              {exams.map(e => <option key={e.id} value={String(e.id)}>{e.title}</option>)}
            </select>
            <select value={filters.partner} onChange={setFilter('partner')} aria-label={t('Partner')} style={filterSelect}>
              <option value="">{t('All partners')}</option>
              {partnerNames.map(n => <option key={n} value={n}>{n}</option>)}
              {hasNoPartner && <option value={NO_PARTNER}>{t('No partner')}</option>}
            </select>
            <select value={filters.classLevel} onChange={setFilter('classLevel')} aria-label={t('Class')} style={filterSelect}>
              <option value="">{t('All classes')}</option>
              {CLASSES.map(c => <option key={c} value={String(c)}>{c}</option>)}
            </select>
            <select value={filters.sector} onChange={setFilter('sector')} aria-label={t('Sector')} style={filterSelect}>
              <option value="">{t('All sectors')}</option>
              {SECTORS.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select value={filters.language} onChange={setFilter('language')} aria-label={t('Language')} style={filterSelect}>
              <option value="">{t('All languages')}</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{t(l)}</option>)}
            </select>
            <select value={filters.payment} onChange={setFilter('payment')} aria-label={t('Paid')} style={filterSelect}>
              <option value="">{t('Paid and not paid')}</option>
              <option value="paid">{t('Paid')}</option>
              <option value="unpaid">{t('Not paid')}</option>
            </select>
            {filtersActive && (
              <button onClick={() => setFilters(EMPTY_FILTERS)}
                style={{ padding: '0.45rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
                {t('Clear filters')}
              </button>
            )}
            {(filtersActive || q) && (
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{t('Showing {n} of {total}', { n: filtered.length, total: rows.length })}</span>
            )}
          </div>

          {/* Students of all ongoing exams */}
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Exam Name', 'Full Name', 'Student Number', 'Mobile', 'Class', 'Sector', 'Language', 'Paid'].map(h => (
                    <th key={h} style={th}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      {exams.length === 0
                        ? t('No exams are ongoing right now.')
                        : rows.length === 0
                          ? t('No students registered for the ongoing exams yet.')
                          : t('No students match the search or filters.')}
                    </td>
                  </tr>
                ) : filtered.map((r, i) => {
                  const paid = Number(r.amount_paid);
                  const fullyPaid = paid >= r.due;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                      <td style={{ ...td, minWidth: 140 }}>
                        <button
                          onClick={() => navigate(`${base}/exams/${r.exam_id}/students`)}
                          style={{ background: 'none', border: 'none', color: accent, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline', textAlign: 'left', overflowWrap: 'anywhere' }}>
                          {r.exam_title}
                        </button>
                      </td>
                      <td style={{ ...td, minWidth: 140, fontWeight: 600 }}>{r.full_name}</td>
                      <td style={td}>
                        <span
                          title={r.partner_name ? t('Partner: {name}', { name: r.partner_name }) : t('No partner')}
                          style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>
                          {r.student_number}
                        </span>
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.class_level ?? <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={td}>{(r.sector && t(r.sector)) || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={td}>{(r.language && t(r.language)) || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {fullyPaid ? (
                            <button
                              onClick={() => openModal(r)}
                              title={`${t('Paid')}: ${paid.toFixed(2)} AZN${r.payment_method ? ` (${t(paymentMethodLabel(r.payment_method))})` : ''}`}
                              aria-label={t('Paid')}
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
                          {!fullyPaid && r.due > 0 && (
                            <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                              -{(r.due - paid).toFixed(2)} AZN
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-card" style={{ '--modal-w': '360px', background: '#fff', borderRadius: 12, padding: '1.75rem', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.25rem' }}>{t('Record Payment')}</h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem', overflowWrap: 'anywhere' }}>
              {paymentModal.full_name} · {paymentModal.exam_title}
            </p>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>{t('Exam Cost')}</span>
              <span style={{ fontWeight: 700 }}>{paymentModal.exam_cost.toFixed(2)} AZN</span>
            </div>
            {paymentModal.is_course_student && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '-0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ color: '#475569' }}>Course student <CourseDiscountBadge student={paymentModal} /></span>
                  <span style={{ fontWeight: 700 }}>{paymentModal.due.toFixed(2)} AZN</span>
                </div>
                {paymentModal.discount_note && (
                  <div style={{ color: '#92400e', marginTop: '0.35rem', overflowWrap: 'anywhere' }}>{paymentModal.discount_note}</div>
                )}
              </div>
            )}

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
              const rem = paymentModal.due - parseFloat(payInput);
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
const filterSelect = { padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.875rem', background: '#fff' };
