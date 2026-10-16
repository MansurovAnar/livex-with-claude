import React from 'react';

export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
];

export const paymentMethodLabel = (value) =>
  PAYMENT_METHODS.find(m => m.value === value)?.label || '';

// Required Card / Cash radio group used in the Record Payment modals
export default function PaymentMethodRadio({ value, onChange, name = 'payment_method' }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <span style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' }}>
        Payment Method <span style={{ color: '#dc2626' }}>*</span>
      </span>
      <div className="radio-row" role="radiogroup" style={{ display: 'flex', gap: '1.5rem' }}>
        {PAYMENT_METHODS.map(m => (
          <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
            <input
              type="radio"
              name={name}
              value={m.value}
              checked={value === m.value}
              onChange={() => onChange(m.value)}
              style={{ accentColor: '#2563eb', width: 16, height: 16 }}
            />
            {m.label}
          </label>
        ))}
      </div>
    </div>
  );
}
