import React, { useEffect, useState } from 'react';
import {
  listExtraInfoOptions, createExtraInfoOption, updateExtraInfoOption, setExtraInfoOptionActive, moveExtraInfoOption,
} from '../../api/telesalesLeads.api';
import SuccessBanner from '../../components/shared/SuccessBanner';
import { useLanguage } from '../../i18n/LanguageContext';
import { extraInfoLabel } from '../telesales/leadOptions';

/**
 * Admin › Telesales › Extra Info Options (LV#72): the checkboxes of the lead form's
 * "Extra information" section. Options are never deleted, only deactivated, so leads keep them.
 */
export default function ExtraInfoOptionsPage() {
  const { lang, t, tError } = useLanguage();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  // null = closed, {} = create, row = edit
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    listExtraInfoOptions()
      .then(res => setOptions(res.data.data))
      .catch(err => setError(tError(err, 'Failed to load options')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved) => {
    const wasEdit = !!modal?.id;
    setModal(null);
    setError('');
    setSuccess(t(wasEdit ? 'Option "{name}" updated successfully.' : 'Option "{name}" added successfully.', { name: extraInfoLabel(saved, lang) }));
    load();
  };

  const toggleActive = async (o) => {
    const name = extraInfoLabel(o, lang);
    if (o.is_active && !confirm(t('Deactivate option "{name}"? Leads that already have it keep it.', { name }))) return;
    try {
      await setExtraInfoOptionActive(o.id, !o.is_active);
      setError('');
      setSuccess(t(o.is_active ? 'Option "{name}" deactivated.' : 'Option "{name}" activated.', { name }));
      load();
    } catch (err) {
      setSuccess('');
      setError(tError(err, 'Failed to update option'));
    }
  };

  const move = async (o, direction) => {
    setBusy(true);
    try {
      const res = await moveExtraInfoOption(o.id, direction);
      setOptions(res.data.data);
      setError('');
    } catch (err) {
      setSuccess('');
      setError(tError(err, 'Failed to update option'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '0.25rem', color: '#64748b', fontSize: '0.875rem' }}>{t('Telesales')}</div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>{t('Extra Info Options')}</h2>
        <button onClick={() => setModal({})}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}>
          {t('+ Add Option')}
        </button>
      </div>
      <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>
        {t('Checkboxes shown under "Extra information" in the lead form, in this order. Deactivated options are hidden from new selections but stay on leads that have them.')}
      </p>

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
                <th style={th}>{t('Label (English)')}</th>
                <th style={th} className="hide-mobile">{t('Label (Azerbaijani)')}</th>
                <th style={th}>{t('Status')}</th>
                <th style={th}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {options.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t('No options found.')}</td></tr>
              ) : options.map((o, i) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', opacity: o.is_active ? 1 : 0.65 }}>
                  <td style={{ ...td, color: '#94a3b8' }} className="hide-mobile">{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }} className="wrap-text">{o.label}</td>
                  <td style={td} className="hide-mobile wrap-text">{o.label_az || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                  <td style={td}>
                    <span style={{ background: o.is_active ? '#dcfce7' : '#f1f5f9', color: o.is_active ? '#16a34a' : '#64748b', padding: '0.15rem 0.6rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {t(o.is_active ? 'Active' : 'Inactive')}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => move(o, 'up')} disabled={busy || i === 0} aria-label={t('Move up')} title={t('Move up')} style={arrowBtn(busy || i === 0)}>↑</button>
                    <button onClick={() => move(o, 'down')} disabled={busy || i === options.length - 1} aria-label={t('Move down')} title={t('Move down')} style={arrowBtn(busy || i === options.length - 1)}>↓</button>
                    <button onClick={() => setModal(o)} style={actionBtn('#475569')}>{t('Edit')}</button>
                    {!o.is_locked && (
                      <button onClick={() => toggleActive(o)} style={actionBtn(o.is_active ? '#dc2626' : '#16a34a')}>
                        {t(o.is_active ? 'Deactivate' : 'Activate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <OptionModal
          option={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function OptionModal({ option, onClose, onSaved }) {
  const { t, tError } = useLanguage();
  const [label, setLabel] = useState(option?.label || '');
  const [labelAz, setLabelAz] = useState(option?.label_az || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = { label, label_az: labelAz };
      const res = option ? await updateExtraInfoOption(option.id, data) : await createExtraInfoOption(data);
      onSaved(res.data.data);
    } catch (err) {
      setError(tError(err, 'Failed to save option'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ '--modal-w': '460px', background: '#fff', borderRadius: 12, padding: '2rem', width: 'min(460px, calc(100vw - 24px))', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t(option ? 'Edit Option' : 'Add Option')}</h2>
          <button onClick={onClose} aria-label={t('Close')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>{t('Label (English)')} <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={label} onChange={e => setLabel(e.target.value)} required maxLength={150} autoFocus style={input} placeholder={t('e.g. Sibling graduating this year')} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>{t('Label (Azerbaijani)')}</label>
            <input value={labelAz} onChange={e => setLabelAz(e.target.value)} maxLength={150} style={input} />
            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>{t('Shown when the Azerbaijani language is selected; if empty, the English label is shown.')}</div>
          </div>

          <div className="stack-mobile" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
              {t('Cancel')}
            </button>
            <button type="submit" disabled={saving || !label.trim()}
              style={{ padding: '0.55rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving || !label.trim() ? 0.7 : 1 }}>
              {saving ? t('Saving...') : t(option ? 'Save Changes' : 'Add Option')}
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
const arrowBtn = (disabled) => ({ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.8rem', marginRight: '0.25rem', opacity: disabled ? 0.4 : 1 });
const input = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
