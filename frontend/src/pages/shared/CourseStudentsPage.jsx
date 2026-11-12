import React, { useEffect, useState } from 'react';
import { listCourseStudents, createCourseStudent, updateCourseStudent } from '../../api/courseStudents.api';
import { useAuth } from '../../contexts/AuthContext';
import { PageSizeSelect, PaginationBar } from '../../components/shared/Pagination';
import CourseDiscountBadge from '../../components/shared/CourseDiscountBadge';

const PREFIXES = ['010', '050', '051', '055', '070', '077', '099'];
const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const SECTORS = ['Azerbaijan', 'Rus'];
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const EMAIL_DOMAIN = '@livex.hedef';

// Course students: added and edited by admin, read-only for reception.
// Each one pays the exam cost minus a fixed AZN discount, or nothing when FREE.
export default function CourseStudentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null); // { student } for edit, { student: null } for add

  const load = (q = '', p = 1, l = limit) => {
    setLoading(true);
    const params = { page: p, limit: l };
    if (q) params.search = q;
    return listCourseStudents(params)
      .then(res => {
        const { data, meta } = res.data;
        const lastPage = Math.max(1, Math.ceil(meta.total / l));
        if (p > lastPage) return load(q, lastPage, l);
        setStudents(data); setTotal(meta.total); setPage(p);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleLimitChange = (l) => { setLimit(l); load(search, 1, l); };

  return (
    <div>
      <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Course Students</h2>
        {isAdmin && (
          <button onClick={() => setModal({ student: null })} className="btn-block"
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            + Add Course Student
          </button>
        )}
      </div>
      <p style={{ marginTop: 0, color: '#64748b', fontSize: '0.875rem' }}>
        Students who pay a discounted price for exams, or nothing (FREE). The discount is applied to every exam they register for.
      </p>

      <div className="toolbar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="Search..." style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <button onClick={() => load(search)} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Search</button>
      </div>
      <div className="pagination-top" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <PageSizeSelect limit={limit} onLimitChange={handleLimitChange} />
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>
                  <th style={th}>Number</th>
                  <th style={th}>Name</th>
                  <th className="hide-mobile" style={th}>Email</th>
                  <th style={th}>Mobile</th>
                  <th className="hide-mobile" style={th}>Class</th>
                  <th style={th}>Discount</th>
                  <th style={th}>Description</th>
                  {isAdmin && <th style={th}></th>}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No course students found.</td>
                  </tr>
                ) : students.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>{s.student_number}</td>
                    <td style={td}>{s.full_name}</td>
                    <td className="hide-mobile wrap-text" style={td}>{s.email}</td>
                    <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td className="hide-mobile" style={td}>{s.class_level ?? <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}><CourseDiscountBadge student={s} /></td>
                    <td className="wrap-text" style={{ ...td, minWidth: 160, color: '#475569' }}>{s.discount_note || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    {isAdmin && (
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => setModal({ student: s })}
                          style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} limit={limit} total={total} onPageChange={p => load(search, p)} />
        </>
      )}

      {isAdmin && modal && (
        <CourseStudentModal
          student={modal.student}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(search, page); }}
        />
      )}
    </div>
  );
}

function splitMobile(mobile) {
  const prefix = PREFIXES.find(p => (mobile || '').startsWith(p));
  return prefix ? { mobile_prefix: prefix, mobile_number: mobile.slice(prefix.length) } : { mobile_prefix: '050', mobile_number: mobile || '' };
}

