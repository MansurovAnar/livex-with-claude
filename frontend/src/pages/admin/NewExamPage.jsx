import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExam } from '../../api/exams.api';
import apiClient from '../../api/apiClient';

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontWeight: 500,
  fontSize: '0.875rem',
  marginBottom: '0.3rem',
  color: '#374151',
};

const fieldStyle = { marginBottom: '1.25rem' };

export default function NewExamPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    apiClient.get('/schools').then(res => setSchools(res.data.data));
  }, []);

  const [form, setForm] = useState({
    title: '',
    subject_code: '',
    exam_location: '',
    exam_cost: 0,
    commission_amount: 0,
    scheduled_at: '',
    duration_mins: 120,
    entry_opens_at: '',
    entry_closes_at: '',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleScheduledAt = (e) => {
    const val = e.target.value;
    setForm(f => {
      const updated = { ...f, scheduled_at: val };
      if (val) {
        const scheduled = new Date(val);
        const opens = new Date(scheduled.getTime() - 30 * 60 * 1000);
        const closes = new Date(scheduled.getTime() + 15 * 60 * 1000);
        updated.entry_opens_at = toLocalDatetimeInput(opens);
        updated.entry_closes_at = toLocalDatetimeInput(closes);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        subject_code: form.subject_code || undefined,
        exam_location: form.exam_location,
        exam_cost: form.exam_cost,
        commission_amount: form.commission_amount,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_mins: form.duration_mins,
        entry_opens_at: new Date(form.entry_opens_at).toISOString(),
        entry_closes_at: new Date(form.entry_closes_at).toISOString(),
      };
      await createExam(payload);
      navigate('/admin/exams');
    } catch (err) {
      const detail = err.response?.data?.error;
      setError(detail?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => navigate('/admin/exams')}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#2563eb' }}>
          &larr;
        </button>
        <h2 style={{ margin: 0 }}>New Exam</h2>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.75rem', borderRadius: 10, border: '1px solid #e2e8f0' }}>

        {/* Title */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Exam Title <span style={{ color: '#dc2626' }}>*</span></label>
          <input name="title" value={form.title} onChange={handleChange} required style={inputStyle} placeholder="e.g. Mathematics Final Exam" />
        </div>

        {/* Subject Code */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Subject Code</label>
          <input name="subject_code" value={form.subject_code} onChange={handleChange} style={inputStyle} placeholder="e.g. MATH101" />
        </div>

        {/* Exam Location + Cost + Commission */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Exam Location <span style={{ color: '#dc2626' }}>*</span></label>
            <select name="exam_location" value={form.exam_location} onChange={handleChange} required style={inputStyle}>
              <option value="">— Select location —</option>
              <option value="General">General</option>
              {schools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Exam Cost <span style={{ color: '#dc2626' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                name="exam_cost"
                value={form.exam_cost}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                style={{ ...inputStyle, width: 130, paddingRight: '2.75rem' }}
              />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>AZN</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Commission Amount</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                name="commission_amount"
                value={form.commission_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                style={{ ...inputStyle, width: 130, paddingRight: '2.75rem' }}
              />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>AZN</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', margin: '1.5rem 0' }} />

        {/* Scheduled At */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Exam Date &amp; Time <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            type="datetime-local"
            name="scheduled_at"
            value={form.scheduled_at}
            onChange={handleScheduledAt}
            required
            style={inputStyle}
          />
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Entry window will be auto-filled: opens 30 min before, closes 15 min after start.
          </div>
        </div>

        {/* Duration */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Duration (minutes) <span style={{ color: '#dc2626' }}>*</span></label>
          <input type="number" name="duration_mins" value={form.duration_mins} onChange={handleChange} required min="1" style={{ ...inputStyle, width: 160 }} />
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', margin: '1.5rem 0' }} />

        {/* Entry Window */}
        <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Entry Window</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Gate Opens <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="datetime-local" name="entry_opens_at" value={form.entry_opens_at} onChange={handleChange} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Gate Closes <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="datetime-local" name="entry_closes_at" value={form.entry_closes_at} onChange={handleChange} required style={inputStyle} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" onClick={() => navigate('/admin/exams')}
            style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Creating...' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  );
}

function toLocalDatetimeInput(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
