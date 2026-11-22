import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitch from '../../components/shared/LanguageSwitch';
import { listPublicExams, submitExamApplication } from '../../api/public.api';
import { nameInputValue } from '../../utils/nameCase';
import useIsMobile from '../../hooks/useIsMobile';

// Public landing page at "/" (LV#81): blue hero with an animated illustration, the exam schedule
// (scrollable cards) next to testimonials, and the registration form.
// Same options as the reception Add Student form.
const PREFIXES = ['010', '050', '051', '055', '070', '077', '099'];
const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
const SECTORS = [{ value: 'Azerbaijan', label: 'Az' }, { value: 'Rus', label: 'Rus' }];
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
const ROLE_HOME = { admin: '/admin', security: '/security', reception: '/reception', partner: '/partner', telesales: '/telesales' };
const emptyForm = { exam_id: '', first_name: '', last_name: '', father_name: '', class_level: '', sector: '', language: '', mobile_prefix: '050', mobile_number: '' };

const SECTIONS = [
  { id: 'about', label: 'Hədəf Balakən Exams' },
  { id: 'schedule', label: 'Exam Schedule' },
  { id: 'register', label: 'Registration' },
];

const FEATURES = [
  { icon: 'check', label: 'Real exam conditions' },
  { icon: 'users', label: 'Classes 1–11' },
  { icon: 'book', label: 'Az and Rus sections' },
  { icon: 'edit', label: 'Online registration' },
];

// PLACEHOLDER testimonials — replace with real quotes from past students.
const TESTIMONIALS = [
  { text: 'The exam felt just like the real one. I knew exactly what to expect on the big day.', author: 'Aysel M.', meta: 'Class 9' },
  { text: 'Registration took two minutes and they confirmed my place on WhatsApp the same day.', author: 'Murad H.', meta: 'Class 11' },
  { text: 'Seeing my results after each exam showed me which topics I still had to work on.', author: 'Leyla Q.', meta: 'Class 7' },
];

