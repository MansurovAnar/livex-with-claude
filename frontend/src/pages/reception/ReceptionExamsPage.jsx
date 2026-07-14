import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExams } from '../../api/exams.api';

const STATUS_COLORS = { scheduled: '#2563eb', ongoing: '#16a34a' };

export default function ReceptionExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'scheduled' | 'ongoing'

  useEffect(() => {
    Promise.all([
      listExams({ status: 'scheduled' }),
      listExams({ status: 'ongoing' }),
    ]).then(([s, o]) => {
      setExams([...o.data.data, ...s.data.data]);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? exams : exams.filter(e => e.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Exams</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'ongoing', 'scheduled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '0.35rem 0.9rem', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: filter === f ? 700 : 400, background: filter === f ? '#7e22ce' : '#fff', color: filter === f ? '#fff' : '#475569', fontSize: '0.85rem' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Loading...</p> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Exam Title', 'Subject Code', 'Location', 'Date & Time', 'Duration', 'Entry Opens', 'Entry Closes', 'Status'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No exams found.</td></tr>
              ) : filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/reception/exams/${e.id}/students`)}
                      style={{ background: 'none', border: 'none', color: '#7e22ce', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline', textAlign: 'left' }}>
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
                    <span style={{ background: STATUS_COLORS[e.status], color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
