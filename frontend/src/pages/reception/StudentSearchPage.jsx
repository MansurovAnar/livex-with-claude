import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listStudents } from '../../api/students.api';
import { PageSizeSelect, PaginationBar } from '../../components/shared/Pagination';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StudentSearchPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const load = (q = '', p = 1, l = limit) => {
    setLoading(true);
    const params = { page: p, limit: l };
    if (q) params.search = q;
    return listStudents(params)
      .then(res => { setStudents(res.data.data); setTotal(res.data.meta.total); setPage(p); })
      .finally(() => setLoading(false));
  };

  // Load first page on mount
  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  const handleLimitChange = (l) => { setLimit(l); load(search, 1, l); };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('Students')}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/reception/add')}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
            {t('+ Add New Student')}
          </button>
          <button
            onClick={() => navigate('/reception/register')}
            style={{ background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
            {t('+ Register to Exam')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="toolbar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('Search by name, number, email or mobile...')}
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }}
        />
        <button type="submit"
          style={{ padding: '0.5rem 1.25rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {t('Search')}
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }}
            style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}>
            {t('Clear')}
          </button>
        )}
      </form>

      <div className="pagination-top" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <PageSizeSelect limit={limit} onLimitChange={handleLimitChange} />
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>
      ) : (
        <>
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>{t('Full Name')}</th>
                  <th style={th}>{t('Student Number')}</th>
                  <th className="hide-mobile" style={th}>{t('Email')}</th>
                  <th style={th}>{t('Mobile')}</th>
                  <th style={th}>{t('Class')}</th>
                  <th className="hide-mobile" style={th}>{t('Sector')}</th>
                  <th className="hide-mobile" style={th}>{t('Language')}</th>
                  <th className="hide-mobile" style={th}>{t('Registered')}</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8}style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      {t('No students found.')}
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
                      <td className="hide-mobile" style={td}>{s.email}</td>
                      <td style={td}>{s.mobile_number || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={td}>{s.class_level ?? <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td className="hide-mobile" style={td}>{(s.sector && t(s.sector)) || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td className="hide-mobile" style={td}>{(s.language && t(s.language)) || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td className="hide-mobile" style={td}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} limit={limit} total={total} onPageChange={p => load(search, p)} />
        </>
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
