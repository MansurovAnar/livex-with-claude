import React, { useEffect, useState } from 'react';
import { listStudents, deleteStudent } from '../../api/students.api';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (q = '') => {
    setLoading(true);
    listStudents(q ? { search: q } : {}).then(res => setStudents(res.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this student?')) return;
    await deleteStudent(id);
    load(search);
  };

  return (
    <div>
      <h2>Students</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="Search..." style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <button onClick={() => load(search)} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Search</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>{['Number', 'Name', 'Email', 'Mobile', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{s.student_number}</td>
                <td style={td}>{s.full_name}</td>
                <td style={td}>{s.email}</td>
                <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                <td style={td}><button onClick={() => handleDelete(s.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 };
const td = { padding: '0.75rem', fontSize: '0.875rem' };
