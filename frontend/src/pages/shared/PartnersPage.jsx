import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const basePath = user?.role === 'reception' ? '/reception/partners' : '/admin/partners';

  useEffect(() => {
    apiClient.get('/partners')
      .then(res => setPartners(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? partners.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.school.toLowerCase().includes(search.toLowerCase()) ||
        (p.school_address || '').toLowerCase().includes(search.toLowerCase())
      )
    : partners;

  if (loading) return <p style={{ padding: '1rem', color: '#94a3b8' }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Partners</h2>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {partners.length} partner{partners.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or school..."
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }} />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['#', 'Full Name', 'Email', 'School', 'School Address', 'Students', 'Status', 'Since'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  {search ? 'No partners match your search.' : 'No partners found.'}
                </td>
              </tr>
            ) : filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...td, color: '#94a3b8' }}>{i + 1}</td>
                <td style={td}>
                  <button
                    onClick={() => navigate(`${basePath}/${p.id}/exams`)}
                    style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline' }}>
                    {p.full_name}
                  </button>
                </td>
                <td style={td}>{p.email}</td>
                <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>{p.school}</td>
                <td style={{ ...td, color: '#475569' }}>{p.school_address}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.8rem' }}>
                    {p.number_of_students}
                  </span>
                </td>
                <td style={td}>
                  {p.is_active
                    ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.8rem' }}>Active</span>
                    : <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.8rem' }}>Inactive</span>}
                </td>
                <td style={{ ...td, color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