function CourseStudentModal({ student, onClose, onSaved }) {
  const isEdit = !!student;
  const [form, setForm] = useState(() => ({
    student_number: student?.student_number || '',
    full_name: student?.full_name || '',
    // New students get the fixed @livex.hedef domain; existing emails are edited in full
    email: student?.email || '',
    ...splitMobile(student?.mobile_number),
    class_level: student?.class_level ?? '',
    sector: student?.sector || '',
    language: student?.language || '',
    discount_type: student?.is_free ? 'free' : 'amount',
    discount_amount: student && !student.is_free ? String(Number(student.discount_amount)) : '',
    discount_note: student?.discount_note || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!/^\d{1,7}$/.test(form.student_number)) { setError('Student number must be 1-7 digits'); return; }
    const isFree = form.discount_type === 'free';
    const discount = isFree ? 0 : Number(form.discount_amount || 0);
    if (!isFree && (isNaN(discount) || discount < 0)) { setError('Discount must be a non-negative amount'); return; }

    const payload = {
      student_number: form.student_number,
      full_name: form.full_name,
      email: isEdit ? form.email : `${form.email}${EMAIL_DOMAIN}`,
      mobile_number: form.mobile_number ? `${form.mobile_prefix}${form.mobile_number}` : null,
      class_level: form.class_level ? Number(form.class_level) : null,
      sector: form.sector || null,
      language: form.language || null,
      is_free: isFree,
      discount_amount: discount,
      discount_note: form.discount_note.trim() || null,
    };
    setSaving(true);
    try {
      if (isEdit) await updateCourseStudent(student.id, payload);
      else await createCourseStudent(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save course student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ '--modal-w': '520px', background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{isEdit ? 'Edit Course Student' : 'Add Course Student'}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Student Number <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="student_number" value={form.student_number} onChange={handleChange} required maxLength={7} inputMode="numeric" pattern="\d{1,7}" title="1-7 digits" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email <span style={{ color: '#dc2626' }}>*</span></label>
            {isEdit ? (
              <input name="email" type="email" value={form.email} onChange={handleChange} required style={inputStyle} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input name="email" value={form.email} required placeholder="namesurname"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value.replace(/[@\s]/g, '') }))}
                  style={{ ...inputStyle, minWidth: 0 }} />
                <span style={{ color: '#475569', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{EMAIL_DOMAIN}</span>
              </div>
            )}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Mobile Number</label>
            <div className="mobile-row" style={{ display: 'flex', gap: '0.5rem' }}>
              <select name="mobile_prefix" value={form.mobile_prefix} onChange={handleChange} className="mobile-prefix" style={{ ...inputStyle, width: 90, flex: 'none' }}>
                {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="tel" name="mobile_number" value={form.mobile_number} onChange={handleChange} placeholder="XXXXXXX" maxLength={7} style={{ ...inputStyle, minWidth: 0 }} />
            </div>
          </div>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Class</label>
              <select name="class_level" value={form.class_level} onChange={handleChange} style={inputStyle}>
                <option value="">Select class...</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Language</label>
              <select name="language" value={form.language} onChange={handleChange} style={inputStyle}>
                <option value="">Select language...</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Sector</label>
            <div className="radio-row" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {SECTORS.map(s => (
                <label key={s} style={radioLabel}>
                  <input type="radio" name="sector" value={s} checked={form.sector === s} onChange={handleChange} style={{ width: 16, height: 16 }} />
                  {s}
                </label>
              ))}
              {form.sector && (
                <button type="button" onClick={() => setForm(f => ({ ...f, sector: '' }))}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '1.1rem' }}>
            <label style={labelStyle}>Exam price <span style={{ color: '#dc2626' }}>*</span></label>
            <div className="radio-row" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <label style={radioLabel}>
                <input type="radio" name="discount_type" value="amount" checked={form.discount_type === 'amount'} onChange={handleChange} style={{ width: 16, height: 16 }} />
                Discount (AZN off exam cost)
              </label>
              <label style={radioLabel}>
                <input type="radio" name="discount_type" value="free" checked={form.discount_type === 'free'} onChange={handleChange} style={{ width: 16, height: 16 }} />
                FREE (100%)
              </label>
            </div>
            {form.discount_type === 'amount' && (
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <input type="number" name="discount_amount" min="0" step="0.01" value={form.discount_amount} onChange={handleChange}
                  placeholder="0.00" style={{ ...inputStyle, paddingRight: '3rem' }} />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>AZN</span>
              </div>
            )}
            <label style={labelStyle}>Description</label>
            <textarea name="discount_note" value={form.discount_note} onChange={handleChange} rows={3} maxLength={500}
              placeholder="Why is this student discounted? (shown to reception)"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const th = { padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 };
const td = { padding: '0.75rem', fontSize: '0.875rem' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const fieldStyle = { marginBottom: '1.1rem' };
const radioLabel = { display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#374151' };
