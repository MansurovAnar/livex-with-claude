import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/schools'),
      apiClient.get('/users?role=partner'),
    ]).then(([sc, us]) => {
      setSchools(sc.data.data);
      setPartners((us.data.data || []).filter(u => u.role === 'partner'));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this school?')) return;
    await apiClient.delete(`/schools/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Schools</h2>
        <button onClick={() => setShowForm(true)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          + Add New School
        </button>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Loading...</p> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['#', 'School Name', 'Location', 'Director', 'Students (1–7)', 'Students (8–11)', 'Assigned To', 'Actions'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No schools found.</td></tr>
              ) : schools.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                  <td style={td}>{s.location}</td>
                  <td style={td}>{s.director_name}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{s.students_1_to_7}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{s.students_8_to_11}</td>
                  <td style={td}>
                    {s.assigned_to_name
                      ? <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>{s.assigned_to_name}</span>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={td}>
                    <button onClick={() => handleDelete(s.id)}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AddSchoolModal
          partners={partners}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function AddSchoolModal({ partners, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    location: '',
    students_1_to_7: '',
    students_8_to_11: '',
    director_name: '',
    assigned_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient.post('/schools', {
        name: form.name,
        location: form.location,
        students_1_to_7: Number(form.students_1_to_7) || 0,
        students_8_to_11: Number(form.students_8_to_11) || 0,
        director_name: form.director_name,
        assigned_to: form.assigned_to || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add school');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 560, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Add New School</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={field}>
            <label style={label}>Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="name" value={form.name} onChange={handleChange} required style={input} placeholder="e.g. School №5" />
          </div>

          <div style={field}>
            <label style={label}>Location <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="location" value={form.location} onChange={handleChange} required style={input} placeholder="e.g. Balakən, Müsəlim küç. 12" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={label}>Students (grades 1–7)</label>
              <input type="number" name="students_1_to_7" value={form.students_1_to_7} onChange={handleChange} min="0" style={input} placeholder="0" />
            </div>
            <div>
              <label style={label}>Students (grades 8–11)</label>
              <input type="number" name="students_8_to_11" value={form.students_8_to_11} onChange={handleChange} min="0" style={input} placeholder="0" />
            </div>
          </div>

          <div style={field}>
            <label style={label}>Name of Director <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="director_name" value={form.director_name} onChange={handleChange} required style={input} placeholder="Full name" />
          </div>

          <div style={field}>
            <label style={label}>Assigned To</label>
            <select name="assigned_to" value={form.assigned_to} onChange={handleChange} style={input}>
              <option value="">— Select partner —</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Add School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const input = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const label = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const field = { marginBottom: '1.25rem' };
