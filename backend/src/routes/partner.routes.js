const router = require('express').Router();
const pool = require('../config/database');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getNextStudentNumber } = require('../services/studentNumber.service');
const { resolveExtraDetail } = require('../services/examExtraDetail.service');
const { removedRegistrationError } = require('../services/registrationRemoval.service');

router.use(authenticate, authorize('partner'));

// ── My Students ──────────────────────────────────────────────────────────────

router.get('/students', async (req, res, next) => {
  try {
    const { search } = req.query;
    const params = [req.user.id];
    let query = `
      SELECT id, full_name, student_number, email, mobile_number,
             class_level, sector, language, created_at
      FROM students
      WHERE partner_id = $1 AND is_active = true
    `;
    if (search) {
      query += ` AND (full_name ILIKE $2 OR student_number ILIKE $2 OR email ILIKE $2 OR mobile_number ILIKE $2)`;
      params.push(`%${search}%`);
    }
    query += ' ORDER BY full_name';
    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Preview of the number the next added student will get
router.get('/students/next-number', async (req, res, next) => {
  try {
    const student_number = await getNextStudentNumber(pool, req.user.id);
    res.json({ success: true, data: { student_number } });
  } catch (err) { next(err); }
});

// student_number is assigned by the server; any client-sent value is ignored
router.post('/students', async (req, res, next) => {
  const { full_name, email, mobile_number, class_level, sector, language } = req.body;
  if (!full_name || !email) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'full_name and email are required' } });
  }
  const client = await pool.connect();
  let student_number;
  try {
    await client.query('BEGIN');
    // lock the partner row so concurrent adds get sequential numbers
    student_number = await getNextStudentNumber(client, req.user.id, { lock: true });
    const { rows } = await client.query(
      `INSERT INTO students (student_number, full_name, email, mobile_number, class_level, sector, language, partner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, student_number, full_name, email, mobile_number, class_level, sector, language, created_at`,
      [student_number, full_name, email, mobile_number || null, class_level || null, sector || null, language || null, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && String(err.constraint).includes('student_number')) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `Student number ${student_number} is already used by another student. Ask admin to change your starting number.` } });
    }
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Email already exists' } });
    next(err);
  } finally {
    client.release();
  }
});

// ── Exams (available for registration) ───────────────────────────────────────

router.get('/exams', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, et.name AS exam_type_name, et.extra_details AS exam_type_extra_details
       FROM exams e
       JOIN partner_profiles pp ON pp.user_id = $1
       LEFT JOIN exam_types et ON et.id = e.exam_type_id
       WHERE e.status IN ('scheduled','ongoing')
         AND (e.exam_location = pp.school OR e.exam_location = 'General')
       ORDER BY e.scheduled_at`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── Register own student to exam ──────────────────────────────────────────────

router.post('/exams/:examId/register', async (req, res, next) => {
  try {
    const { student_id, seat_number, room_number, extra_detail } = req.body;
    // Verify student belongs to this partner
    const { rows: owned } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND partner_id = $2 AND is_active = true',
      [student_id, req.user.id]
    );
    if (!owned.length) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Student does not belong to your school' } });
    }
    // Partners can only register to scheduled exams; registration closes once an exam is ongoing
    const { rows: examRows } = await pool.query(
      'SELECT status FROM exams WHERE id = $1 AND is_active = true',
      [req.params.examId]
    );
    if (examRows[0] && examRows[0].status !== 'scheduled') {
      return res.status(409).json({ success: false, error: { code: 'REGISTRATION_CLOSED', message: `Registration is closed — exam is ${examRows[0].status}` } });
    }
    const removed = await removedRegistrationError(pool, req.params.examId, student_id, { canRestore: false });
    if (removed) return res.status(409).json(removed);
    const extra = await resolveExtraDetail(pool, req.params.examId, extra_detail);
    if (extra.error) {
      return res.status(extra.status).json({ success: false, error: { code: extra.status === 404 ? 'NOT_FOUND' : 'VALIDATION', message: extra.error } });
    }
    const { rows } = await pool.query(
      `INSERT INTO registrations (exam_id, student_id, seat_number, room_number, extra_detail, registered_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.params.examId, student_id, seat_number || null, room_number || null, extra.value, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student already registered for this exam' } });
    next(err);
  }
});

// ── Students registered to a specific exam (partner's own students only) ──────

router.get('/exams/:examId/students', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.seat_number, r.room_number, r.registered_at, r.extra_detail,
             s.full_name, s.student_number, s.email, s.class_level, s.sector, s.language,
             e.title AS exam_title, e.scheduled_at, e.exam_location,
             et.extra_details AS exam_type_extra_details
      FROM registrations r
      JOIN students s ON s.id = r.student_id
      JOIN exams e ON e.id = r.exam_id
      LEFT JOIN exam_types et ON et.id = e.exam_type_id
      WHERE s.partner_id = $1 AND r.exam_id = $2 AND r.removed_at IS NULL
      ORDER BY s.full_name
    `, [req.user.id, req.params.examId]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── Payments: own students' registrations ─────────────────────────────────────

router.get('/payments', async (req, res, next) => {
  try {
    const [paymentsResult, profileResult] = await Promise.all([
      pool.query(`
        SELECT r.id, r.amount_paid, r.registered_at, r.seat_number, r.room_number,
               s.full_name, s.student_number,
               e.title AS exam_title, e.scheduled_at, e.exam_cost, e.exam_location
        FROM registrations r
        JOIN students s ON s.id = r.student_id
        JOIN exams e ON e.id = r.exam_id
        WHERE s.partner_id = $1 AND r.removed_at IS NULL
        ORDER BY r.registered_at DESC
      `, [req.user.id]),
      pool.query(
        'SELECT bonus_balance FROM partner_profiles WHERE user_id = $1',
        [req.user.id]
      ),
    ]);
    res.json({
      success: true,
      data: paymentsResult.rows,
      meta: { bonus_balance: Number(profileResult.rows[0]?.bonus_balance ?? 0) },
    });
  } catch (err) { next(err); }
});

// ── Bonuses: own totals + bonus payouts received from admin ───────────────────

router.get('/bonus', async (req, res, next) => {
  try {
    const [profileRes, paymentsRes] = await Promise.all([
      pool.query('SELECT bonus_balance FROM partner_profiles WHERE user_id = $1', [req.user.id]),
      pool.query(`
        SELECT id, amount, note, paid_at
        FROM partner_bonus_payments
        WHERE partner_id = $1
        ORDER BY paid_at DESC
      `, [req.user.id]),
    ]);
    const remaining = Number(profileRes.rows[0]?.bonus_balance ?? 0);
    const payments = paymentsRes.rows;
    const total_received = payments.reduce((s, p) => s + Number(p.amount), 0);
    res.json({
      success: true,
      data: { total_earned: remaining + total_received, total_received, remaining, payments },
    });
  } catch (err) { next(err); }
});

module.exports = router;
