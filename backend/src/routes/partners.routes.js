const router = require('express').Router();
const pool = require('../config/database');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin', 'reception'));

// List all partners
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
             pp.school, pp.school_address, pp.number_of_students
      FROM users u
      JOIN partner_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'partner'
      ORDER BY u.full_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Exams that a partner's students are registered for (with per-exam bonus)
router.get('/:partnerId/exams', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, e.title, e.scheduled_at, e.exam_location, e.exam_cost, e.status, e.duration_mins, e.commission_amount,
             COUNT(r.id)::int AS registered_count,
             (COUNT(r.id) FILTER (WHERE r.bonus_awarded = true) * e.commission_amount)::numeric AS exam_bonus
      FROM registrations r
      JOIN students s ON s.id = r.student_id
      JOIN exams e ON e.id = r.exam_id
      WHERE s.partner_id = $1
      GROUP BY e.id
      ORDER BY e.scheduled_at DESC
    `, [req.params.partnerId]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Partner total bonus info + payment history
router.get('/:partnerId/bonus', authorize('admin'), async (req, res, next) => {
  try {
    const [profileRes, paymentsRes] = await Promise.all([
      pool.query(`SELECT bonus_balance FROM partner_profiles WHERE user_id = $1`, [req.params.partnerId]),
      pool.query(`
        SELECT pbp.id, pbp.amount, pbp.note, pbp.paid_at, u.full_name AS paid_by_name
        FROM partner_bonus_payments pbp
        LEFT JOIN users u ON u.id = pbp.paid_by
        WHERE pbp.partner_id = $1
        ORDER BY pbp.paid_at DESC
      `, [req.params.partnerId]),
    ]);
    const bonus_balance = Number(profileRes.rows[0]?.bonus_balance ?? 0);
    const payments = paymentsRes.rows;
    const total_paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const total_earned = bonus_balance + total_paid;
    res.json({ success: true, data: { total_earned, total_paid, remaining: bonus_balance, payments } });
  } catch (err) { next(err); }
});

// Record a bonus payment to partner
router.post('/:partnerId/bonus/payments', authorize('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount, note } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID', message: 'Amount must be positive' } });

    const { rows: prof } = await client.query(`SELECT bonus_balance FROM partner_profiles WHERE user_id = $1`, [req.params.partnerId]);
    const balance = Number(prof[0]?.bonus_balance ?? 0);
    if (amt > balance) return res.status(400).json({ success: false, error: { code: 'EXCEEDS', message: 'Payment exceeds remaining bonus balance' } });

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO partner_bonus_payments (partner_id, amount, note, paid_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.partnerId, amt, note || null, req.user.id]
    );
    await client.query(
      `UPDATE partner_profiles SET bonus_balance = bonus_balance - $1, updated_at = NOW() WHERE user_id = $2`,
      [amt, req.params.partnerId]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Partner's students in a specific exam (with payment info)
router.get('/:partnerId/exams/:examId/students', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.amount_paid, r.registered_at, r.seat_number, r.room_number,
             s.full_name, s.student_number, s.email, s.mobile_number,
             s.class_level, s.sector, s.language
      FROM registrations r
      JOIN students s ON s.id = r.student_id
      WHERE s.partner_id = $1 AND r.exam_id = $2
      ORDER BY s.full_name
    `, [req.params.partnerId, req.params.examId]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
