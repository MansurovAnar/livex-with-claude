const router = require('express').Router();
const pool = require('../config/database');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

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

router.post('/students', async (req, res, next) => {
  try {
    const { student_number, full_name, email, mobile_number, class_level, sector, language } = req.body;
    if (!student_number || !full_name || !email) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'student_number, full_name and email are required' } });
    }
    const { rows } = await pool.query(
      `INSERT INTO students (student_number, full_name, email, mobile_number, class_level, sector, language, partner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, student_number, full_name, email, mobile_number, class_level, sector, language, created_at`,
      [student_number, full_name, email, mobile_number || null, class_level || null, sector || null, language || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student number or email already exists' } });
    next(err);
  }
});

// ── Exams (available for registration) ───────────────────────────────────────

router.get('/exams', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.* FROM exams e
       JOIN partner_profiles pp ON pp.user_id = $1
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
    const { student_id, seat_number, room_number } = req.body;
    // Verify student belongs to this partner
    const { rows: owned } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND partner_id = $2 AND is_active = true',
      [student_id, req.user.id]
    );
    if (!owned.length) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Student does not belong to your school' } });
    }
    const { rows } = await pool.query(
      `INSERT INTO registrations (exam_id, student_id, seat_number, room_number, registered_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [req.params.examId, student_id, seat_number || null, room_number || null, req.user.id]
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
      SELECT r.id, r.seat_number, r.room_number, r.registered_at,
             s.full_name, s.student_number, s.class_level, s.sector, s.language,
             e.title AS exam_title, e.scheduled_at, e.exam_location
      FROM registrations r
      JOIN students s ON s.id = r.student_id
      JOIN exams e ON e.id = r.exam_id
      WHERE s.partner_id = $1 AND r.exam_id = $2
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
        WHERE s.partner_id = $1
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

module.exports = router;
