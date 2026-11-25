// "DD Mon YYYY" dates with the month name in the UI language (LV#50)
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  az: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'],
};

const pad = (n) => String(n).padStart(2, '0');

// Date / ISO timestamp → "25 Nov 2026" in the browser's time zone; a plain 'YYYY-MM-DD' is taken as-is
export function formatDate(value, lang = 'en') {
  if (!value) return '';
  const months = MONTHS[lang] || MONTHS.en;
  const ymd = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (ymd) return `${ymd[3]} ${months[Number(ymd[2]) - 1]} ${ymd[1]}`;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// "14:30" in the browser's time zone
export const formatTime = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// "25 Nov 2026 14:30"
export const formatDateTime = (value, lang) => `${formatDate(value, lang)} ${formatTime(value)}`.trim();
