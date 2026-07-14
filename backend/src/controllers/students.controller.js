const pool = require('../config/database');
const parsePagination = require('../utils/pagination');

const STUDENT_COLS = 'id, student_number, full_name, email, mobile_number, photo_url, created_at';

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.search ? `%${req.query.search}%` : null;

    const whereClause = search
      ? 'WHERE is_active = true AND (full_name ILIKE $1 OR student_number ILIKE $1 OR email ILIKE $1 OR mobile_number ILIKE $1)'
      : 'WHERE is_active = true';
    const params = search ? [search, limit, offset] : [limit, offset];
    const limitParam = search ? '$2' : '$1';
    const offsetParam = search ? '$3' : '$2';

    const { rows } = await pool.query(
      `SELECT ${STUDENT_COLS} FROM students ${whereClause}
       ORDER BY full_name LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM students ${whereClause}`,
      search ? [search] : []
    );
    res.json({ success: true, data: rows, meta: { page, limit, total: parseInt(countRows[0].count, 10) } });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${STUDENT_COLS} FROM students WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { student_number, full_name, email, mobile_number, photo_url } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO students (student_number, full_name, email, mobile_number, photo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${STUDENT_COLS}`,
      [student_number, full_name, email, mobile_number || null, photo_url || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student number or email already exists' } });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['student_number', 'full_name', 'email', 'mobile_number', 'photo_url'];
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${i} AND is_active = true RETURNING ${STUDENT_COLS}`,
      values
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rows } = await pool.query('UPDATE students SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    res.json({ success: true });
  } catch (err) { next(err); }
};
