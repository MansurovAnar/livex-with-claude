import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';

const PREFIXES = ['010', '050', '051', '055', '070', '077', '099'];
const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const emptyForm = {
  student_number: '', full_name: '', email: '',
  mobile_prefix: '050', mobile_number: '',
  class_level: '', sector: '', language: '',
};

export default function MyStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = (q = '') => {
    setLoading(true);
    apiClient.get('/partner/students', { params: q ? { search: q } : {} })
      .then(res => setStudents(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => { e.preventDefault(); load(search); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const mobile = form.mobile_number ? `${form.mobile_prefix}${form.mobile_number}` : undefined;
      const res = await apiClient.post('/partner/students', {
        student_number: form.student_number,
        full_name: form.full_name,
        email: form.email,
        ...(mobile && { mobile_number: mobile }),
        ...(form.class_level && { class_level: Number(form.class_level) }),
        ...(form.sector && { sector: form.sector }),
        ...(form.language && { language: form.language }),
      });
      setSuccess(`${res.data.data.full_name} added successfully.`);
      setForm(emptyForm);
      load(search);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>My Students</h2>
        <button
          onClick={() => { setShowForm(f => !f); setError(''); setSuccess(''); }}
          style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          {showForm ? '✕ Cancel' : '+ Add Student'}
        </button>
      </div>

      {/* Add Student Form */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#065f46' }}>Add New Student</h3>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</div>}
          {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.6rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{success}</div>}
          <form onSubmit={handleAddStudent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Student Number */}
              <div>
                <label style={labelStyle}>Student Number <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="student_number" value={form.student_number} onChange={handleChange} required style={inputStyle} />
              </div>
              {/* Full Name */}
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />
              </div>
              {/* Email */}
              <div>
                <label style={labelStyle}>Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} />
              </div>
              {/* Mobile */}
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select name="mobile_prefix" value={form.mobile_prefix} onChange={handleChange} style={{ ...inputStyle, width: 80, flex: 'none' }}>
                    {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="tel" name="mobile_number" value={form.mobile_number} onChange={handleChange} placeholder="XXXXXXX" maxLength={7} style={inputStyle} />
                </div>
              </div>
              {/* Class */}
              <div>
                <label style={labelStyle}>Class</label>
                <select name="class_level" value={form.class_level} onChange={handleChange} style={inputStyle}>
                  <option value="">Select class...</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Language */}
              <div>
                <label style={labelStyle}>Language</label>
                <select name="language" value={form.language} onChange={handleChange} style={inputStyle}>
                  <option value="">Select language...</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {/* Sector — radio buttons full width */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Sector</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem' }}>
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
            <button type="submit" disabled={saving}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontWeight: 600 }}>
              {saving ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, number, email or mobile..."
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }} />
        <button type="submit" style={{ padding: '0.5rem 1.25rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      {loading ? <p style={{ color: '#94a3b8' }}>Loading...</p> : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
            {students.length} student{students.length !== 1 ? 's' : ''}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Full Name', 'Number', 'Email', 'Mobile', 'Class', 'Sector', 'Language', 'Added'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No students found.</td></tr>
                ) : students.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{s.full_name}</td>
                    <td style={td}>{s.student_number}</td>
                    <td style={td}>{s.email}</td>
                    <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.class_level || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={td}>{s.sector || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={td}>{s.language || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={td}>{new Date(s.created_at).toLocaleDateString()}</td>
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

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const inputStyle = { width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.8rem', marginBottom: '0.25rem', color: '#374151' };
