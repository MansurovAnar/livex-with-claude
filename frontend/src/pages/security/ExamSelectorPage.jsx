import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExams } from '../../api/exams.api';

export default function ExamSelectorPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    listExams({ date: today })
      .then(res => setExams(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading exams...</p>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>Today's Exams</h2>
      {exams.length === 0 && <p style={{ color: '#64748b' }}>No exams scheduled today.</p>}
      {exams.map(exam => (
        <div key={exam.id} onClick={() => navigate(`/security/exam/${exam.id}`)}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{exam.title}</div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{exam.subject_code} &bull; {exam.exam_location}</div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
            {new Date(exam.scheduled_at).toLocaleTimeString()} &bull;
            <span style={{ marginLeft: '0.5rem', background: statusColor(exam.status), color: '#fff', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.75rem' }}>
              {exam.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function statusColor(s) {
  return s === 'ongoing' ? '#16a34a' : s === 'completed' ? '#64748b' : s === 'cancelled' ? '#dc2626' : '#2563eb';
}
