import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyAndLog } from '../../api/entry.api';
import { getExam } from '../../api/exams.api';

export default function EntryCheckPage() {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [studentNumber, setStudentNumber] = useState('');
  const [eventType, setEventType] = useState('entry');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentFeed, setRecentFeed] = useState([]);
  const inputRef = useRef();

  useEffect(() => {
    getExam(examId).then(res => setExam(res.data.data));
    inputRef.current?.focus();
  }, [examId]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!studentNumber.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyAndLog({ exam_id: examId, student_number: studentNumber.trim(), event_type: eventType });
      const data = res.data.data;
      setResult(data);
      if (data.allowed) {
        setRecentFeed(prev => [{ ...data.student, event_type: eventType, logged_at: data.logged_at }, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      const errData = err.response?.data?.data;
      setResult(errData || { allowed: false, reason: 'ERROR' });
    } finally {
      setLoading(false);
      setStudentNumber('');
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/security')} style={backBtn}>&larr;</button>
        <div>
          <h2 style={{ margin: 0 }}>{exam?.title || 'Loading...'}</h2>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{exam?.exam_location}</div>
        </div>
      </div>

      <form onSubmit={handleCheck} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <button type="button" onClick={() => setEventType('entry')} style={{ ...toggleBtn, background: eventType === 'entry' ? '#16a34a' : '#f1f5f9', color: eventType === 'entry' ? '#fff' : '#334155' }}>Entry</button>
          <button type="button" onClick={() => setEventType('exit')} style={{ ...toggleBtn, background: eventType === 'exit' ? '#dc2626' : '#f1f5f9', color: eventType === 'exit' ? '#fff' : '#334155' }}>Exit</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            type="text"
            value={studentNumber}
            onChange={e => setStudentNumber(e.target.value)}
            placeholder="Scan barcode or type student number..."
            style={{ flex: 1, padding: '0.6rem', border: '2px solid #3b82f6', borderRadius: 6, fontSize: '1rem' }}
          />
          <button type="submit" disabled={loading} style={{ padding: '0.6rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '1rem' }}>
            {loading ? '...' : 'Check'}
          </button>
        </div>
      </form>

      {result && <ResultCard result={result} />}

      {recentFeed.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem', color: '#475569' }}>Recent</h4>
          {recentFeed.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: item.event_type === 'entry' ? '#f0fdf4' : '#fff1f2', borderRadius: 4, marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              <span>{item.full_name} — Seat {item.seat_number}</span>
              <span style={{ color: '#94a3b8' }}>{new Date(item.logged_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }) {
  const color = result.allowed ? '#16a34a' : '#dc2626';
  const bg = result.allowed ? '#f0fdf4' : '#fef2f2';
  const reasonLabels = {
    OK: 'Access Granted',
    NOT_REGISTERED: 'Not Registered',
    ALREADY_INSIDE: 'Already Inside',
    NOT_INSIDE: 'Student Not Inside',
    ENTRY_WINDOW_CLOSED: 'Entry Window Closed',
    EXAM_CANCELLED: 'Exam Cancelled',
    EXAM_NOT_FOUND: 'Exam Not Found',
  };

  return (
    <div style={{ background: bg, border: `2px solid ${color}`, borderRadius: 8, padding: '1.25rem' }}>
      <div style={{ color, fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
        {reasonLabels[result.reason] || result.reason}
      </div>
      {result.student && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {result.student.photo_url && <img src={result.student.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{result.student.full_name}</div>
            <div style={{ color: '#64748b' }}>Seat: {result.student.seat_number || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const backBtn = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#0369a1' };
const toggleBtn = { padding: '0.4rem 1.2rem', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' };
