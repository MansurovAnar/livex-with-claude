import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listExams } from '../../api/exams.api';
import { listStudents } from '../../api/students.api';
import { registerStudent } from '../../api/registrations.api';
import StudentTicket from '../../components/shared/StudentTicket';

export default function RegisterToExamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Pre-filled student passed via navigation state
  const prefilledStudent = location.state?.student || null;

  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [seat, setSeat] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  // Student search state
  const [studentQuery, setStudentQuery] = useState(prefilledStudent ? prefilledStudent.full_name : '');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(prefilledStudent);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef();

  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listExams({ status: 'scheduled' }).then(res => setExams(res.data.data));
  }, []);

  // Search students as user types
  useEffect(() => {
    if (!studentQuery.trim() || selectedStudent) { setStudentResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await listStudents({ search: studentQuery, limit: 10 });
      setStudentResults(res.data.data);
      setDropdownOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery, selectedStudent]);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentQuery(student.full_name);
    setStudentResults([]);
    setDropdownOpen(false);
  };

  const handleStudentClear = () => {
    setSelectedStudent(null);
    setStudentQuery('');
    setStudentResults([]);
    searchRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { setError('Please select a student.'); return; }
    if (!selectedExam) { setError('Please select an exam.'); return; }
    setError(''); setTicket(null); setSubmitting(true);
    try {
      await registerStudent(selectedExam, { student_id: selectedStudent.id, seat_number: seat || undefined, room_number: roomNumber || undefined });
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
      setSeat('');
      setRoomNumber('');
      setSelectedStudent(null);
      setStudentQuery('');
      setSelectedExam('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => navigate('/reception')}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#7e22ce' }}>
          &larr;
        </button>
        <h2 style={{ margin: 0 }}>Register Student to Exam</h2>
      </div>

      {ticket && (
        <StudentTicket data={ticket} onClose={() => setTicket(null)} />
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.75rem', borderRadius: 10, border: '1px solid #e2e8f0' }}>

        {/* Student searchable dropdown */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Student <span style={{ color: '#dc2626' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={searchRef}
                type="text"
                value={studentQuery}
                onChange={e => { setStudentQuery(e.target.value); setSelectedStudent(null); }}
                onFocus={() => studentResults.length > 0 && setDropdownOpen(true)}
                placeholder="Search by name, number or email..."
                disabled={!!selectedStudent}
                style={{ ...inputStyle, flex: 1, background: selectedStudent ? '#f8fafc' : '#fff' }}
              />
              {selectedStudent && (
                <button type="button" onClick={handleStudentClear}
                  style={{ padding: '0 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
                  ✕
                </button>
              )}
            </div>
            {dropdownOpen && studentResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 220, overflowY: 'auto' }}>
                {studentResults.map(s => (
                  <div key={s.id} onMouseDown={() => handleStudentSelect(s)}
                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <div style={{ fontWeight: 500 }}>{s.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.student_number} &bull; {s.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedStudent && (
            <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 6, fontSize: '0.875rem' }}>
              <strong>{selectedStudent.full_name}</strong>
              <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>{selectedStudent.student_number} &bull; {selectedStudent.mobile_number || selectedStudent.email}</span>
            </div>
          )}
        </div>

        {/* Exam dropdown */}
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
          {exams.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>No scheduled exams found.</div>
          )}
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
            <label style={labelStyle}>Room Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. 101" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Seat Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={seat} onChange={e => setSeat(e.target.value)} placeholder="e.g. A12" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/reception')}
            style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            style={{ padding: '0.55rem 1.5rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
