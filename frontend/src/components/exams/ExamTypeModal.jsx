import React, { useState } from 'react';
import { createExamType, updateExamType } from '../../api/examTypes.api';

// Create (examType = null) or edit an exam type. onSaved receives the saved row.
export default function ExamTypeModal({ examType, onClose, onSaved }) {
  const isEdit = !!examType;
  const [form, setForm] = useState({
    name: examType?.name || '',
    description: examType?.description || '',
  });
  const [details, setDetails] = useState(examType?.extra_details || []);
  const [newDetail, setNewDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const addDetail = () => {
    const value = newDetail.trim();
    if (!value) return;
    if (details.some(d => d.toLowerCase() === value.toLowerCase())) {
      setError(`"${value}" is already in the list`);
      return;
    }
    setError('');
    setDetails(d => [...d, value]);
    setNewDetail('');
  };

  const updateDetail = (idx, value) => setDetails(d => d.map((v, i) => (i === idx ? value : v)));
  const removeDetail = (idx) => setDetails(d => d.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    // Include a typed-but-not-added option so it isn't silently lost
    const extra_details = [...details, newDetail].map(d => d.trim()).filter(Boolean);
    try {
      const payload = { ...form, extra_details };
      const res = isEdit ? await updateExamType(examType.id, payload) : await createExamType(payload);
      onSaved(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || `Failed to ${isEdit ? 'update' : 'create'} exam type`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ '--modal-w': '520px', background: '#fff', borderRadius: 12, padding: '2rem', width: 'min(520px, 100vw - 24px)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{isEdit ? 'Edit Exam Type' : 'New Exam Type'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="name" value={form.name} onChange={handleChange} required autoFocus style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Extra Details</label>
            {details.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {details.map((d, i) => (
                  <div key={i} className="mobile-row" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input value={d} onChange={e => updateDetail(i, e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                    <button type="button" onClick={() => removeDetail(i)} title="Remove option"
                      style={{ flex: 'none', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '0.45rem 0.7rem', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mobile-row" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input value={newDetail} onChange={e => setNewDetail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDetail(); } }}
                placeholder="Add an option and press Enter" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              <button type="button" onClick={addDetail}
                style={{ flex: 'none', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.45rem 0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                + Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const fieldStyle = { marginBottom: '1.25rem' };
