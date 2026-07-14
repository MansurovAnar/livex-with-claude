import React, { useState } from 'react';
import { createStudent } from '../../api/students.api';

const PREFIXES = ['010', '050', '051', '055', '070', '077', '099'];

export default function AddStudentPage() {
  const [form, setForm] = useState({ student_number: '', full_name: '', email: '', mobile_prefix: '050', mobile_number: '' });
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(null); setLoading(true);
    try {
      const fullMobile = form.mobile_number ? `${form.mobile_prefix}${form.mobile_number}` : undefined;
      const payload = {
        student_number: form.student_number,
        full_name: form.full_name,
        email: form.email,
        ...(fullMobile && { mobile_number: fullMobile }),
      };
      const res = await createStudent(payload);
      setSuccess(res.data.data);
      setForm({ student_number: '', full_name: '', email: '', mobile_prefix: '050', mobile_number: '' });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2>Add New Student</h2>
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
          Student <strong>{success.full_name}</strong> added successfully. ID: {success.student_number}
        </div>
      )}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>

        {[
          { name: 'student_number', label: 'Student Number', type: 'text', required: true },
          { name: 'full_name', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
        ].map(f => (
          <div key={f.name} style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>{f.label}<span style={{ color: '#dc2626' }}> *</span></label>
            <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange} required
              style={inputStyle} />
          </div>
        ))}

        {/* Mobile with prefix */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Mobile Number</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              name="mobile_prefix"
              value={form.mobile_prefix}
              onChange={handleChange}
              style={{ ...inputStyle, width: 90, flex: 'none' }}
            >
              {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="tel"
              name="mobile_number"
              value={form.mobile_number}
              onChange={handleChange}
              placeholder="XXXXXXX"
              maxLength={7}
              style={inputStyle}
            />
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '0.6rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 4, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Adding...' : 'Add Student'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem', color: '#374151' };
