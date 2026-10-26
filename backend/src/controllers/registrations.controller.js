const pool = require('../config/database');
const { resolveExtraDetail } = require('../services/examExtraDetail.service');
const { removedRegistrationError } = require('../services/registrationRemoval.service');
const { dueAmountSql } = require('../services/coursePrice.service');

const PAYMENT_METHODS = ['card', 'cash'];

exports.listByExam = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.seat_number, r.room_number, r.amount_paid, r.payment_method, r.registered_at, r.extra_detail,
              s.id AS student_id, s.student_number, s.full_name, s.email, s.mobile_number, s.photo_url,
              s.is_course_student, s.is_free, s.discount_amount, s.discount_note,
              ${dueAmountSql('e', 's')} AS due_amount,
              -- Partner who registered the student; falls back to the student's own partner
              COALESCE(rb.full_name, sp.full_name) AS partner_name
       FROM registrations r JOIN students s ON s.id = r.student_id
       JOIN exams e ON e.id = r.exam_id
       LEFT JOIN users rb ON rb.id = r.registered_by AND rb.role = 'partner'
       LEFT JOIN users sp ON sp.id = s.partner_id
       WHERE r.exam_id = $1 AND r.removed_at IS NULL
       ORDER BY r.room_number NULLS LAST, r.seat_number NULLS LAST`,
      [req.params.examId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// Students removed from the exam (soft-removed registrations), newest removal first
exports.listRemovedByExam = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.registered_at, r.extra_detail, r.removed_at, r.removal_reason,
              s.id AS student_id, s.student_number, s.full_name, s.email, s.mobile_number,
              rm.full_name AS removed_by_name
       FROM registrations r JOIN students s ON s.id = r.student_id
       LEFT JOIN users rm ON rm.id = r.removed_by
       WHERE r.exam_id = $1 AND r.removed_at IS NOT NULL
       ORDER BY r.removed_at DESC`,
      [req.params.examId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { student_id, seat_number, room_number, extra_detail } = req.body;
    const removed = await removedRegistrationError(pool, req.params.examId, student_id, { canRestore: true });
    if (removed) return res.status(409).json(removed);
    const extra = await resolveExtraDetail(pool, req.params.examId, extra_detail);
    if (extra.error) {
      return res.status(extra.status).json({ success: false, error: { code: extra.status === 404 ? 'NOT_FOUND' : 'VALIDATION', message: extra.error } });
    }
    const { rows } = await pool.query(
      `INSERT INTO registrations (exam_id, student_id, seat_number, room_number, extra_detail, registered_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.examId, student_id, seat_number || null, room_number || null, extra.value, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student already registered or seat taken' } });
    next(err);
  }
};

exports.updatePayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount_paid, payment_method } = req.body;
    if (typeof amount_paid !== 'number' || amount_paid < 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'amount_paid must be a non-negative number' } });
    }
    // A payment must be tagged as card or cash; clearing the payment (0) clears the method
    if (amount_paid > 0 && !PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PAYMENT_METHOD', message: "payment_method must be 'card' or 'cash'" } });
    }
    const method = amount_paid > 0 ? payment_method : null;

    // Fetch current registration with the price the student owes (course discount applied),
    // commission and student's partner
    const { rows: existing } = await client.query(
      `SELECT r.bonus_awarded, ${dueAmountSql('e', 's')} AS due_amount, e.commission_amount, s.partner_id, s.is_course_student
       FROM registrations r
       JOIN exams e ON e.id = r.exam_id
       JOIN students s ON s.id = r.student_id
       WHERE r.id = $1 AND r.removed_at IS NULL`,
      [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registration not found' } });

    const { bonus_awarded, due_amount, commission_amount, partner_id, is_course_student } = existing[0];
    const nowFull = amount_paid >= Number(due_amount);
    // Course students never earn a partner commission
    const shouldAward = !bonus_awarded && partner_id && !is_course_student && nowFull;
    const shouldRevoke = bonus_awarded && partner_id && !nowFull;

    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE registrations
       SET amount_paid = $1,
           payment_method = $5,
           bonus_awarded = CASE WHEN $2 THEN true WHEN $3 THEN false ELSE bonus_awarded END
       WHERE id = $4 RETURNING *`,
      [amount_paid, shouldAward, shouldRevoke, req.params.id, method]
    );

    if (shouldAward) {
      await client.query(
        `UPDATE partner_profiles SET bonus_balance = bonus_balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [Number(commission_amount), partner_id]
      );
    } else if (shouldRevoke) {
      await client.query(
        `UPDATE partner_profiles SET bonus_balance = GREATEST(0, bonus_balance - $1), updated_at = NOW() WHERE user_id = $2`,
        [Number(commission_amount), partner_id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.deregister = async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM registrations WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registration not found' } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// Soft-remove a student from an exam. Only unpaid registrations can be removed; the
// seat and room are freed so they can be given to someone else.
exports.remove = async (req, res, next) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'A reason for removing the student is required' } });
    }
    const { rows } = await pool.query(
      `UPDATE registrations
       SET removed_at = NOW(), removed_by = $2, removal_reason = $3, seat_number = NULL, room_number = NULL
       WHERE id = $1 AND removed_at IS NULL AND amount_paid = 0
       RETURNING id, removed_at, removal_reason`,
      [req.params.id, req.user.id, reason]
    );
    if (rows[0]) return res.json({ success: true, data: rows[0] });

    const { rows: existing } = await pool.query('SELECT removed_at, amount_paid FROM registrations WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registration not found' } });
    if (existing[0].removed_at) return res.status(409).json({ success: false, error: { code: 'ALREADY_REMOVED', message: 'Student is already removed from this exam' } });
    return res.status(409).json({ success: false, error: { code: 'HAS_PAYMENT', message: 'Students with a recorded payment cannot be removed from the exam' } });
  } catch (err) { next(err); }
};

// Restore a removed student to the exam (seat and room stay empty)
exports.restore = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE registrations
       SET removed_at = NULL, removed_by = NULL, removal_reason = NULL
       WHERE id = $1 AND removed_at IS NOT NULL
       RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Removed registration not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
