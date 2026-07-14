import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayDashboard } from '../../api/monitor.api';

export default function DashboardPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getTodayDashboard().then(res => setExams(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Today's Exams</h2>
      {exams.length === 0 && <p style={{ color: '#64748b' }}>No exams scheduled today.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {exams.map(exam => (
          <div key={exam.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{exam.title}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{exam.exam_location}</div>
            <div style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>{new Date(exam.scheduled_at).toLocaleTimeString()}</div>
            <div style={{ fontSize: '0.875rem' }}>Registered: <strong>{exam.registered_count}</strong></div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={() => navigate(`/admin/exams/${exam.id}`)} style={smallBtn('#2563eb')}>Manage</button>
              <button onClick={() => navigate(`/monitor/${exam.id}`)} style={smallBtn('#16a34a')}>Monitor</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const smallBtn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' });
