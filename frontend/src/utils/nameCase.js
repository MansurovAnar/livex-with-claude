// Name / Surname / Father name capitalisation (LV#64), same rule as the backend's
// capitalizeName: the first letter of every word (after start, space or hyphen) is
// upper-cased the Azerbaijani way (i -> İ, ı -> I); the rest is kept as typed.
export const NAME_FIELDS = new Set(['first_name', 'last_name', 'father_name', 'full_name']);

const upperAz = ch => (ch === 'i' ? 'İ' : ch === 'ı' ? 'I' : ch.toUpperCase());

export function capitalizeName(value) {
  return typeof value === 'string'
    ? value.replace(/(^|[\s-])(\p{Ll})/gu, (m, sep, ch) => sep + upperAz(ch))
    : value;
}

// Value for an input's onChange: name fields are capitalised in place. The DOM value is
// updated here with the caret restored, so React doesn't jump the caret to the end.
// Every replacement is one letter for one letter, so the caret position stays valid.
export function nameInputValue(input) {
  if (!NAME_FIELDS.has(input.name)) return input.value;
  const value = capitalizeName(input.value);
  if (value !== input.value) {
    const { selectionStart, selectionEnd } = input;
    input.value = value;
    input.setSelectionRange(selectionStart, selectionEnd);
  }
  return value;
}
