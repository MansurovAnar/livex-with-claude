import React, { useEffect, useMemo, useState } from 'react';
import { listVillages, createVillage, updateVillage, setVillageActive } from '../../api/villages.api';
import SuccessBanner from '../../components/shared/SuccessBanner';
import { useLanguage } from '../../i18n/LanguageContext';

export default function VillagesPage() {
  const { t, tError } = useLanguage();
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  // null = closed, {} = create, row = edit
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    listVillages(showInactive ? { include_inactive: 'true' } : undefined)
      .then(res => setVillages(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load villages')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [showInactive]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('az');
    return q ? villages.filter(v => v.name.toLocaleLowerCase('az').includes(q)) : villages;
  }, [villages, search]);

  const handleSaved = (saved) => {
    const wasEdit = !!modal?.id;
    setModal(null);
    setError('');
    setSuccess(t(wasEdit ? 'Village "{name}" updated successfully.' : 'Village "{name}" added successfully.', { name: saved.name }));
    load();
  };

  const toggleActive = async (v) => {
    if (v.is_active && !confirm(t('Deactivate village "{name}"?', { name: v.name }))) return;
    try {
      await setVillageActive(v.id, !v.is_active);
      setError('');
      setSuccess(t(v.is_active ? 'Village "{name}" deactivated.' : 'Village "{name}" activated.', { name: v.name }));
      load();
    } catch (err) {
      setSuccess('');
      setError(tError(err, 'Failed to update village'));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '0.25rem', color: '#64748b', fontSize: '0.875rem' }}>{t('Telesales')}</div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('Villages')}</h2>
        <button onClick={() => setModal({})}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          {t('+ Add Village')}
        </button>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search village / street...')}
          className="full-mobile"
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', width: 320 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#475569', cursor: 'pointer', minHeight: 44 }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          {t('Show inactive')}
        </label>
      </div>

      <SuccessBanner message={success} onDismiss={() => setSuccess('')} />
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : (
        <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={th} className="hide-mobile">#</th>
                <th style={th}>{t('Village / Street')}</th>
                {showInactive && <th style={th}>{t('Status')}</th>}
                <th style={th}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={showInactive ? 4 : 3} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t('No villages found.')}</td></tr>
              ) : visible.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', opacity: v.is_active ? 1 : 0.65 }}>
                  <td style={{ ...td, color: '#94a3b8' }} className="hide-mobile">{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }} className="wrap-text">{v.name}</td>
                  {showInactive && (
                    <td style={td}>
                      <span style={{ background: v.is_active ? '#dcfce7' : '#f1f5f9', color: v.is_active ? '#16a34a' : '#64748b', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
                        {t(v.is_active ? 'Active' : 'Inactive')}
                      </span>
                    </td>
                  )}
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => setModal(v)} style={actionBtn('#475569')}>{t('Edit')}</button>
                    <button onClick={() => toggleActive(v)} style={actionBtn(v.is_active ? '#dc2626' : '#16a34a')}>
                      {t(v.is_active ? 'Deactivate' : 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <VillageModal
          village={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function VillageModal({ village, onClose, onSaved }) {
  const { t, tError } = useLanguage();
  const [name, setName] = useState(village?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = village
        ? await updateVillage(village.id, { name })
        : await createVillage({ name });
      onSaved(res.data.data);
    } catch (err) {
      setError(tError(err, 'Failed to save village'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ '--modal-w': '460px', background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t(village ? 'Edit Village' : 'Add Village')}</h2>
          <button onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={label}>{t('Village / Street')} <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} required maxLength={255} autoFocus style={input} placeholder={t('e.g. Qaysa village')} />
          </div>

          <div className="stack-mobile" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
              {t('Cancel')}
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving || !name.trim() ? 0.7 : 1 }}>
              {saving ? t('Saving...') : t(village ? 'Save Changes' : 'Add Village')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'top' };
const actionBtn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.25rem' });
const input = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const label = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
