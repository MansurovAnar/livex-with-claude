import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExams, deleteExam, updateExam, updateExamStatus } from '../../api/exams.api';
import apiClient from '../../api/apiClient';

const STATUS_COLORS = {
  scheduled: '#2563eb',
  ongoing: '#16a34a',
  completed: '#64748b',
  cancelled: '#dc2626',
};

const STATUS_OPTIONS = ['scheduled', 'ongoing', 'completed', 'cancelled'];

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExam, setEditingExam] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    listExams().then(res => setExams(res.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam?')) return;
    await deleteExam(id);
    load();
  };

  const handleStatus = async (id, status) => {
    await updateExamStatus(id, status);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Exams</h2>
        <button onClick={() => navigate('/admin/exams/new')}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          + New Exam
        </button>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Loading...</p> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Exam Title', 'Subject Code', 'Location', 'Date & Time', 'Duration', 'Entry Opens', 'Entry Closes', 'Commission', 'Status', 'Actions'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No exams found.</td></tr>
              ) : exams.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/admin/exams/${e.id}/students`)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline', textAlign: 'left' }}>
                      {e.title}
                    </button>
                  </td>
                  <td style={td}>{e.subject_code || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={td}>{e.exam_location}</td>
                  <td style={td}>{new Date(e.scheduled_at).toLocaleString()}</td>
                  <td style={td}>{e.duration_mins} min</td>
                  <td style={td}>{new Date(e.entry_opens_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={td}>{new Date(e.entry_closes_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={td}>
                    {Number(e.commission_amount) > 0
                      ? <span style={{ fontWeight: 600, color: '#0369a1' }}>{Number(e.commission_amount).toFixed(2)} AZN</span>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={td}>
                    <span style={{ background: STATUS_COLORS[e.status], color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditingExam(e)} style={actionBtn('#475569')}>Edit</button>
                    <button onClick={() => navigate(`/monitor/${e.id}`)} style={actionBtn('#16a34a')}>Monitor</button>
                    {e.status === 'scheduled' && <button onClick={() => handleStatus(e.id, 'ongoing')} style={actionBtn('#f59e0b')}>Start</button>}
                    {e.status === 'ongoing' && <button onClick={() => handleStatus(e.id, 'completed')} style={actionBtn('#64748b')}>End</button>}
                    <button onClick={() => handleDelete(e.id)} style={actionBtn('#dc2626')}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSaved={() => { setEditingExam(null); load(); }}
        />
      )}
    </div>
  );
}

function EditExamModal({ exam, onClose, onSaved }) {
  const [schools, setSchools] = useState([]);
  useEffect(() => {
    apiClient.get('/schools').then(res => setSchools(res.data.data));
  }, []);

  const [form, setForm] = useState({
    title: exam.title,
    subject_code: exam.subject_code || '',
    exam_location: exam.exam_location,
    exam_cost: Number(exam.exam_cost),
    commission_amount: Number(exam.commission_amount ?? 0),
    scheduled_at: toLocalDatetimeInput(new Date(exam.scheduled_at)),
    duration_mins: exam.duration_mins,
    entry_opens_at: toLocalDatetimeInput(new Date(exam.entry_opens_at)),
    entry_closes_at: toLocalDatetimeInput(new Date(exam.entry_closes_at)),
    status: exam.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
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
      await updateExam(exam.id, payload);
      if (form.status !== exam.status) {
        await updateExamStatus(exam.id, form.status);
      }
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
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Edit Exam</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Exam Title <span style={{ color: '#dc2626' }}>*</span></label>
            <input name="title" value={form.title} onChange={handleChange} required style={inputStyle} />
          </div>

          {/* Subject Code */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Subject Code</label>
            <input name="subject_code" value={form.subject_code} onChange={handleChange} style={inputStyle} />
          </div>

          {/* Location + Cost + Commission */}
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
              <label style={labelStyle}>Exam Cost</label>
              <div style={{ position: 'relative' }}>
                <input type="number" name="exam_cost" value={form.exam_cost} onChange={handleChange} min="0" step="0.01"
                  style={{ ...inputStyle, width: 120, paddingRight: '2.75rem' }} />
                <span style={azn}>AZN</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Commission</label>
              <div style={{ position: 'relative' }}>
                <input type="number" name="commission_amount" value={form.commission_amount} onChange={handleChange} min="0" step="0.01"
                  style={{ ...inputStyle, width: 120, paddingRight: '2.75rem' }} />
                <span style={azn}>AZN</span>
              </div>
            </div>
          </div>

          {/* Date + Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Exam Date &amp; Time <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="datetime-local" name="scheduled_at" value={form.scheduled_at} onChange={handleChange} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Duration (min) <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="number" name="duration_mins" value={form.duration_mins} onChange={handleChange} required min="1"
                style={{ ...inputStyle, width: 120 }} />
            </div>
          </div>

          {/* Entry Window */}
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

          {/* Status */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
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

function toLocalDatetimeInput(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const actionBtn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.25rem' });
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const fieldStyle = { marginBottom: '1.25rem' };
const azn = { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' };
