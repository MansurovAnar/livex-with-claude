import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import useStudentEmailPreview from '../../hooks/useStudentEmailPreview';
import { useLanguage } from '../../i18n/LanguageContext';

const PREFIXES = ['010', '050', '051', '055', '070', '077', '099'];
const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const emptyForm = {
  first_name: '', last_name: '', father_name: '',
  mobile_prefix: '050', mobile_number: '',
  class_level: '', sector: '', language: '',
};

export default function MyStudentsPage() {
  const { t, tError } = useLanguage();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nextNumber, setNextNumber] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const emailPreview = useStudentEmailPreview('/partner/students/email-preview', form.first_name, form.last_name, previewKey);

  const load = (q = '') => {
    setLoading(true);
    apiClient.get('/partner/students', { params: q ? { search: q } : {} })
      .then(res => setStudents(res.data.data))
      .finally(() => setLoading(false));
  };

  // Preview only — the server assigns the actual number on save
  const loadNextNumber = () => {
    apiClient.get('/partner/students/next-number')
      .then(res => setNextNumber(res.data.data.student_number))
      .catch(err => { setNextNumber(''); setError(tError(err, 'Failed to load next student number')); });
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showForm) loadNextNumber(); }, [showForm]);

  const handleSearch = (e) => { e.preventDefault(); load(search); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const mobile = form.mobile_number ? `${form.mobile_prefix}${form.mobile_number}` : undefined;
      const res = await apiClient.post('/partner/students', {
        first_name: form.first_name,
        last_name: form.last_name,
        ...(form.father_name.trim() && { father_name: form.father_name }),
        ...(mobile && { mobile_number: mobile }),
        ...(form.class_level && { class_level: Number(form.class_level) }),
        ...(form.sector && { sector: form.sector }),
        ...(form.language && { language: form.language }),
      });
      setSuccess(t('{name} added successfully with number {number} and email {email}.', { name: res.data.data.full_name, number: res.data.data.student_number, email: res.data.data.email }));
      setForm(emptyForm);
      setPreviewKey(k => k + 1);
      load(search);
      loadNextNumber();
    } catch (err) {
      setError(tError(err, 'Failed to add student'));
      loadNextNumber();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('My Students')}</h2>
        <button
          onClick={() => { setShowForm(f => !f); setError(''); setSuccess(''); }}
          style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          {showForm ? `✕ ${t('Cancel')}` : t('+ Add Student')}
        </button>
      </div>

      {/* Add Student Form */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#065f46' }}>{t('Add New Student')}</h3>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</div>}
          {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.6rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{success}</div>}
          <form onSubmit={handleAddStudent}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Student Number — assigned automatically by the server */}
              <div>
                <label style={labelStyle}>{t('Student Number')}</label>
                <input type="text" value={nextNumber} readOnly placeholder={t('Loading...')} title={t('Assigned automatically')}
                  style={{ ...inputStyle, background: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }} />
              </div>
              {/* Name */}
              <div>
                <label style={labelStyle}>{t('Name')} <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required maxLength={50} style={inputStyle} />
              </div>
              {/* Surname */}
              <div>
                <label style={labelStyle}>{t('Surname')} <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required maxLength={50} style={inputStyle} />
              </div>
              {/* Father Name */}
              <div>
                <label style={labelStyle}>{t('Father Name')}</label>
                <input type="text" name="father_name" value={form.father_name} onChange={handleChange} maxLength={50} style={inputStyle} />
              </div>
              {/* Email — generated by the server from name + first letter of surname */}
              <div>
                <label style={labelStyle}>{t('Email')}</label>
                <input type="text" value={emailPreview} readOnly placeholder={t('Generated from name and surname')} title={t('Generated automatically')}
                  style={{ ...inputStyle, background: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }} />
              </div>
              {/* Mobile */}
              <div>
                <label style={labelStyle}>{t('Mobile Number')}</label>
                <div className="mobile-row" style={{ display: 'flex', gap: '0.4rem' }}>
                  <select name="mobile_prefix" value={form.mobile_prefix} onChange={handleChange} className="mobile-prefix" style={{ ...inputStyle, width: 80, flex: 'none' }}>
                    {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="tel" name="mobile_number" value={form.mobile_number} onChange={handleChange} placeholder="XXXXXXX" maxLength={7} style={inputStyle} />
                </div>
              </div>
              {/* Class */}
              <div>
                <label style={labelStyle}>{t('Class')}</label>
                <select name="class_level" value={form.class_level} onChange={handleChange} style={inputStyle}>
                  <option value="">{t('Select class...')}</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Language */}
              <div>
                <label style={labelStyle}>{t('Language')}</label>
                <select name="language" value={form.language} onChange={handleChange} style={inputStyle}>
                  <option value="">{t('Select language...')}</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{t(l)}</option>)}
                </select>
              </div>
            </div>
            {/* Sector — radio buttons full width */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>{t('Sector')}</label>
              <div className="radio-row" style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem' }}>
                {['Azerbaijan', 'Rus'].map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    <input
                      type="radio"
                      name="sector"
                      value={s}
                      checked={form.sector === s}
                      onChange={handleChange}
                      style={{ accentColor: '#059669', width: 16, height: 16 }}
                    />
                    {t(s)}
                  </label>
                ))}
                {form.sector && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, sector: '' }))}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                    {t('Clear')}
                  </button>
                )}
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-block"
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontWeight: 600 }}>
              {saving ? t('Adding...') : t('Add Student')}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="toolbar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('Search by name, number, email or mobile...')}
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }} />
        <button type="submit" style={{ padding: '0.5rem 1.25rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{t('Search')}</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            {t('Clear')}
          </button>
        )}
      </form>

      {/* Table */}
      {loading ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
            {students.length === 1 ? t('1 student') : t('{n} students', { n: students.length })}
          </div>
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Full Name', 'Number', 'Email', 'Mobile', 'Class', 'Sector', 'Language', 'Added'].map(h => (
                    <th key={h} className={HIDE_MOBILE.includes(h) ? 'hide-mobile' : undefined} style={th}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={9} className="empty-cell" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t('No students found.')}</td></tr>
                ) : students.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td className="hide-mobile" style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                    <td className="wrap-text" style={{ ...td, fontWeight: 600 }}>{s.full_name}</td>
                    <td style={td}>{s.student_number}</td>
                    <td className="wrap-text" style={td}>{s.email}</td>
                    <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.class_level || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={td}>{(s.sector && t(s.sector)) || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={td}>{(s.language && t(s.language)) || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td className="hide-mobile" style={td}>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const HIDE_MOBILE = ['#', 'Added'];
const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const inputStyle = { width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.8rem', marginBottom: '0.25rem', color: '#374151' };