// Floating bubbles around the hero ring: position in % of the art box, animation delay.
const BUBBLES = [
  { icon: 'calendar', top: '4%', left: '18%', size: 54, delay: '0s', bg: 'linear-gradient(135deg,#38bdf8,#2563eb)' },
  { icon: 'edit', top: '10%', left: '76%', size: 62, delay: '1.2s', bg: 'linear-gradient(135deg,#22d3ee,#0ea5e9)' },
  { icon: 'clock', top: '44%', left: '-2%', size: 48, delay: '0.6s', bg: 'linear-gradient(135deg,#818cf8,#4f46e5)' },
  { icon: 'award', top: '48%', left: '88%', size: 52, delay: '1.8s', bg: 'linear-gradient(135deg,#60a5fa,#1d4ed8)' },
  { icon: 'book', top: '80%', left: '10%', size: 60, delay: '2.4s', bg: 'linear-gradient(135deg,#3b82f6,#1e40af)' },
  { icon: 'message', top: '82%', left: '70%', size: 50, delay: '0.9s', bg: 'linear-gradient(135deg,#2dd4bf,#0891b2)' },
];

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
const fmtDate = v => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = v => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Adds "lx-in" to every .lx-reveal element once it scrolls into view (scroll-reveal animation).
function useScrollReveal(rootRef, deps) {
  useEffect(() => {
    const els = rootRef.current ? Array.from(rootRef.current.querySelectorAll('.lx-reveal:not(.lx-in)')) : [];
    if (!('IntersectionObserver' in window) || reducedMotion()) {
      els.forEach(el => el.classList.add('lx-in'));
      return undefined;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('lx-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// Id of the section currently under the sticky header, so its menu item can be highlighted.
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      const header = document.querySelector('.landing-header');
      const line = (header ? header.getBoundingClientRect().height : 80) + 24;
      let current = ids[0];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}

export default function LandingPage() {
  const { user } = useAuth();
  const { t, tError, preferLang } = useLanguage();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [preset, setPreset] = useState(null);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile drawer: closes on Escape and when the viewport grows back to desktop
  useEffect(() => { if (!isMobile) setMenuOpen(false); }, [isMobile]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => { preferLang('az'); }, [preferLang]);

  useEffect(() => {
    listPublicExams()
      .then(res => setExams(res.data.data))
      .catch(err => setExamsError(tError(err, 'Failed to load exams')))
      .finally(() => setExamsLoading(false));
  }, []);

  useScrollReveal(rootRef, [examsLoading]);
  const activeSection = useActiveSection(SECTIONS.map(s => s.id));

  const goLogin = () => navigate(user && ROLE_HOME[user.role] ? ROLE_HOME[user.role] : '/login');
  const applyFor = id => { setPreset({ id: String(id), at: Date.now() }); scrollTo('register'); };

  return (
    <div ref={rootRef} className="landing-root" style={{ minHeight: '100vh', background: '#eef4ff', color: '#0f172a', fontFamily: FONT, fontSize: '1.0625rem' }}>
      <style>{LANDING_CSS}</style>

      <header className="landing-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(23,37,84,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', padding: '1.1rem 2rem', minHeight: 84 }}>
        {isMobile && (
          <button type="button" className="landing-menu-toggle" onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? t('Close menu') : t('Open menu')} aria-expanded={menuOpen} aria-controls="landing-drawer"
            style={menuToggleBtn}>{menuOpen ? '✕' : '☰'}</button>
        )}
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="landing-brand"
          aria-label={isMobile ? 'LIVEX-H.B.' : 'LIVEX.HƏDƏF-BALAKƏN.'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontWeight: 800, fontSize: '1.45rem', color: '#fff', letterSpacing: '0.03em', textAlign: 'left' }}>
          {/* Hədəf Kursları Balakən logo (same file as the student ticket) on a white tile so it reads on the dark header;
              background-size 125% trims the image's outer white margin */}
          <span aria-hidden="true" className="landing-brand-logo" style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 12, background: '#fff url(/logo.png) center / 125% no-repeat', boxShadow: '0 0 16px rgba(34,211,238,0.45)' }} />
          <span className="landing-brand-text" style={{ minWidth: 0 }}>
            {/* Mobile shows the short brand so it fits on one line next to the menu button */}
            LIVEX<span style={{ color: '#22d3ee' }}>{isMobile ? '-H.B.' : '.HƏDƏF-BALAKƏN.'}</span>
          </span>
        </button>
        {!isMobile && (
          <nav className="landing-nav" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {SECTIONS.map(s => {
              const isActive = activeSection === s.id;
              return (
                <button key={s.id} type="button" onClick={() => scrollTo(s.id)}
                  className={`lx-nav-link${isActive ? ' lx-nav-active' : ''}`}
                  aria-current={isActive ? 'true' : undefined} style={navBtn}>{t(s.label)}</button>
              );
            })}
          </nav>
        )}
        <div className="landing-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!isMobile && <LanguageSwitch tone="dark" />}
          <button type="button" onClick={goLogin} className="lx-login" style={loginBtn}>{user ? t('My panel') : t('Login')}</button>
        </div>
      </header>

      {/* Mobile only: section links in a drawer that slides in from the left (opened by the hamburger) */}
      {isMobile && menuOpen && (
        <>
          <div className="landing-drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(2,6,23,0.55)' }} />
          <nav id="landing-drawer" className="landing-drawer" aria-label={t('Menu')}
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 120, width: 'min(300px, 85vw)', overflowY: 'auto', background: '#172554', boxShadow: '8px 0 32px rgba(2,6,23,0.45)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label={t('Close menu')}
              style={{ ...menuToggleBtn, alignSelf: 'flex-start', marginBottom: 6 }}>✕</button>
            {SECTIONS.map(s => {
              const isActive = activeSection === s.id;
              return (
                <button key={s.id} type="button" onClick={() => { setMenuOpen(false); scrollTo(s.id); }}
                  className={`lx-nav-link${isActive ? ' lx-nav-active' : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  style={{ ...navBtn, width: '100%', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', borderRadius: 14, fontSize: '1.05rem', minHeight: 52 }}>{t(s.label)}</button>
              );
            })}
            {/* Mobile: the EN | AZ switch lives in the drawer instead of the header */}
            <div className="landing-drawer-lang" style={{ marginTop: 10, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>{t('Language')}</div>
              <LanguageSwitch tone="dark" fullWidth style={{ borderRadius: 12 }} />
            </div>
          </nav>
        </>
      )}

      {/* 1. Hədəf Kursları Sınaqları — hero with the Register to Exam button below the description */}
      <section id="about" className="landing-hero" style={{ position: 'relative', overflow: 'hidden', minHeight: '78vh', padding: '4rem 2rem 8rem', background: 'linear-gradient(135deg, #172554 0%, #1e40af 55%, #2563eb 100%)', color: '#fff', scrollMarginTop: 84 }}>
        <span aria-hidden="true" className="lx-blob" style={{ ...blob, width: 420, height: 420, top: -140, left: -120, background: 'radial-gradient(circle, rgba(34,211,238,0.45), transparent 65%)' }} />
        <span aria-hidden="true" className="lx-blob" style={{ ...blob, width: 520, height: 520, bottom: -220, right: -160, background: 'radial-gradient(circle, rgba(129,140,248,0.45), transparent 65%)', animationDelay: '-6s' }} />

        <div className="landing-hero-grid" style={{ position: 'relative', maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '3rem', alignItems: 'center' }}>
          <div className="lx-reveal">
            {exams.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.9rem', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                <span className="lx-live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee' }} />
                {t('{n} upcoming exams', { n: exams.length })}
              </span>
            )}
            <h1 style={{ margin: '0 0 1.25rem', fontSize: '3.6rem', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {t('Hədəf Balakən Exams')}
            </h1>
            <p style={{ margin: '0 0 2rem', maxWidth: 560, fontSize: '1.3rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>
              {t('Hədəf Balakən exams let students test their knowledge in real exam conditions. Check the schedule and register in a few minutes.')}
            </p>
            <button type="button" onClick={() => scrollTo('register')} className="landing-cta lx-cta"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', background: 'linear-gradient(135deg,#22d3ee,#06b6d4)', color: '#082f49', border: 'none', borderRadius: 999, padding: '1rem 2.25rem', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer' }}>
              {t('Register to Exam')}
              <span aria-hidden="true" style={{ fontSize: '1.2rem', lineHeight: 1 }}>→</span>
            </button>
            <ul className="landing-features" style={{ listStyle: 'none', padding: 0, margin: '2.5rem 0 0', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', maxWidth: 680 }}>
              {FEATURES.map(f => (
                <li key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                  <span aria-hidden="true" style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                    <Icon name={f.icon} size={16} color="#67e8f9" />
                  </span>
                  {t(f.label)}
                </li>
              ))}
            </ul>
          </div>

          <HeroArt />
        </div>

        <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -1, width: '100%', height: 110, display: 'block' }}>
          <path d="M0,64 C240,128 480,0 720,32 C960,64 1200,128 1440,72 L1440,120 L0,120 Z" fill="#eef4ff" />
        </svg>
      </section>

      {/* 2. Sınaq Cədvəli (scrollable exam cards) + testimonials */}
      <div className="landing-lower-grid" style={{ maxWidth: 1160, margin: '0 auto', padding: '3rem 2rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
        <section id="schedule" className="lx-reveal landing-schedule"style={{ minWidth: 0, scrollMarginTop: 100 }}>
          <h2 style={h2Style}>{t('Exam Schedule')}</h2>
          <p style={subStyle}>{t('Upcoming exams you can register for.')}</p>
          {examsLoading ? (
            <p style={{ color: '#64748b' }}>{t('Loading exams...')}</p>
          ) : examsError ? (
            <p style={{ color: '#dc2626' }}>{examsError}</p>
          ) : exams.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 18, padding: '2rem', color: '#64748b', textAlign: 'center', boxShadow: '0 10px 30px rgba(30,64,175,0.08)' }}>
              {t('No upcoming exams at the moment.')}
            </div>
          ) : (
            <div className="lx-scroll" tabIndex={0} aria-label={t('Exam Schedule')}
              style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0.5rem 0.25rem 1.25rem', WebkitOverflowScrolling: 'touch' }}>
              {exams.map(e => <ExamCard key={e.id} exam={e} onApply={() => applyFor(e.id)} />)}
            </div>
          )}
        </section>

        <Testimonials />
      </div>

      {/* 3. Qeydiyyat */}
      <section id="register" className="landing-section" style={{ position: 'relative', padding: '3rem 2rem 4rem', scrollMarginTop: 84 }}>
        <div className="lx-reveal" style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>{t('Registration')}</h2>
          <RegistrationForm exams={exams} preset={preset} />
        </div>
      </section>

      <footer style={{ background: '#172554', color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '1.5rem 1rem', fontSize: '0.95rem' }}>
        {t('© {year} LIVEX. All rights reserved.', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}

function HeroArt() {
  return (
    <div aria-hidden="true" className="landing-art lx-reveal" style={{ position: 'relative', width: 440, height: 440, maxWidth: '100%', justifySelf: 'center' }}>
      <span className="lx-spin" style={{ position: 'absolute', inset: '2%', borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.3)' }} />
      <span className="lx-glow" style={{ position: 'absolute', inset: '13%', borderRadius: '50%', border: '4px solid rgba(103,232,249,0.95)', boxShadow: '0 0 45px rgba(34,211,238,0.65), inset 0 0 45px rgba(34,211,238,0.35)' }} />
      <span style={{ position: 'absolute', inset: '19%', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #60a5fa 0%, #2563eb 45%, #1e3a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 120 140" className="lx-float" style={{ width: '46%', height: 'auto', filter: 'drop-shadow(0 12px 20px rgba(15,23,42,0.35))' }}>
          <rect x="18" y="14" width="84" height="112" rx="10" fill="#fff" />
          <rect x="44" y="6" width="32" height="16" rx="6" fill="#22d3ee" />
          <rect x="32" y="34" width="56" height="7" rx="3.5" fill="#93c5fd" />
          <circle cx="36" cy="58" r="5" fill="#22d3ee" /><rect x="46" y="55" width="40" height="6" rx="3" fill="#dbeafe" />
          <circle cx="36" cy="76" r="5" fill="#22d3ee" /><rect x="46" y="73" width="34" height="6" rx="3" fill="#dbeafe" />
          <circle cx="36" cy="94" r="5" fill="none" stroke="#93c5fd" strokeWidth="2" /><rect x="46" y="91" width="38" height="6" rx="3" fill="#dbeafe" />
          <circle cx="98" cy="114" r="17" fill="#22c55e" />
          <polyline points="90 114 96 120 106 108" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {BUBBLES.map((b, i) => (
        <span key={i} className="lx-float lx-bubble" style={{ position: 'absolute', top: b.top, left: b.left, width: b.size, height: b.size, borderRadius: '50%', background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.35)', animationDelay: b.delay }}>
          <Icon name={b.icon} size={Math.round(b.size * 0.42)} color="#fff" />
        </span>
      ))}
    </div>
  );
}

function ExamCard({ exam, onApply }) {
  const { t, lang } = useLanguage();
  const d = new Date(exam.scheduled_at);
  const month = d.toLocaleDateString(lang === 'az' ? 'az-Latn-AZ' : 'en-GB', { month: 'short' });
  return (
    <article className="lx-card landing-exam-card" style={{ flex: 'none', width: 280, scrollSnapAlign: 'start', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 30px rgba(30,64,175,0.1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 96, background: 'linear-gradient(135deg,#1e40af,#2563eb 60%,#22d3ee)', padding: '1rem', color: '#fff' }}>
        <span aria-hidden="true" style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: '#fff', color: '#1e40af', borderRadius: 12, padding: '0.35rem 0.7rem', lineHeight: 1.1, boxShadow: '0 6px 14px rgba(15,23,42,0.2)' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{String(d.getDate()).padStart(2, '0')}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>{month}</span>
        </div>
      </div>
      <div style={{ padding: '1rem 1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
        <h3 className="wrap-text" style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.3, color: '#0f172a' }}>{exam.title}</h3>
        {exam.exam_type_name && <span className="wrap-text" style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: 600 }}>{exam.exam_type_name}</span>}
        <span style={metaRow}><Icon name="clock" size={15} color="#64748b" /> {fmtTime(exam.scheduled_at)} · {exam.duration_mins} {t('min')}</span>
        <span className="wrap-text" style={metaRow}><Icon name="pin" size={15} color="#64748b" /> {exam.exam_location === 'General' ? t('General') : exam.exam_location}</span>
        <div style={{ marginTop: 'auto', paddingTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <strong style={{ fontSize: '1.15rem', color: '#0f172a', whiteSpace: 'nowrap' }}>{Number(exam.exam_cost)} AZN</strong>
          <button type="button" onClick={onApply} className="lx-apply"
            style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 999, padding: '0.5rem 1.1rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
            {t('Apply')}
          </button>
        </div>
      </div>
    </article>
  );
}

function Testimonials() {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || reducedMotion()) return undefined;
    const id = setInterval(() => setIdx(i => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, [paused]);

  const item = TESTIMONIALS[idx];
  return (
    <section aria-label={t('Testimonials')} className="lx-reveal landing-testimonials"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      style={{ position: 'relative', overflow: 'hidden', minWidth: 0, background: 'linear-gradient(150deg,#1e3a8a,#1d4ed8)', color: '#fff', borderRadius: 24, padding: '2rem', boxShadow: '0 20px 40px rgba(30,64,175,0.25)' }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.55), transparent 70%)' }} />
      <h2 style={{ position: 'relative', margin: '0 0 0.25rem', fontSize: '1.75rem' }}>{t('Testimonials')}</h2>
      <p style={{ position: 'relative', margin: '0 0 1.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem' }}>{t('What our students say')}</p>
      <figure key={idx} className="lx-fade" style={{ position: 'relative', margin: 0, minHeight: 150 }}>
        <span aria-hidden="true" style={{ display: 'block', fontSize: '3.5rem', lineHeight: 0.8, color: '#67e8f9', fontFamily: 'Georgia, serif' }}>“</span>
        <blockquote style={{ margin: '0.25rem 0 1rem', fontSize: '1.15rem', lineHeight: 1.6 }}>{t(item.text)}</blockquote>
        <figcaption style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#22d3ee,#6366f1)', fontWeight: 700 }}>{item.author[0]}</span>
          <span><strong style={{ display: 'block' }}>{item.author}</strong><span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>{t(item.meta)}</span></span>
        </figcaption>
      </figure>
      <div style={{ position: 'relative', display: 'flex', gap: '0.25rem', marginTop: '1.25rem' }}>
        {TESTIMONIALS.map((_, i) => (
          <button key={i} type="button" onClick={() => setIdx(i)} className="lx-dot" aria-label={t('Show testimonial {n}', { n: i + 1 })} aria-pressed={i === idx}
            style={{ background: 'none', border: 'none', padding: '0.4rem 0.2rem', cursor: 'pointer' }}>
            <span style={{ display: 'block', height: 8, width: i === idx ? 28 : 8, borderRadius: 999, background: i === idx ? '#22d3ee' : 'rgba(255,255,255,0.4)', transition: 'width .3s ease' }} />
          </button>
        ))}
      </div>
    </section>
  );
}

function RegistrationForm({ exams, preset }) {
  const { t, tError } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // "Apply" on an exam card preselects that exam.
  useEffect(() => {
    if (preset) setForm(f => ({ ...f, exam_id: preset.id }));
  }, [preset]);

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
    <form onSubmit={handleSubmit} className="landing-form" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '2.25rem', boxShadow: '0 24px 60px rgba(30,64,175,0.14)' }}>
      {success && (
        <div role="status" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: 10, marginBottom: '1rem' }}>
          {t('Thank you! Your application has been received. We will contact you soon.')}
        </div>
      )}
      {error && <div role="alert" style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 10, marginBottom: '1rem' }}>{error}</div>}

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="app-exam">{t('Select Exam')}<Req /></label>
        <select id="app-exam" name="exam_id" value={form.exam_id} onChange={handleChange} required className="lx-input" style={inputStyle}>
          <option value="">{t('Select exam...')}</option>
          {exams.map(e => <option key={e.id} value={String(e.id)}>{e.title} — {fmtDate(e.scheduled_at)} {fmtTime(e.scheduled_at)}</option>)}
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
              required maxLength={50} autoComplete="off" className="lx-input" style={inputStyle} />
          </div>
        ))}
      </div>

      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle} htmlFor="app-class">{t('Class')}<Req /></label>
          <select id="app-class" name="class_level" value={form.class_level} onChange={handleChange} required className="lx-input" style={inputStyle}>
            <option value="">{t('Select class...')}</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="app-language">{t('Foreign Language')}<Req /></label>
          <select id="app-language" name="language" value={form.language} onChange={handleChange} required className="lx-input" style={inputStyle}>
            <option value="">{t('Select language...')}</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{t(l)}</option>)}
          </select>
        </div>
      </div>

      <fieldset style={{ ...fieldStyle, border: 'none', padding: 0, margin: '0 0 1rem' }}>
        <legend style={labelStyle}>{t('Section')}<Req /></legend>
        <div className="radio-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {SECTORS.map(s => {
            const on = form.sector === s.value;
            return (
              <label key={s.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1.05rem', fontWeight: 600, padding: '0.5rem 1.1rem', borderRadius: 999, border: `1.5px solid ${on ? '#2563eb' : '#cbd5e1'}`, background: on ? '#eff6ff' : '#fff', color: on ? '#1e40af' : '#334155', transition: 'all .2s ease' }}>
                <input type="radio" name="sector" value={s.value} checked={on} onChange={handleChange} required style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
                {s.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div style={{ ...fieldStyle, marginBottom: '1.75rem' }}>
        <label style={labelStyle} htmlFor="app-mobile">{t('Mobile number (with active WhatsApp)')}<Req /></label>
        <div className="landing-mobile-row" style={{ display: 'flex', gap: '0.5rem' }}>
          <select name="mobile_prefix" value={form.mobile_prefix} onChange={handleChange} aria-label={t('Mobile Number')}
            className="landing-mobile-prefix lx-input" style={{ ...inputStyle, width: 96, flex: 'none' }}>
            {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input id="app-mobile" type="tel" inputMode="numeric" name="mobile_number" value={form.mobile_number} onChange={handleChange}
            placeholder="XXXXXXX" required maxLength={7} pattern="\d{7}" title={t('Enter 7 digits after the prefix')}
            className="lx-input" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button type="submit" disabled={saving} className="landing-submit lx-submit"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb 50%,#06b6d4)', color: '#fff', border: 'none', borderRadius: 999, padding: '0.9rem 3rem', fontSize: '1.15rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 10px 24px rgba(37,99,235,0.35)' }}>
          {saving ? t('Registering...') : t('Register now')}
        </button>
      </div>
    </form>
  );
}

const FONT = "'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const Req = () => <span style={{ color: '#dc2626' }}> *</span>;

// Stroke icons (24×24 grid).
const ICONS = {
  check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  award: <><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  message: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
};

function Icon({ name, size = 20, color = 'currentColor' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      {ICONS[name]}
    </svg>
  );
}

// Animations for this page only (CSS keyframes can't be inline styles). Mobile rules live in responsive.css.
const LANDING_CSS = `
.landing-root button, .landing-root input, .landing-root select, .landing-root textarea { font-family: inherit; }
@keyframes lx-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes lx-spin { to { transform: rotate(360deg); } }
@keyframes lx-glow { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }
@keyframes lx-blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(40px, -30px) scale(1.08); } 66% { transform: translate(-30px, 25px) scale(.94); } }
@keyframes lx-pulse { 0% { box-shadow: 0 0 0 0 rgba(34,211,238,.6), 0 10px 30px rgba(34,211,238,.35); } 70% { box-shadow: 0 0 0 18px rgba(34,211,238,0), 0 10px 30px rgba(34,211,238,.35); } 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0), 0 10px 30px rgba(34,211,238,.35); } }
@keyframes lx-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.lx-float { animation: lx-float 5s ease-in-out infinite; }
.lx-spin { animation: lx-spin 60s linear infinite; }
.lx-glow { animation: lx-glow 3s ease-in-out infinite; }
.lx-blob { animation: lx-blob 18s ease-in-out infinite; }
.lx-live-dot { animation: lx-glow 1.4s ease-in-out infinite; box-shadow: 0 0 10px #22d3ee; }
.lx-fade { animation: lx-fade .5s ease both; }
.lx-cta { animation: lx-pulse 2.6s ease-out infinite; transition: transform .2s ease, filter .2s ease; }
.lx-cta:hover { transform: translateY(-2px); filter: brightness(1.08); }
.lx-login { transition: background .2s ease, color .2s ease; }
.lx-login:hover { background: #fff !important; color: #1e3a8a !important; }
.lx-nav-link { transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease; }
.lx-nav-link:hover { background: rgba(255,255,255,0.2) !important; border-color: rgba(255,255,255,0.45) !important; transform: translateY(-1px); }
.lx-nav-link:focus-visible { outline: 3px solid #22d3ee; outline-offset: 2px; }
.lx-nav-link.lx-nav-active { background: linear-gradient(135deg,#22d3ee,#2563eb) !important; border-color: transparent !important; box-shadow: 0 0 18px rgba(34,211,238,0.45); }
.lx-card { transition: transform .3s ease, box-shadow .3s ease; }
.lx-card:hover { transform: translateY(-6px); box-shadow: 0 22px 40px rgba(30,64,175,.2) !important; }
.lx-apply, .lx-submit { transition: transform .2s ease, filter .2s ease; }
.lx-apply:hover, .lx-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.12); }
.lx-input { transition: border-color .2s ease, box-shadow .2s ease; }
.lx-input:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 4px rgba(37,99,235,.15); }
.lx-reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s ease, transform .8s ease; }
.lx-reveal.lx-in { opacity: 1; transform: none; }
.lx-scroll { scrollbar-width: thin; scrollbar-color: #93c5fd transparent; }
.lx-scroll::-webkit-scrollbar { height: 8px; }
.lx-scroll::-webkit-scrollbar-thumb { background: #93c5fd; border-radius: 999px; }
@media (prefers-reduced-motion: reduce) {
  .lx-float, .lx-spin, .lx-glow, .lx-blob, .lx-live-dot, .lx-cta, .lx-fade, .landing-drawer { animation: none !important; }
  .lx-reveal { opacity: 1; transform: none; transition: none; }
  .lx-card, .lx-cta, .lx-apply, .lx-submit, .lx-nav-link { transition: none; }
  .lx-nav-link:hover { transform: none; }
  .lx-card:hover { transform: none; }
}
`;

const blob = { position: 'absolute', borderRadius: '50%', filter: 'blur(10px)', pointerEvents: 'none' };
const navBtn = { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 999, padding: '0.7rem 1.4rem', minHeight: 48, cursor: 'pointer', fontSize: '1.2rem', color: '#fff', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' };
const menuToggleBtn = { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: 10, width: 44, height: 44, flexShrink: 0, fontSize: '1.35rem', lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit' };
const loginBtn = { background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: 999, padding: '0.7rem 1.6rem', minHeight: 48, fontSize: '1.15rem', fontWeight: 700, cursor: 'pointer' };
const h2Style = { margin: '0 0 0.4rem', fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' };
const subStyle = { margin: '0 0 1.5rem', color: '#64748b', fontSize: '1.1rem' };
const metaRow = { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', color: '#475569' };
const fieldStyle = { marginBottom: '1rem' };
const inputStyle = { width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: '1.05rem', boxSizing: 'border-box', background: '#fff' };
const labelStyle = { display: 'block', fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem', color: '#334155' };
