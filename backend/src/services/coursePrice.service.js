// Price a student owes for an exam. Course students pay the exam cost minus their
// fixed AZN discount (never below 0); FREE course students owe nothing.
// `e` and `s` are the SQL aliases of the exams and students tables.
exports.dueAmountSql = (e = 'e', s = 's') =>
  `(CASE WHEN ${s}.is_course_student AND ${s}.is_free THEN 0
         WHEN ${s}.is_course_student THEN GREATEST(${e}.exam_cost - ${s}.discount_amount, 0)
         ELSE ${e}.exam_cost END)`;
