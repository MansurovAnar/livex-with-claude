const STUDENT_NUMBER_RE = /^\d{1,7}$/;
const MAX_STUDENT_NUMBER = 9999999;

function isValidStudentNumber(value) {
  return typeof value === 'string' && STUDENT_NUMBER_RE.test(value);
}

// Next number for a partner = MAX numeric student_number of the partner's non-deleted
// students + 1, else the partner's initial_student_number.
// Pass a transaction client with { lock: true } to lock the partner_profiles row.
async function getNextStudentNumber(db, partnerId, { lock = false } = {}) {
  const { rows: profile } = await db.query(
    `SELECT initial_student_number FROM partner_profiles WHERE user_id = $1${lock ? ' FOR UPDATE' : ''}`,
    [partnerId]
  );
  if (!profile[0]) {
    const err = new Error('Partner profile not found');
    err.status = 404; err.code = 'NOT_FOUND';
    throw err;
  }
  const initial = profile[0].initial_student_number;

  const { rows } = await db.query(
    `SELECT MAX(student_number::bigint) AS max_num
     FROM students
     WHERE partner_id = $1 AND is_active = true AND student_number ~ '^[0-9]{1,7}$'`,
    [partnerId]
  );
  if (rows[0].max_num === null) return initial;

  const next = Number(rows[0].max_num) + 1;
  if (next > MAX_STUDENT_NUMBER) {
    const err = new Error('Student number limit (7 digits) reached; ask admin to change your starting number');
    err.status = 409; err.code = 'LIMIT_REACHED';
    throw err;
  }
  // keep leading zeros of the starting number (e.g. 0001000 -> 0001001)
  return String(next).padStart(initial.length, '0');
}

module.exports = { STUDENT_NUMBER_RE, isValidStudentNumber, getNextStudentNumber };
