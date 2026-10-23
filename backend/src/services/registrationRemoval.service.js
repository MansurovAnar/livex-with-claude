// If the student was removed from the exam, returns the 409 error body that refuses
// registering them again (they must be restored instead); otherwise null.
async function removedRegistrationError(db, examId, studentId, { canRestore }) {
  const { rows } = await db.query(
    `SELECT e.id AS exam_id, e.title AS exam_title
     FROM registrations r
     JOIN exams e ON e.id = r.exam_id
     WHERE r.exam_id = $1 AND r.student_id = $2 AND r.removed_at IS NOT NULL`,
    [examId, studentId]
  );
  if (!rows[0]) return null;
  const { exam_id, exam_title } = rows[0];
  const restoreHint = canRestore
    ? ' You can restore this student from the exam\'s "Removed students" list.'
    : ' Contact reception to restore this student.';
  return {
    success: false,
    error: {
      code: 'REMOVED_FROM_EXAM',
      message: `This student is removed from ${exam_title} exam.${restoreHint}`,
      details: { exam_id, exam_title },
    },
  };
}

module.exports = { removedRegistrationError };
