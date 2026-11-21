import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitch from '../../components/shared/LanguageSwitch';
import { listPublicExams, submitExamApplication } from '../../api/public.api';
import { nameInputValue } from '../../utils/nameCase';

// Public landing page at "/" (LV#81): intro, exam schedule and the registration form.
// Same options as the reception Add Student form.
const PREFIXES = ['010', '050', '051', '055', '070', '077', '099'];
const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const SECTORS = [{ value: 'Azerbaijan', label: 'Az' }, { value: 'Rus', label: 'Rus' }];
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const ROLE_HOME = { admin: '/admin', security: '/security', reception: '/reception', partner: '/partner', telesales: '/telesales' };
const emptyForm = { exam_id: '', first_name: '', last_name: '', father_name: '', class_level: '', sector: '', language: '', mobile_prefix: '050', mobile_number: '' };

const SECTIONS = [
  { id: 'about', label: 'Hədəf Kursları Exams' },
  { id: 'schedule', label: 'Exam Schedule' },
  { id: 'register', label: 'Registration' },
];

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
const fmtDate = v => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = v => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function LandingPage() {
  const { user } = useAuth();
  const { t, tError, preferLang } = useLanguage();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');

  useEffect(() => { preferLang('az'); }, [preferLang]);

  useEffect(() => {
    listPublicExams()
      .then(res => setExams(res.data.data))
      .catch(err => setExamsError(tError(err, 'Failed to load exams')))
      .finally(() => setExamsLoading(false));
  }, []);

  const goLogin = () => navigate(user && ROLE_HOME[user.role] ? ROLE_HOME[user.role] : '/login');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      <header className="landing-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', padding: '0.75rem 2rem' }}>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 800, fontSize: '1.25rem', color: '#2563eb', letterSpacing: '0.04em' }}>
          LIVEX
        </button>
        <nav className="landing-nav" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => scrollTo(s.id)} style={navBtn}>{t(s.label)}</button>
          ))}
        </nav>
        <div className="landing-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <LanguageSwitch tone="light" />
          <button type="button" onClick={goLogin} style={loginBtn}>{user ? t('My panel') : t('Login')}</button>
        </div>
      </header>

      {/* 1. Hədəf Kursları Sınaqları — first visible part with the Register to Exam button */}
      <section id="about" className="landing-hero" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)' }}>
        <h1 style={{ margin: '0 0 1rem', fontSize: '2.5rem', lineHeight: 1.2 }}>{t('Hədəf Kursları Exams')}</h1>
        <p style={{ margin: '0 0 2rem', maxWidth: 640, fontSize: '1.1rem', color: '#475569', lineHeight: 1.6 }}>
          {t('Hədəf Kursları exams let students test their knowledge in real exam conditions. Check the schedule and register in a few minutes.')}
        </p>
        <button type="button" onClick={() => scrollTo('register')} className="landing-cta"
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.9rem 2.25rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
          {t('Register to Exam')}
        </button>
      </section>

      {/* 2. Sınaq Cədvəli */}
      <section id="schedule" className="landing-section" style={sectionStyle}>
        <h2 style={h2Style}>{t('Exam Schedule')}</h2>
        <p style={subStyle}>{t('Upcoming exams you can register for.')}</p>
        {examsLoading ? (
          <p style={{ color: '#94a3b8' }}>{t('Loading exams...')}</p>
        ) : examsError ? (
          <p style={{ color: '#dc2626' }}>{examsError}</p>
        ) : exams.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>{t('No upcoming exams at the moment.')}</p>
        ) : (
          <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={th}>{t('Exam')}</th>
                  <th style={th}>{t('Date')}</th>
                  <th style={th}>{t('Time')}</th>
                  <th style={th} className="hide-mobile">{t('Duration')}</th>
                  <th style={th}>{t('Location')}</th>
                  <th style={th}>{t('Cost')}</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(e => (
                  <tr key={e.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={td} className="wrap-text">
                      <strong>{e.title}</strong>
                      {e.exam_type_name && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{e.exam_type_name}</div>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(e.scheduled_at)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtTime(e.scheduled_at)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }} className="hide-mobile">{e.duration_mins} {t('min')}</td>
                    <td style={td} className="wrap-text">{e.exam_location === 'General' ? t('General') : e.exam_location}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{Number(e.exam_cost)} AZN</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Qeydiyyat */}
      <section id="register" className="landing-section" style={sectionStyle}>
        <h2 style={h2Style}>{t('Registration')}</h2>
        <p style={subStyle}>{t('Fill in the form and we will contact you on WhatsApp.')}</p>
        <RegistrationForm exams={exams} />
      </section>
    </div>
  );
}

