import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const OPTIONS = [
  { value: 'en', short: 'EN', label: 'English' },
  { value: 'az', short: 'AZ', label: 'Azərbaycanca' },
];

// EN / AZ toggle. tone="dark" for dark sidebars/headers, "light" for white backgrounds.
export default function LanguageSwitch({ tone = 'dark', fullWidth = false, style }) {
  const { lang, setLang, t } = useLanguage();
  const dark = tone === 'dark';
  const border = dark ? 'rgba(255,255,255,0.45)' : '#cbd5e1';

  return (
    <div role="group" aria-label={t('Language')} className="lang-switch"
      style={{ display: fullWidth ? 'flex' : 'inline-flex', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden', flex: 'none', ...style }}>
      {OPTIONS.map((o, i) => {
        const active = lang === o.value;
        return (
          <button key={o.value} type="button" onClick={() => setLang(o.value)}
            aria-pressed={active} title={o.label}
            style={{
              flex: fullWidth ? 1 : 'none',
              background: active ? (dark ? 'rgba(255,255,255,0.22)' : '#2563eb') : 'transparent',
              color: active ? '#fff' : (dark ? 'rgba(255,255,255,0.8)' : '#475569'),
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${border}` : 'none',
              padding: '0.25rem 0.6rem',
              fontSize: '0.8rem',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
            }}>
            {o.short}
          </button>
        );
      })}
    </div>
  );
}
