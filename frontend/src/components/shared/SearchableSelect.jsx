import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

// Case- and accent-insensitive match (also folds Azerbaijani letters: ə→e, ı→i, ş→s …)
const fold = (s) => String(s ?? '')
  .toLocaleLowerCase('az')
  .replace(/ə/g, 'e').replace(/ı/g, 'i')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Dropdown with a type-to-filter text box.
 *
 * options:  [{ value, label }]
 * value:    the selected option's value ('' / null = nothing selected)
 * onChange: (value, option) => void — called with ('', null) when cleared
 * onCreate: optional (text) => void — when set, typed text that matches no option
 *           can be chosen as a new entry ('+ Add "text"')
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder,
  noOptionsText,
  loading = false,
  disabled = false,
  required = false,
  name,
  id,
  style,
  onCreate,
}) {
  const { t } = useLanguage();
  const autoId = useId();
  const inputId = id || `ss-${autoId}`;
  const listId = `${inputId}-list`;
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => options.find(o => String(o.value) === String(value ?? '')) || null,
    [options, value]
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    const matches = q ? options.filter(o => fold(o.label).includes(q)) : options;
    // Offer the typed text as a new entry unless an option has exactly that label
    if (onCreate && q && !options.some(o => fold(o.label).trim() === q)) {
      return [...matches, { value: CREATE_VALUE, label: query.trim(), isNew: true }];
    }
    return matches;
  }, [options, query, onCreate]);

  // Close when clicking/tapping outside
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Keep the highlighted option visible while using the arrow keys
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setActive(Math.max(0, options.findIndex(o => o === selected)));
    setOpen(true);
  };

  const close = () => { setOpen(false); setQuery(''); };

  const choose = (opt) => {
    if (opt.isNew) onCreate(opt.label);
    else onChange?.(opt.value, opt);
    close();
  };

  const clear = () => {
    onChange?.('', null);
    close();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return openList();
      setActive(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open) {
        e.preventDefault();
        if (filtered[active]) choose(filtered[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); close(); }
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const inputValue = open ? query : (selected?.label ?? '');

  return (
    <div ref={rootRef} className="ss-root" style={{ position: 'relative', width: '100%', ...style }}>
      <input
        id={inputId}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        // Native "required" check: empty while nothing is selected
        required={required && !selected}
        value={inputValue}
        placeholder={open && selected ? selected.label : (placeholder ?? t('Search...'))}
        onFocus={openList}
        onClick={() => { if (!open) openList(); }}
        onChange={e => { setQuery(e.target.value); setActive(0); if (!open) setOpen(true); }}
        onKeyDown={handleKeyDown}
        style={{ ...inputStyle, paddingRight: selected && !disabled ? '2rem' : inputStyle.paddingRight, background: disabled ? '#f1f5f9' : '#fff' }}
      />
      {selected && !disabled && (
        <button type="button" aria-label={t('Clear')} title={t('Clear')} onClick={clear} className="ss-clear"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0.25rem 0.4rem' }}>
          ✕
        </button>
      )}
      {open && (
        <ul id={listId} ref={listRef} role="listbox" className="ss-list"
          style={{ position: 'absolute', zIndex: 1200, top: 'calc(100% + 2px)', left: 0, right: 0, maxHeight: 240, overflowY: 'auto', margin: 0, padding: '0.25rem 0', listStyle: 'none', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
          {loading ? (
            <li style={emptyStyle}>{t('Loading...')}</li>
          ) : filtered.length === 0 ? (
            <li style={emptyStyle}>{noOptionsText ?? t('No matches found')}</li>
          ) : filtered.map((o, i) => {
            const isSelected = !o.isNew && selected && o.value === selected.value;
            return (
              <li key={o.value} data-index={i} role="option" aria-selected={!!isSelected} className="ss-option wrap-text"
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem', cursor: 'pointer', color: '#1e293b', background: i === active ? '#eff6ff' : 'transparent', fontWeight: isSelected ? 600 : 400 }}>
                {o.isNew ? t('+ Add "{text}"', { text: o.label }) : o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const CREATE_VALUE = '__create__';
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const emptyStyle = { padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#94a3b8' };