function RegistrationForm({ exams }) {
  const { t, tError } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = e => {
    const { name } = e.target;
    const value = name === 'mobile_number' ? e.target.value.replace(/\D/g, '').slice(0, 7) : nameInputValue(e.target);
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (!/^\d{7}$/.test(form.mobile_number)) { setError(t('Enter 7 digits after the prefix')); return; }
    setSaving(true);
    try {
      await submitExamApplication({
        exam_id: form.exam_id,
        first_name: form.first_name,
        last_name: form.last_name,
        father_name: form.father_name,
        class_level: Number(form.class_level),
        sector: form.sector,
        language: form.language,
        mobile_number: `${form.mobile_prefix}${form.mobile_number}`,
      });
      setSuccess(true);
      setForm(emptyForm);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setError(code === 'VALIDATION_ERROR' ? t('Please check the form fields.') : tError(err, 'Failed to send the application'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="landing-form" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      {success && (
        <div role="status" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
          {t('Thank you! Your application has been received. We will contact you soon.')}
        </div>
      )}
      {error && <div role="alert" style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>{error}</div>}

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="app-exam">{t('Select Exam')}<Req /></label>
        <select id="app-exam" name="exam_id" value={form.exam_id} onChange={handleChange} required style={inputStyle}>
          <option value="">{t('Select exam...')}</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.title} — {fmtDate(e.scheduled_at)} {fmtTime(e.scheduled_at)}</option>)}
        </select>
      </div>

      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { name: 'first_name', label: 'Name' },
          { name: 'last_name', label: 'Surname' },
          { name: 'father_name', label: 'Father Name' },
        ].map(f => (
          <div key={f.name}>
            <label style={labelStyle} htmlFor={`app-${f.name}`}>{t(f.label)}<Req /></label>
            <input id={`app-${f.name}`} type="text" name={f.name} value={form[f.name]} onChange={handleChange}
              required maxLength={50} autoComplete="off" style={inputStyle} />
          </div>
        ))}
      </div>

      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle} htmlFor="app-class">{t('Class')}<Req /></label>
          <select id="app-class" name="class_level" value={form.class_level} onChange={handleChange} required style={inputStyle}>
            <option value="">{t('Select class...')}</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="app-language">{t('Foreign Language')}<Req /></label>
          <select id="app-language" name="language" value={form.language} onChange={handleChange} required style={inputStyle}>
            <option value="">{t('Select language...')}</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{t(l)}</option>)}
          </select>
        </div>
      </div>

      <fieldset style={{ ...fieldStyle, border: 'none', padding: 0, margin: '0 0 1rem' }}>
        <legend style={labelStyle}>{t('Section')}<Req /></legend>
        <div className="radio-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {SECTORS.map(s => (
            <label key={s.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}>
              <input type="radio" name="sector" value={s.value} checked={form.sector === s.value} onChange={handleChange} required style={{ width: 16, height: 16 }} />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div style={{ ...fieldStyle, marginBottom: '1.5rem' }}>
        <label style={labelStyle} htmlFor="app-mobile">{t('Mobile number (with active WhatsApp)')}<Req /></label>
        <div className="landing-mobile-row" style={{ display: 'flex', gap: '0.5rem' }}>
          <select name="mobile_prefix" value={form.mobile_prefix} onChange={handleChange} aria-label={t('Mobile Number')}
            className="landing-mobile-prefix" style={{ ...inputStyle, width: 96, flex: 'none' }}>
            {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input id="app-mobile" type="tel" inputMode="numeric" name="mobile_number" value={form.mobile_number} onChange={handleChange}
            placeholder="XXXXXXX" required maxLength={7} pattern="\d{7}" title={t('Enter 7 digits after the prefix')}
            style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button type="submit" disabled={saving} className="landing-submit"
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 2.5rem', fontSize: '1rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('Registering...') : t('Register now')}
        </button>
      </div>
    </form>
  );
}

const Req = () => <span style={{ color: '#dc2626' }}> *</span>;

const navBtn = { background: 'none', border: 'none', padding: '0.25rem 0', cursor: 'pointer', fontSize: '0.95rem', color: '#334155', fontWeight: 500 };
const loginBtn = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1.1rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' };
const sectionStyle = { maxWidth: 1000, margin: '0 auto', padding: '3rem 2rem', scrollMarginTop: 64 };
const h2Style = { margin: '0 0 0.5rem', fontSize: '1.75rem', textAlign: 'center' };
const subStyle = { margin: '0 0 1.5rem', color: '#64748b', textAlign: 'center' };
const th = { padding: '0.65rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'left' };
const td = { padding: '0.65rem 1rem', fontSize: '0.9rem', color: '#1e293b' };
const fieldStyle = { marginBottom: '1rem' };
const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box', background: '#fff' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };
