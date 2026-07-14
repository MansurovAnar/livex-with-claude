const pool = require('../config/database');
const parsePagination = require('../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, date } = req.query;
    const conditions = ['e.is_active = true'];
    const values = [];
    let i = 1;
    if (status) { conditions.push(`e.status = $${i++}`); values.push(status); }
    if (date) { conditions.push(`e.scheduled_at::date = $${i++}`); values.push(date); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM exams e
       ${where} ORDER BY e.scheduled_at DESC LIMIT $${i++} OFFSET $${i}`,
      values
    );
    res.json({ success: true, data: rows, meta: { page, limit } });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM exams WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, subject_code, exam_location, exam_cost, commission_amount, scheduled_at, duration_mins, entry_opens_at, entry_closes_at } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO exams (title, subject_code, exam_location, exam_cost, commission_amount, scheduled_at, duration_mins, entry_opens_at, entry_closes_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, subject_code || null, exam_location, exam_cost ?? 0, commission_amount ?? 0, scheduled_at, duration_mins, entry_opens_at, entry_closes_at, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['title', 'subject_code', 'exam_location', 'exam_cost', 'commission_amount', 'scheduled_at', 'duration_mins', 'entry_opens_at', 'entry_closes_at'];
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const { rows } = await pool.query(`UPDATE exams SET ${fields.join(', ')} WHERE id = $${i} AND is_active = true RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.query('UPDATE exams SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { rows } = await pool.query('UPDATE exams SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [req.body.status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
