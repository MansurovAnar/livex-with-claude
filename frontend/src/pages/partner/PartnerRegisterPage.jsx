import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import StudentTicket from '../../components/shared/StudentTicket';

export default function PartnerRegisterPage() {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [seat, setSeat] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const searchRef = useRef();

  useEffect(() => {
    apiClient.get('/partner/exams').then(res => setExams(res.data.data));
    apiClient.get('/partner/students').then(res => setStudents(res.data.data));
  }, []);

  const filtered = studentQuery.trim() && !selectedStudent
    ? students.filter(s =>
        s.full_name.toLowerCase().includes(studentQuery.toLowerCase()) ||
        s.student_number.includes(studentQuery) ||
        s.email.toLowerCase().includes(studentQuery.toLowerCase())
      )
    : [];

  const handleSelect = (s) => {
    setSelectedStudent(s);
    setStudentQuery(s.full_name);
    setDropdownOpen(false);
  };

  const handleClear = () => {
    setSelectedStudent(null);
    setStudentQuery('');
    searchRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { setError('Please select a student.'); return; }
    if (!selectedExam) { setError('Please select an exam.'); return; }
    setError(''); setSubmitting(true);
    try {
      await apiClient.post(`/partner/exams/${selectedExam}/register`, {
        student_id: selectedStudent.id,
        seat_number: seat || undefined,
        room_number: roomNumber || undefined,
      });
      const exam = exams.find(ex => ex.id === selectedExam);
      setTicket({
        studentName: selectedStudent.full_name,
        studentNumber: selectedStudent.student_number,
        examTitle: exam?.title,
        examDate: exam?.scheduled_at,
        examLocation: exam?.exam_location,
        roomNumber: roomNumber || null,
        seatNumber: seat || null,
      });
      setSeat(''); setRoomNumber(''); setSelectedStudent(null); setStudentQuery(''); setSelectedExam('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (dt) => new Date(dt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  const fmtDur = (mins) => `${mins} min`;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ marginTop: 0 }}>Register to Exam</h2>

      {ticket && <StudentTicket data={ticket} onClose={() => setTicket(null)} />}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.75rem', borderRadius: 10, border: '1px solid #e2e8f0' }}>

        {/* Student searchable from own list */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Student <span style={{ color: '#dc2626' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={searchRef}
                type="text"
                value={studentQuery}
                onChange={e => { setStudentQuery(e.target.value); setSelectedStudent(null); setDropdownOpen(true); }}
                onFocus={() => filtered.length > 0 && setDropdownOpen(true)}
                placeholder="Search your students..."
                disabled={!!selectedStudent}
                style={{ ...inputStyle, flex: 1, background: selectedStudent ? '#f8fafc' : '#fff' }}
              />
              {selectedStudent && (
                <button type="button" onClick={handleClear}
                  style={{ padding: '0 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
                  ✕
                </button>
              )}
            </div>
            {dropdownOpen && filtered.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                {filtered.map(s => (
                  <div key={s.id} onMouseDown={() => handleSelect(s)}
                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <div style={{ fontWeight: 500 }}>{s.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.student_number} &bull; {s.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedStudent && (
            <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '0.875rem' }}>
              <strong>{selectedStudent.full_name}</strong>
              <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>{selectedStudent.student_number}</span>
            </div>
          )}
        </div>

        {/* Exam */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Exam <span style={{ color: '#dc2626' }}>*</span></label>
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} required style={inputStyle}>
            <option value="">Select exam...</option>
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.title} — {new Date(ex.scheduled_at).toLocaleDateString()} {new Date(ex.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </option>
            ))}
          </select>
          {exams.length === 0 && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>No scheduled exams.</div>}
          {selectedExam && (() => {
            const ex = exams.find(e => e.id === selectedExam);
            return ex ? (
              <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}>
                <span style={{ color: '#15803d', fontWeight: 600 }}>Exam Cost:</span>
                <span style={{ color: '#166534', fontWeight: 700 }}>{Number(ex.exam_cost).toFixed(2)} AZN</span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Room + Seat */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Room <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. 101" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Seat <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={seat} onChange={e => setSeat(e.target.value)} placeholder="e.g. A12" style={inputStyle} />
          </div>
        </div>

        <button type="submit" disabled={submitting}
          style={{ width: '100%', padding: '0.6rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontWeight: 600, fontSize: '0.95rem' }}>
          {submitting ? 'Registering...' : 'Register'}
        </button>
      </form>

      {/* Exams table */}
      <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', color: '#1e293b' }}>Available Exams</h3>
      {exams.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No scheduled or ongoing exams.</p>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={thStyle}>Exam Title</th>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Entry Opens</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex, i) => (
                <tr key={ex.id} style={{ borderBottom: i < exams.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={tdStyle}>
                    <Link to={`/partner/exams/${ex.id}/students`}
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                      {ex.title}
                    </Link>
                  </td>
                  <td style={tdStyle}>{fmt(ex.scheduled_at)}</td>
                  <td style={tdStyle}>{fmtDur(ex.duration_mins)}</td>
                  <td style={tdStyle}>{fmt(ex.entry_opens_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
const thStyle = { padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '0.65rem 1rem', color: '#374151' };
