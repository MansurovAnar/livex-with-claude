import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listExamTypes, deleteExamType } from '../../api/examTypes.api';
import ExamTypeModal from '../../components/exams/ExamTypeModal';
import SuccessBanner from '../../components/shared/SuccessBanner';

export default function ExamTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // null = closed, {} = create, row = edit
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    listExamTypes()
      .then(res => setTypes(res.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load exam types'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved) => {
    const wasEdit = !!modal?.id;
    setModal(null);
    setError('');
    setSuccess(`Exam type "${saved.name}" ${wasEdit ? 'updated' : 'added'} successfully.`);
    load();
  };

  const handleDelete = async (t) => {
    if (!confirm(`Delete exam type "${t.name}"?`)) return;
    try {
      await deleteExamType(t.id);
      setError('');
      setSuccess(`Exam type "${t.name}" deleted.`);
      load();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error?.message || 'Failed to delete exam type');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        <Link to="/admin/exams" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>← Exams</Link>
      </div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Exam Types</h2>
        <button onClick={() => setModal({})}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          + New Exam Type
        </button>
      </div>

      <SuccessBanner message={success} onDismiss={() => setSuccess('')} />
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8' }}>Loading...</p> : (
        <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={th} className="hide-mobile">#</th>
                <th style={th}>Name</th>
                <th style={th} className="hide-mobile">Description</th>
                <th style={th}>Extra Details</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No exam types yet.</td></tr>
              ) : types.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, color: '#94a3b8' }} className="hide-mobile">{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }} className="wrap-text">{t.name}</td>
                  <td style={{ ...td, color: '#475569' }} className="hide-mobile wrap-text">
                    {t.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={td}>
                    {t.extra_details?.length
                      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {t.extra_details.map(d => (
                            <span key={d} className="wrap-text" style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 500 }}>{d}</span>
                          ))}
                        </div>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => setModal(t)} style={actionBtn('#475569')}>Edit</button>
                    <button onClick={() => handleDelete(t)} style={actionBtn('#dc2626')}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ExamTypeModal
          examType={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'top' };
const actionBtn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.25rem' });
