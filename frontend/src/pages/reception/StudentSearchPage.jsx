import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listStudents } from '../../api/students.api';

export default function StudentSearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (q = '') => {
    setLoading(true);
    listStudents(q ? { search: q } : {})
      .then(res => { setStudents(res.data.data); setTotal(res.data.meta.total); })
      .finally(() => setLoading(false));
  };

  // Load all students on mount
  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Students</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/reception/add')}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
            + Add New Student
          </button>
          <button
            onClick={() => navigate('/reception/register')}
            style={{ background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
            + Register to Exam
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, number, email or mobile..."
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }}
        />
        <button type="submit"
          style={{ padding: '0.5rem 1.25rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
            {total} student{total !== 1 ? 's' : ''} found
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>Full Name</th>
                  <th style={th}>Student Number</th>
                  <th style={th}>Email</th>
                  <th style={th}>Mobile</th>
                  <th style={th}>Registered</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={td}>
                        <button
                          onClick={() => navigate('/reception/register', { state: { student: s } })}
                          style={{ background: 'none', border: 'none', color: '#7e22ce', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline' }}>
                          {s.full_name}
                        </button>
                      </td>
                      <td style={td}>{s.student_number}</td>
                      <td style={td}>{s.email}</td>
                      <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={td}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
