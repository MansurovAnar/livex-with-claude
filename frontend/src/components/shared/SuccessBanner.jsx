import React, { useEffect } from 'react';

// Green dismissible banner; auto-hides after `timeout` ms.
export default function SuccessBanner({ message, onDismiss, timeout = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, timeout);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <div role="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
      <span className="wrap-text" style={{ minWidth: 0 }}>✓ {message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flex: 'none' }}>
        ✕
      </button>
    </div>
  );
}
