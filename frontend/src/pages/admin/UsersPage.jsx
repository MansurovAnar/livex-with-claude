import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';

const ROLES = ['admin', 'security', 'viewer', 'reception', 'partner'];

const emptyForm = { full_name: '', email: '', password: '', role: 'security', school: '', school_address: '', number_of_students: '', initial_student_number: '' };
const STUDENT_NUMBER_RE = /^\d{1,7}$/;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingPartner, setEditingPartner] = useState(null);

  const load = () => apiClient.get('/users').then(res => setUsers(res.data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (form.role === 'partner' && schools.length === 0) {
      apiClient.get('/schools').then(res => setSchools(res.data.data));
    }
  }, [form.role]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSchoolSelect = (e) => {
    const schoolId = e.target.value;
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      const total = (Number(school.students_1_to_7) || 0) + (Number(school.students_8_to_11) || 0);
      setForm(f => ({ ...f, school: school.name, school_address: school.location, number_of_students: total }));
    } else {
      setForm(f => ({ ...f, school: '', school_address: '', number_of_students: '' }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.role === 'partner' && !STUDENT_NUMBER_RE.test(form.initial_student_number)) {
      setError('Starting student number must be 1-7 digits');
      return;
    }
    try {
      await apiClient.post('/users', form);
      setForm(emptyForm);
      setConfirmPassword('');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const handleToggle = async (id, is_active) => {
    await apiClient.put(`/users/${id}`, { is_active: !is_active });
    load();
  };

  if (loading) return <p>Loading...</p>;

  const isPartner = form.role === 'partner';

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <h2>Users</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>{['Name', 'Email', 'Role', 'School', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{u.full_name}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <span style={{ background: roleColor(u.role), color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 12, fontSize: '0.75rem' }}>{u.role}</span>
                </td>
                <td style={td}>
                  {u.school ? (
                    <span title={`${u.school_address} • ${u.number_of_students} students • starts at ${u.initial_student_number}`} style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {u.school}
                    </span>
                  ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
                <td style={td}>{u.is_active ? <span style={{ color: '#16a34a' }}>Active</span> : <span style={{ color: '#dc2626' }}>Inactive</span>}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {u.role === 'partner' && (
                    <button onClick={() => setEditingPartner(u)} style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.25rem' }}>
                      Edit
                    </button>
                  )}
                  <button onClick={() => handleToggle(u.id, u.is_active)} style={{ background: u.is_active ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ width: 300 }}>
        <h3>Create User</h3>
        {error && <div style={{ color: '#dc2626', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          {[['full_name', 'Full Name', 'text'], ['email', 'Email', 'email'], ['password', 'Password', 'password']].map(([name, label, type]) => (
            <div key={name} style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>{label}</label>
              {type === 'password' ? (
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} name={name} value={form[name]} onChange={handleChange} required style={{ ...inputStyle, paddingRight: '2.2rem' }} />
                  <button type="button" onClick={() => setShowPassword(s => !s)} title={showPassword ? 'Hide password' : 'Show password'} aria-label={showPassword ? 'Hide password' : 'Show password'} style={eyeButton}>
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              ) : (
                <input type={type} name={name} value={form[name]} onChange={handleChange} required style={inputStyle} />
              )}
            </div>
          ))}

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Confirm Password</label>
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
            {confirmPassword && form.password !== confirmPassword && (
              <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>Passwords do not match</div>
            )}
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Role</label>
            <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          {/* Partner-only fields */}
          {isPartner && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Partner Details
              </div>
              <div style={{ marginBottom: '0.6rem' }}>
                <label style={labelStyle}>School <span style={{ color: '#dc2626' }}>*</span></label>
                <select onChange={handleSchoolSelect} required={isPartner} style={inputStyle} defaultValue="">
                  <option value="">— Select school —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '0.6rem' }}>
                <label style={labelStyle}>School Address <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="school_address" value={form.school_address} onChange={handleChange} required={isPartner} placeholder="Full address" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.6rem' }}>
                <label style={labelStyle}>Number of Students <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="number" name="number_of_students" value={form.number_of_students} onChange={handleChange} required={isPartner} min="0" placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Starting Student Number <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" inputMode="numeric" name="initial_student_number" value={form.initial_student_number} onChange={handleChange} required={isPartner} maxLength={7} pattern="\d{1,7}" title="1-7 digits" placeholder="e.g. 1000" style={inputStyle} />
              </div>
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Create
          </button>
        </form>
      </div>

      {editingPartner && (
        <EditPartnerModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSaved={() => { setEditingPartner(null); load(); }}
        />
      )}
    </div>
  );
}

function EditPartnerModal({ partner, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: partner.full_name,
    email: partner.email,
    initial_student_number: partner.initial_student_number || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (!STUDENT_NUMBER_RE.test(form.initial_student_number)) {
      setError('Starting student number must be 1-7 digits');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put(`/users/${partner.id}`, form);
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
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Edit Partner</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>
        {error && <div style={{ color: '#dc2626', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Full Name</label>
            <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Partner Details
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.6rem' }}>{partner.school}</div>
            <label style={labelStyle}>Starting Student Number <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="text" inputMode="numeric" name="initial_student_number" value={form.initial_student_number} onChange={handleChange} required maxLength={7} pattern="\d{1,7}" title="1-7 digits" style={inputStyle} />
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem' }}>
              Used only while the partner has no students; otherwise the next number is the highest existing one + 1.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.45rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '0.45rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EyeIcon({ off }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

function roleColor(role) {
  return { admin: '#dc2626', security: '#0369a1', viewer: '#64748b', reception: '#7e22ce', partner: '#059669' }[role] || '#475569';
}

const th = { padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 };
const td = { padding: '0.75rem', fontSize: '0.875rem' };
const inputStyle = { width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem', boxSizing: 'border-box' };
const eyeButton = { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' };
const labelStyle = { display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' };
