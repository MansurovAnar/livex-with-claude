const pool = require('../config/database');
const { dueAmountSql } = require('./coursePrice.service');

// Price owed per registration (course student discounts / FREE applied)
const DUE = dueAmountSql('e', 's');

// Per-exam payment figures. Legacy payments recorded before payment_method existed
// (amount_paid > 0, payment_method NULL) are reported as "unspecified", so
// card + cash + unspecified = paid. Commission = partner bonuses earned on the exam.
// Students removed from the exam are left out of every figure.
// Course students owe their discounted price (FREE = 0), see coursePrice.service.
const PAYMENT_COLUMNS = `
  e.id, e.title, e.scheduled_at, e.exam_location, e.status, e.exam_cost, e.commission_amount,
  COUNT(r.id)::int AS registered_count,
  COUNT(r.id) FILTER (WHERE r.amount_paid >= ${DUE})::int AS fully_paid_count,
  COUNT(r.id) FILTER (WHERE r.amount_paid > 0 AND r.amount_paid < ${DUE})::int AS partly_paid_count,
  COUNT(r.id) FILTER (WHERE r.amount_paid = 0 AND ${DUE} > 0)::int AS unpaid_count,
  COALESCE(SUM(${DUE}) FILTER (WHERE r.id IS NOT NULL), 0)::numeric(12,2) AS expected_total,
  COALESCE(SUM(r.amount_paid), 0)::numeric(12,2) AS paid_total,
  COALESCE(SUM(r.amount_paid) FILTER (WHERE r.payment_method = 'card'), 0)::numeric(12,2) AS paid_card,
  COALESCE(SUM(r.amount_paid) FILTER (WHERE r.payment_method = 'cash'), 0)::numeric(12,2) AS paid_cash,
  COALESCE(SUM(r.amount_paid) FILTER (WHERE r.payment_method IS NULL), 0)::numeric(12,2) AS paid_unspecified,
  COALESCE(SUM(GREATEST(${DUE} - r.amount_paid, 0)) FILTER (WHERE r.id IS NOT NULL), 0)::numeric(12,2) AS outstanding_total,
  (e.commission_amount * COUNT(r.id) FILTER (WHERE r.bonus_awarded = true))::numeric(12,2) AS commission_total,
  (COALESCE(SUM(r.amount_paid), 0) - e.commission_amount * COUNT(r.id) FILTER (WHERE r.bonus_awarded = true))::numeric(12,2) AS left_in_hand
`;

const MONEY_FIELDS = [
  'expected_total', 'paid_total', 'paid_card', 'paid_cash', 'paid_unspecified',
  'outstanding_total', 'commission_total', 'left_in_hand',
];
const COUNT_FIELDS = ['registered_count', 'fully_paid_count', 'partly_paid_count', 'unpaid_count'];

function toNumbers(row) {
  const out = { ...row };
  for (const f of MONEY_FIELDS) out[f] = Number(row[f]);
  out.exam_cost = Number(row.exam_cost);
  out.commission_amount = Number(row.commission_amount);
  return out;
}

exports.getExamPayments = async (examId) => {
  const { rows } = await pool.query(
    `SELECT ${PAYMENT_COLUMNS}
     FROM exams e
     LEFT JOIN registrations r ON r.exam_id = e.id AND r.removed_at IS NULL
     LEFT JOIN students s ON s.id = r.student_id
     WHERE e.id = $1
     GROUP BY e.id`,
    [examId]
  );
  return rows[0] ? toNumbers(rows[0]) : null;
};

// Completed, active exams whose exam date falls within [from, to] (both optional, YYYY-MM-DD).
exports.getCompletedExamsReport = async ({ from, to }) => {
  const conditions = [`e.is_active = true`, `e.status = 'completed'`];
  const values = [];
  let i = 1;
  if (from) { conditions.push(`e.scheduled_at::date >= $${i++}`); values.push(from); }
  if (to) { conditions.push(`e.scheduled_at::date <= $${i++}`); values.push(to); }

  const { rows } = await pool.query(
    `SELECT ${PAYMENT_COLUMNS}
     FROM exams e
     LEFT JOIN registrations r ON r.exam_id = e.id AND r.removed_at IS NULL
     LEFT JOIN students s ON s.id = r.student_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY e.id
     ORDER BY e.scheduled_at`,
    values
  );

  const exams = rows.map(toNumbers);
  const totals = { exam_count: exams.length };
  for (const f of [...MONEY_FIELDS, ...COUNT_FIELDS]) {
    totals[f] = Math.round(exams.reduce((sum, e) => sum + e[f], 0) * 100) / 100;
  }
  return { exams, totals };
};
