import React, { useEffect, useState } from 'react';
import { listStudents, updateStudent, deleteStudent } from '../../api/students.api';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState(null);

  const load = (q = '') => {
    setLoading(true);
    listStudents(q ? { search: q } : {}).then(res => setStudents(res.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this student?')) return;
    await deleteStudent(id);
    load(search);
  };

  return (
    <div>
      <h2>Students</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="Search..." style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <button onClick={() => load(search)} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Search</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>{['Number', 'Name', 'Email', 'Mobile', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{s.student_number}</td>
                <td style={td}>{s.full_name}</td>
                <td style={td}>{s.email}</td>
                <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {user?.role === 'admin' && (
                    <button onClick={() => setEditingStudent(s)} style={actionBtn('#475569')}>Edit</button>
                  )}
                  <button onClick={() => handleDelete(s.id)} style={actionBtn('#dc2626')}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={() => { setEditingStudent(null); load(search); }}
        />
      )}
    </div>
  );
}

function EditStudentModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_number: student.student_number,
    full_name: student.full_name,
    email: student.email,
    mobile_number: student.mobile_number || '',
    photo_url: student.photo_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateStudent(student.id, {
        student_number: form.student_number,
        full_name: form.full_name,
        email: form.email,
        mobile_number: form.mobile_number || null,
        photo_url: form.photo_url || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Edit Student</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Student Number <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="student_number" value={form.student_number} onChange={handleChange} required maxLength={7} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Mobile Number</label>
            <input name="mobile_number" value={form.mobile_number} onChange={handleChange} maxLength={10} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Photo URL</label>
            <input name="photo_url" value={form.photo_url} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const th = { padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 };
const td = { padding: '0.75rem', fontSize: '0.875rem' };
const actionBtn = bg => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.25rem' });
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const fieldStyle = { marginBottom: '1.1rem' };
