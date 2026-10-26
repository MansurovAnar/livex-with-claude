// Student email = <name><first letter of surname>@livex.hedef, Azerbaijani letters
// transliterated (ş -> sh, ç -> ch, ...). Duplicates get 1, 2, ... appended.
const EMAIL_DOMAIN = '@livex.hedef';
const FALLBACK_BASE = 'student';

const AZ_MAP = {
  'ə': 'e', 'Ə': 'e',
  'ı': 'i', 'I': 'i', 'İ': 'i',
  'ö': 'o', 'Ö': 'o',
  'ü': 'u', 'Ü': 'u',
  'ğ': 'g', 'Ğ': 'g',
  'ş': 'sh', 'Ş': 'sh',
  'ç': 'ch', 'Ç': 'ch',
};

function cleanNamePart(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

// Map Azerbaijani letters before lower-casing ('İ'.toLowerCase() adds a combining dot),
// then keep only a-z.
function transliterate(value) {
  return cleanNamePart(value)
    .replace(/[əƏıIİöÖüÜğĞşŞçÇ]/g, ch => AZ_MAP[ch])
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function buildFullName(firstName, lastName, fatherName) {
  return [firstName, lastName, fatherName].map(cleanNamePart).filter(Boolean).join(' ');
}

function buildEmailBase(firstName, lastName) {
  const base = transliterate(firstName) + transliterate(lastName).charAt(0);
  return base || FALLBACK_BASE;
}

// First free email for the base: base, base1, base2, ...
// Pass a transaction client with { lock: true } so concurrent adds of the same base
// wait for each other (the lock is released on COMMIT/ROLLBACK).
async function generateStudentEmail(db, firstName, lastName, { lock = false } = {}) {
  const base = buildEmailBase(firstName, lastName);
  if (lock) await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`student_email:${base}`]);

  // base is [a-z]+ only, so it is safe inside the regex
  const { rows } = await db.query(
    `SELECT substring(lower(email) FROM $1) AS suffix
     FROM students
     WHERE lower(email) ~ $1`,
    [`^${base}([0-9]*)@livex\\.hedef$`]
  );
  if (!rows.length) return `${base}${EMAIL_DOMAIN}`;

  const taken = new Set(rows.map(r => r.suffix));
  if (!taken.has('')) return `${base}${EMAIL_DOMAIN}`;
  const maxSuffix = rows.reduce((max, r) => (/^[1-9][0-9]*$/.test(r.suffix) ? Math.max(max, Number(r.suffix)) : max), 0);
  return `${base}${maxSuffix + 1}${EMAIL_DOMAIN}`;
}

module.exports = { EMAIL_DOMAIN, cleanNamePart, transliterate, buildFullName, buildEmailBase, generateStudentEmail };
