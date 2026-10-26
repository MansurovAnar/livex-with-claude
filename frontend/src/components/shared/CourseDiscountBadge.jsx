import React from 'react';

// Badge for a course student's exam discount: "FREE" or "-X AZN" ("Course" when no discount).
// `courseLabel` shows a plain "Course" badge instead (used in the regular student lists).
// `student` needs is_course_student, is_free, discount_amount and (optionally) discount_note.
export default function CourseDiscountBadge({ student, courseLabel = false }) {
  if (!student?.is_course_student) return null;
  const discount = Number(student.discount_amount) || 0;
  const discountText = student.is_free ? 'FREE' : discount > 0 ? `-${discount.toFixed(2)} AZN` : null;
  const label = courseLabel ? 'Course' : discountText || 'Course';
  const title = ['Course student', discountText, student.discount_note].filter(Boolean).join(' — ');
  const colors = student.is_free && !courseLabel
    ? { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
    : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
  return (
    <span title={title}
      style={{ ...colors, padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {label}
    </span>
  );
}
