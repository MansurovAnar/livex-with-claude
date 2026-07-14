import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExam } from '../../api/exams.api';
import { listRegistrations, registerStudent, deregisterStudent } from '../../api/registrations.api';
import { listStudents } from '../../api/students.api';

export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [seat, setSeat] = useState('');

  const load = async () => {
    const [examRes, regRes] = await Promise.all([getExam(id), listRegistrations(id)]);
    setExam(examRes.data.data);
    setRegistrations(regRes.data.data);
  };
  useEffect(() => { load(); }, [id]);

  const handleSearch = async () => {
    if (!studentSearch.trim()) return;
    const res = await listStudents({ search: studentSearch });
    setSearchResults(res.data.data);
  };

  const handleRegister = async (studentId) => {
    await registerStudent(id, { student_id: studentId, seat_number: seat || undefined });
    setSeat(''); setStudentSearch(''); setSearchResults([]);
    load();
  };

  const handleDeregister = async (regId) => {
    if (!confirm('Remove this student from the exam?')) return;
    await deregisterStudent(regId);
    load();
  };

  if (!exam) return <p>Loading...</p>;

  return (
    <div>
      <button onClick={() => navigate('/admin/exams')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', marginBottom: '1rem' }}>&larr; Back to Exams</button>
      <h2>{exam.title}</h2>
      <div style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        {exam.subject_code && <span>{exam.subject_code} &bull; </span>}
        {exam.exam_location} &bull; {new Date(exam.scheduled_at).toLocaleString()} &bull; {exam.duration_mins} min
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <h3>Registered Students ({registrations.length} / {exam.capacity})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr><th style={th}>Student</th><th style={th}>Number</th><th style={th}>Seat</th><th style={th}></th></tr>
            </thead>
            <tbody>
              {registrations.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{r.full_name}</td>
                  <td style={td}>{r.student_number}</td>
                  <td style={td}>{r.seat_number || '—'}</td>
                  <td style={td}><button onClick={() => handleDeregister(r.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ width: 300 }}>
          <h3>Add Student</h3>
          <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search student..." style={inputStyle} />
          <button onClick={handleSearch} style={btnStyle('#2563eb')}>Search</button>
          <input value={seat} onChange={e => setSeat(e.target.value)} placeholder="Seat number (optional)" style={{ ...inputStyle, marginTop: '0.5rem' }} />
          {searchResults.map(s => (
            <div key={s.id} onClick={() => handleRegister(s.id)}
              style={{ padding: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, marginTop: '0.25rem', cursor: 'pointer' }}>
              <div style={{ fontWeight: 500 }}>{s.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.student_number}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const th = { padding: '0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600 };
const td = { padding: '0.6rem', fontSize: '0.85rem' };
const inputStyle = { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.9rem', boxSizing: 'border-box' };
const btnStyle = (bg) => ({ width: '100%', marginTop: '0.5rem', padding: '0.4rem', background: bg, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' });
