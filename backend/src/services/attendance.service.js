// LV#32: a student counts as attended when admin/reception ticked "attended" or when
// any payment is recorded for the registration (full or partial payers were at the exam).
exports.attendedSql = (r) => `(${r}.attended OR ${r}.amount_paid > 0)`;
