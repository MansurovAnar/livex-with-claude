import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AZ, SERVER_PATTERNS } from './translations';

// The choice is saved per browser: per user (so a partner and an admin sharing a
// browser keep their own language) plus the last one used (shown on the login page).
const LAST_KEY = 'livex.lang';
const userKey = id => `livex.lang.${id}`;
const isLang = v => v === 'en' || v === 'az';

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, v) => { try { localStorage.setItem(key, v); } catch { /* storage unavailable */ } };

// Partners default to Azerbaijani, every other role to English.
function initialLang(user) {
  if (user) {
    const saved = read(userKey(user.id));
    if (isLang(saved)) return saved;
    return user.role === 'partner' ? 'az' : 'en';
  }
  const last = read(LAST_KEY);
  return isLang(last) ? last : 'en';
}

const fill = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m)) : text;

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState(() => initialLang(user));

  // Re-evaluate when the logged-in user changes (login / logout / hydration)
  useEffect(() => { setLangState(initialLang(user)); }, [user?.id, user?.role]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((value) => {
    if (!isLang(value)) return;
    setLangState(value);
    write(LAST_KEY, value);
    if (user) write(userKey(user.id), value);
  }, [user?.id]);

  // t('English text', { var }) → Azerbaijani text when AZ is selected, else the English text
  const t = useCallback((en, vars) => {
    const text = lang === 'az' && AZ[en] !== undefined ? AZ[en] : en;
    return fill(text, vars);
  }, [lang]);

  // Translates a message that came from the API (unknown messages are shown as-is)
  const tServer = useCallback((msg, fallback) => {
    if (!msg) return fallback !== undefined ? t(fallback) : '';
    if (lang !== 'az') return msg;
    if (AZ[msg] !== undefined) return AZ[msg];
    for (const [re, az] of SERVER_PATTERNS) {
      const m = msg.match(re);
      if (m) return az.replace(/\{(t?)(\d)\}/g, (_, tr, i) => (m[i] === undefined ? '' : tr ? (AZ[m[i]] ?? m[i]) : m[i]));
    }
    return msg;
  }, [lang, t]);

  // Error message from an axios error, translated
  const tError = useCallback((err, fallback) => {
    const e = err?.response?.data?.error;
    return tServer(typeof e === 'string' ? e : e?.message, fallback);
  }, [tServer]);

  const value = useMemo(() => ({ lang, setLang, t, tServer, tError }), [lang, setLang, t, tServer, tError]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
