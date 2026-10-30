import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createLead, getLead, updateLead } from '../../api/telesalesLeads.api';
import { SchoolSelect, VillageSelect } from '../../components/shared/SchoolVillageSelects';
import { useAuth } from '../../contexts/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import { useLanguage } from '../../i18n/LanguageContext';

const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const SECTORS = ['Azerbaijan', 'Rus'];
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const PHONE_OWNERS = ['Self', 'Father', 'Mother', 'Grandmother', 'Grandfather', 'Brother', 'Sister', 'Relative'];
const PARENT_RELATIONS = ['Mother', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Brother', 'Sister'];
const EXTRA_INFO = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'marriage_ceremony', label: 'Marriage ceremony' },
  { value: 'another_student_at_home', label: 'Another student at home' },
  { value: 'someone_died_recently', label: 'Someone died recently' },
  { value: 'someone_in_hospital', label: 'Someone in hospital' },
  { value: 'father_in_russia', label: 'Father living in Russia' },
  { value: 'mother_died', label: 'Mother died' },
  { value: 'father_died', label: 'Father died' },
];

const emptyPhone = () => ({ phone_number: '', owner_label: '' });
const emptyForm = () => ({
  first_name: '', last_name: '', father_name: '', parent_name: '', parent_relation: '',
  school_id: '', village_id: '', class_level: '', sector: '', language: '', income_source: '',
  extra_info: [], another_student_class: '', extra_info_other: '',
  knows_hedef_student: false, hedef_student_name: '',
  phones: [emptyPhone()],
});

// API lead → form state
const toForm = (lead) => ({
  first_name: lead.first_name || '',
  last_name: lead.last_name || '',
  father_name: lead.father_name || '',
  parent_name: lead.parent_name || '',
  parent_relation: lead.parent_relation || '',
  school_id: lead.school_id || '',
  village_id: lead.village_id || '',
  class_level: lead.class_level ? String(lead.class_level) : '',
  sector: lead.sector || '',
  language: lead.language || '',
  income_source: lead.income_source || '',
  extra_info: lead.extra_info || [],
  another_student_class: lead.another_student_class ? String(lead.another_student_class) : '',
  extra_info_other: lead.extra_info_other || '',
  knows_hedef_student: !!lead.knows_hedef_student,
  hedef_student_name: lead.hedef_student_name || '',
  phones: lead.phones?.length
    ? lead.phones.map(p => ({ phone_number: p.phone_number, owner_label: p.owner_label || '' }))
    : [emptyPhone()],
});

// Form state → API payload (empty optional fields are sent as null)
const toPayload = (form) => ({
  ...form,
  village_id: form.village_id || null,
  class_level: Number(form.class_level),
  another_student_class: form.extra_info.includes('another_student_at_home') && form.another_student_class
    ? Number(form.another_student_class) : null,
  hedef_student_name: form.knows_hedef_student ? form.hedef_student_name : null,
  phones: form.phones.filter((p, i) => i === 0 || p.phone_number.trim()),
});

/**
 * Add / edit a telesales lead. Mounted for telesales (/telesales/leads/…)
 * and admin (/admin/telesales/leads/…); `:id` present = edit.
 */
