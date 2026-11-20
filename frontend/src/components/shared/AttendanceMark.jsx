import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

// LV#32: a student counts as attended when ticked or when any payment is recorded
// (the API returns this as is_attended).
export const isAttended = (reg) => !!reg.is_attended;

// Big animated "attended" checkbox with a green tick (exam students page, ongoing exams).
export function AttendanceCheckbox({ checked, disabled, busy, title, onChange }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={t('Attended')}
      title={title || (checked ? t('Attended') : t('Mark as attended'))}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={`attend-check${checked ? ' is-checked' : ''}`}
      style={{ cursor: disabled ? 'not-allowed' : busy ? 'wait' : 'pointer', opacity: disabled && !checked ? 0.5 : 1 }}>
      <span className="attend-check-tick" aria-hidden="true">✓</span>
    </button>
  );
}

// Red X shown for a student who did not attend a completed exam.
export function NotAttendedIcon() {
  const { t } = useLanguage();
  return (
    <span className="attend-x" role="img" aria-label={t('Did not attend')} title={t('Did not attend')}>✕</span>
  );
}

// Read-only attendance mark: green tick if attended, red X if the exam is completed
// and the student did not attend, otherwise a dash (exam not finished yet).
export function AttendanceStatus({ attended, examStatus }) {
  const { t } = useLanguage();
  if (attended) {
    return <span className="attend-tick" role="img" aria-label={t('Attended')} title={t('Attended')}>✓</span>;
  }
  if (examStatus === 'completed') return <NotAttendedIcon />;
  return <span style={{ color: '#cbd5e1' }}>—</span>;
}
