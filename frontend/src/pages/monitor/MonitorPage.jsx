import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getExamMonitor } from '../../api/monitor.api';
import { useSocket } from '../../contexts/SocketContext';

export default function MonitorPage() {
  const { examId } = useParams();
  const { connect, disconnect } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);
  const [insideCount, setInsideCount] = useState(0);

  useEffect(() => {
    getExamMonitor(examId).then(res => {
      setData(res.data.data);
      setInsideCount(res.data.data.currently_inside);
      setLiveFeed(res.data.data.recent_logs);
    }).finally(() => setLoading(false));

    connect(examId, (msg) => {
      if (msg.type === 'entry_event') {
        setLiveFeed(prev => [msg.data, ...prev.slice(0, 49)]);
        setInsideCount(prev => msg.data.event_type === 'entry' ? prev + 1 : Math.max(0, prev - 1));
      }
    });

    return () => disconnect();
  }, [examId]);

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (!data) return <p style={{ padding: '2rem' }}>Exam not found.</p>;

  const { exam, registered_count } = data;

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h2>{exam.title}</h2>
      <div style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        {exam.exam_location} &bull; {new Date(exam.scheduled_at).toLocaleString()}
        <span style={{ marginLeft: '1rem', background: '#0369a1', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.8rem' }}>{exam.status}</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Registered" value={registered_count} color="#2563eb" />
        <StatCard label="Inside" value={insideCount} color="#16a34a" />
        <StatCard label="Outside" value={registered_count - insideCount} color="#dc2626" />
        <StatCard label="Capacity" value={exam.capacity} color="#7e22ce" />
      </div>

      <h3>Live Entry Feed</h3>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        {liveFeed.length === 0 && <p style={{ padding: '1rem', color: '#94a3b8' }}>No entries yet.</p>}
        {liveFeed.map((log, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ background: log.event_type === 'entry' ? '#16a34a' : '#dc2626', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                {log.event_type.toUpperCase()}
              </span>
              <span style={{ fontWeight: 500 }}>{log.student_name}</span>
              {log.seat_number && <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Seat {log.seat_number}</span>}
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(log.logged_at).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: `2px solid ${color}`, borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{label}</div>
    </div>
  );
}
