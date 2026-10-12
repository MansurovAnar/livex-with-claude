// Resolves a registration's extra_detail against the exam type's extra_details:
// required and must be one of them when the exam's type has any, otherwise always null.
async function resolveExtraDetail(db, examId, value) {
  const { rows } = await db.query(
    `SELECT et.extra_details
     FROM exams e
     LEFT JOIN exam_types et ON et.id = e.exam_type_id
     WHERE e.id = $1 AND e.is_active = true`,
    [examId]
  );
  if (!rows[0]) return { error: 'Exam not found', status: 404 };
  const options = rows[0].extra_details || [];
  if (!options.length) return { value: null };
  const detail = typeof value === 'string' ? value.trim() : '';
  if (!detail) return { error: 'Extra detail is required for this exam', status: 400 };
  if (!options.includes(detail)) return { error: 'Invalid extra detail for this exam', status: 400 };
  return { value: detail };
}

module.exports = { resolveExtraDetail };
