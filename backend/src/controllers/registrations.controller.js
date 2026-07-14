const pool = require('../config/database');

exports.listByExam = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.seat_number, r.room_number, r.amount_paid, r.registered_at,
              s.id AS student_id, s.student_number, s.full_name, s.email, s.mobile_number, s.photo_url
       FROM registrations r JOIN students s ON s.id = r.student_id
       WHERE r.exam_id = $1 ORDER BY r.room_number NULLS LAST, r.seat_number NULLS LAST`,
      [req.params.examId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { student_id, seat_number, room_number } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO registrations (exam_id, student_id, seat_number, room_number, registered_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.examId, student_id, seat_number || null, room_number || null, req.user.id]
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
    const { amount_paid } = req.body;
    if (typeof amount_paid !== 'number' || amount_paid < 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'amount_paid must be a non-negative number' } });
    }

    // Fetch current registration with exam cost, commission and student's partner
    const { rows: existing } = await client.query(
      `SELECT r.bonus_awarded, e.exam_cost, e.commission_amount, s.partner_id
       FROM registrations r
       JOIN exams e ON e.id = r.exam_id
       JOIN students s ON s.id = r.student_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Registration not found' } });

    const { bonus_awarded, exam_cost, commission_amount, partner_id } = existing[0];
    const shouldAward = !bonus_awarded && partner_id && amount_paid >= Number(exam_cost);

    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE registrations
       SET amount_paid = $1, bonus_awarded = CASE WHEN $2 THEN true ELSE bonus_awarded END
       WHERE id = $3 RETURNING *`,
      [amount_paid, shouldAward, req.params.id]
    );

    if (shouldAward) {
      await client.query(
        `UPDATE partner_profiles SET bonus_balance = bonus_balance + $1, updated_at = NOW() WHERE user_id = $2`,
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
