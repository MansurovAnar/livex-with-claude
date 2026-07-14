import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';

export default function PartnerMyExamStudentsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get(`/partner/exams/${examId}/students`)
      .then(res => {
        const data = res.data.data;
        setRows(data);
        if (data.length > 0) {
          setExamInfo({ title: data[0].exam_title, scheduled_at: data[0].scheduled_at, exam_location: data[0].exam_location });
        }
      })
      .finally(() => setLoading(false));
  }, [examId]);

  const filtered = search.trim()
    ? rows.filter(r =>
        r.full_name.toLowerCase().includes(search.toLowerCase()) ||
        r.student_number.includes(search)
      )
    : rows;

  const fmt = (dt) => new Date(dt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div>
      <button onClick={() => navigate('/partner/register')}
        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0 0 0.25rem', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        ← Back to Register
      </button>

      {examInfo && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, color: '#1e293b' }}>{examInfo.title}</h2>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {fmt(examInfo.scheduled_at)} &bull; {examInfo.exam_location}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by name or student number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.875rem', width: 280 }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
            Clear
          </button>
        )}
        <span style={{ color: '#64748b', fontSize: '0.875rem', marginLeft: 'auto' }}>
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Full Name</th>
                <th style={thStyle}>Student Number</th>
                <th style={thStyle}>Class</th>
                <th style={thStyle}>Sector</th>
                <th style={thStyle}>Language</th>
                <th style={thStyle}>Room</th>
                <th style={thStyle}>Seat</th>
                <th style={thStyle}>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No students found.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{r.full_name}</td>
                    <td style={tdStyle}>{r.student_number}</td>
                    <td style={tdStyle}>{r.class_level ?? '—'}</td>
                    <td style={tdStyle}>{r.sector ?? '—'}</td>
                    <td style={tdStyle}>{r.language ?? '—'}</td>
                    <td style={tdStyle}>{r.room_number ?? '—'}</td>
                    <td style={tdStyle}>{r.seat_number ?? '—'}</td>
                    <td style={tdStyle}>{new Date(r.registered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '0.65rem 1rem', color: '#374151' };