export default function LeadFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const { t, tError } = useLanguage();
  const isMobile = useIsMobile();
  const listPath = user?.role === 'admin' ? '/admin/telesales/leads' : '/telesales';
  const formBase = user?.role === 'admin' ? '/admin/telesales/leads' : '/telesales/leads';

  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(null);       // lead returned by the last save
  const [current, setCurrent] = useState(null);   // lead as loaded (edit mode), for names of inactive school/village
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) { setForm(emptyForm()); setCurrent(null); setLoading(false); return; }
    setLoading(true); setError('');
    getLead(id)
      .then(res => { setCurrent(res.data.data); setForm(toForm(res.data.data)); })
      .catch(err => setError(tError(err, 'Failed to load lead')))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (name, value) => setForm(f => ({ ...f, [name]: value }));
  const handleChange = e => set(e.target.name, e.target.value);

  const toggleExtra = (value) => setForm(f => ({
    ...f,
    extra_info: f.extra_info.includes(value) ? f.extra_info.filter(v => v !== value) : [...f.extra_info, value],
  }));

  const setPhone = (index, field, value) => setForm(f => ({
    ...f, phones: f.phones.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
  }));
  const addPhone = () => setForm(f => ({ ...f, phones: [...f.phones, emptyPhone()] }));
  const removePhone = (index) => setForm(f => ({ ...f, phones: f.phones.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaved(null);
    setSaving(true);
    try {
      const payload = toPayload(form);
      const res = isEdit ? await updateLead(id, payload) : await createLead(payload);
      setSaved(res.data.data);
      if (isEdit) { setCurrent(res.data.data); setForm(toForm(res.data.data)); }
      else setForm(emptyForm());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(tError(err, 'Failed to save lead'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p>;
  if (isEdit && !current) {
    return (
      <div>
        {error && <div style={errorBox}>{error}</div>}
        <Link to={listPath} style={linkStyle}>← {t('Back to leads')}</Link>
      </div>
    );
  }

  const req = <span style={{ color: '#dc2626' }}> *</span>;

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{isEdit ? t('Edit Lead') : t('Add Lead')}</h2>
        <Link to={listPath} style={linkStyle}>← {t('Back to leads')}</Link>
      </div>

      {saved && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }} className="wrap-text">
          {t(isEdit ? 'Lead "{name}" updated successfully.' : 'Lead "{name}" added successfully.', { name: `${saved.first_name} ${saved.last_name}` })}
          {!isEdit && <> <Link to={`${formBase}/${saved.id}/edit`} style={linkStyle}>{t('Edit')}</Link></>}
        </div>
      )}
      {error && <div style={errorBox} className="wrap-text">{error}</div>}

      <form onSubmit={handleSubmit} style={card}>
        {/* ── Student ── */}
        <h3 style={sectionTitle}>{t('Student')}</h3>
        <div className="form-grid" style={grid}>
          <Field label={<>{t('Name')}{req}</>}>
            <input name="first_name" value={form.first_name} onChange={handleChange} required maxLength={100} style={inputStyle} />
          </Field>
          <Field label={<>{t('Surname')}{req}</>}>
            <input name="last_name" value={form.last_name} onChange={handleChange} required maxLength={100} style={inputStyle} />
          </Field>
          <Field label={<>{t('School')}{req}</>}>
            <SchoolSelect value={form.school_id} onChange={v => set('school_id', v)} required
              extraOption={current?.school_id ? { value: current.school_id, label: current.school_name } : null} />
          </Field>
          <Field label={t('Village / Street')}>
            <VillageSelect value={form.village_id} onChange={v => set('village_id', v)}
              extraOption={current?.village_id ? { value: current.village_id, label: current.village_name } : null} />
          </Field>
          <Field label={<>{t('Class')}{req}</>}>
            <select name="class_level" value={form.class_level} onChange={handleChange} required style={inputStyle}>
              <option value="">{t('Select class...')}</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={<>{t('Language')}{req}</>}>
            <select name="language" value={form.language} onChange={handleChange} required style={inputStyle}>
              <option value="">{t('Select language...')}</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{t(l)}</option>)}
            </select>
          </Field>
        </div>
        <Field label={<>{t('Sector')}{req}</>}>
          <div className="radio-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {SECTORS.map(s => (
              <label key={s} style={checkLabel}>
                <input type="radio" name="sector" value={s} checked={form.sector === s} onChange={handleChange} required style={{ width: 16, height: 16 }} />
                {t(s)}
              </label>
            ))}
          </div>
        </Field>

        {/* ── Phones ── */}
        <h3 style={sectionTitle}>{t('Phone numbers')}</h3>
        {form.phones.map((p, i) => (
          <div key={i} className="lead-phone-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
            <div style={{ flex: 2, minWidth: 0 }}>
              <label style={labelStyle}>{i === 0 ? <>{t('Main phone')}{req}</> : t('Phone {n}', { n: i + 1 })}</label>
              <input type="tel" value={p.phone_number} onChange={e => setPhone(i, 'phone_number', e.target.value)}
                required={i === 0} maxLength={20} placeholder="050 123 45 67" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>{t('Whose number')}</label>
              <input list="lead-phone-owners" value={p.owner_label} onChange={e => setPhone(i, 'owner_label', e.target.value)}
                maxLength={50} placeholder={t('e.g. Father')} style={inputStyle} />
            </div>
            {i > 0 && (
              <button type="button" onClick={() => removePhone(i)} aria-label={t('Remove phone')} title={t('Remove phone')}
                style={{ ...secondaryBtn, color: '#dc2626', borderColor: '#fecaca', flex: 'none' }}>✕{isMobile && <> {t('Remove phone')}</>}</button>
            )}
          </div>
        ))}
        <datalist id="lead-phone-owners">
          {PHONE_OWNERS.map(o => <option key={o} value={t(o)} />)}
        </datalist>
        {form.phones.length < 10 && (
          <button type="button" onClick={addPhone} style={{ ...secondaryBtn, marginBottom: '0.5rem' }}>{t('+ Add phone number')}</button>
        )}

        {/* ── Family ── */}
        <h3 style={sectionTitle}>{t('Family')}</h3>
        <div className="form-grid" style={grid}>
          <Field label={t('Father Name')}>
            <input name="father_name" value={form.father_name} onChange={handleChange} maxLength={100} style={inputStyle} />
          </Field>
          <Field label={t('Mother / parent in charge')}>
            <input name="parent_name" value={form.parent_name} onChange={handleChange} maxLength={150} style={inputStyle} />
          </Field>
          <Field label={t('Relation')}>
            <input name="parent_relation" list="lead-parent-relations" value={form.parent_relation} onChange={handleChange}
              maxLength={50} placeholder={t('e.g. Mother')} style={inputStyle} />
            <datalist id="lead-parent-relations">
              {PARENT_RELATIONS.map(r => <option key={r} value={t(r)} />)}
            </datalist>
          </Field>
          <Field label={t('How they earn money')}>
            <input name="income_source" value={form.income_source} onChange={handleChange} maxLength={2000} style={inputStyle} />
          </Field>
        </div>

        {/* ── HƏDƏF ── */}
        <Field label={t('Knows someone studying in HƏDƏF?')}>
          <div className="radio-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {[[false, 'No'], [true, 'Yes']].map(([val, label]) => (
              <label key={label} style={checkLabel}>
                <input type="radio" name="knows_hedef_student" checked={form.knows_hedef_student === val}
                  onChange={() => set('knows_hedef_student', val)} style={{ width: 16, height: 16 }} />
                {t(label)}
              </label>
            ))}
          </div>
        </Field>
        {form.knows_hedef_student && (
          <Field label={<>{t('Name of the HƏDƏF student')}{req}</>}>
            <input name="hedef_student_name" value={form.hedef_student_name} onChange={handleChange} required maxLength={150} style={inputStyle} />
          </Field>
        )}

        {/* ── Extra information ── */}
        <h3 style={sectionTitle}>{t('Extra information')}</h3>
        <div className="form-grid" style={{ ...grid, gap: '0.25rem 1rem', marginBottom: '0.75rem' }}>
          {EXTRA_INFO.map(o => (
            <label key={o.value} className="lead-check" style={checkLabel}>
              <input type="checkbox" checked={form.extra_info.includes(o.value)} onChange={() => toggleExtra(o.value)} style={{ width: 16, height: 16, flex: 'none' }} />
              {t(o.label)}
            </label>
          ))}
        </div>
        {form.extra_info.includes('another_student_at_home') && (
          <Field label={t('Class of the other student')}>
            <select name="another_student_class" value={form.another_student_class} onChange={handleChange} style={inputStyle}>
              <option value="">{t('Select class...')}</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        )}
        <Field label={t('Other information')}>
          <textarea name="extra_info_other" value={form.extra_info_other} onChange={handleChange} rows={3} maxLength={2000}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>

        <button type="submit" disabled={saving} className="btn-block"
          style={{ width: '100%', padding: '0.6rem', background: '#c2410c', color: '#fff', border: 'none', borderRadius: 4, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: '0.5rem' }}>
          {saving ? t('Saving...') : (isEdit ? t('Save changes') : t('Add Lead'))}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem', minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const card = { background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e2e8f0' };
const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' };
const sectionTitle = { fontSize: '0.95rem', color: '#7c2d12', margin: '0.5rem 0 0.75rem', paddingBottom: '0.35rem', borderBottom: '1px solid #fed7aa' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem', color: '#374151' };
const checkLabel = { display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#374151', padding: '0.25rem 0' };
const secondaryBtn = { background: '#fff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 4, padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem' };
const linkStyle = { color: '#c2410c', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 };
const errorBox = { background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' };
