const pool = require('../config/database');
const { buildFullName, generateStudentEmail } = require('../services/studentEmail.service');

const ALLOWED_PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;
const STUDENT_COLS = 'id, student_number, full_name, email, mobile_number, class_level, sector, language, photo_url, created_at';

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = ALLOWED_PAGE_SIZES.includes(requestedLimit) ? requestedLimit : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;
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

// Preview of the email the next student with this name will get
exports.emailPreview = async (req, res, next) => {
  try {
    const email = await generateStudentEmail(pool, req.query.first_name, req.query.last_name);
    res.json({ success: true, data: { email } });
  } catch (err) { next(err); }
};

// full_name and email are built by the server; any client-sent values are ignored
exports.create = async (req, res, next) => {
  const { student_number, first_name, last_name, father_name, mobile_number, class_level, sector, language, photo_url } = req.body;
  const full_name = buildFullName(first_name, last_name, father_name);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const email = await generateStudentEmail(client, first_name, last_name, { lock: true });
    const { rows } = await client.query(
      `INSERT INTO students (student_number, full_name, email, mobile_number, class_level, sector, language, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${STUDENT_COLS}`,
      [student_number, full_name, email, mobile_number || null, class_level || null, sector || null, language || null, photo_url || null]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student number or email already exists' } });
    next(err);
  } finally {
    client.release();
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['student_number', 'full_name', 'email', 'mobile_number', 'class_level', 'sector', 'language', 'photo_url'];
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
  } catch (err) {
    if (err.code === '23505' && String(err.constraint).includes('student_number')) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student number already in use' } });
    }
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Email already in use' } });
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE students SET
         is_active      = false,
         full_name      = 'deleted_student',
         email          = 'deleted_' || id || '@deleted.local',
         student_number = 'DELETED_' || id,
         mobile_number  = '--',
         photo_url      = NULL,
         class_level    = NULL,
         sector         = '--',
         language       = '--',
         partner_id     = NULL,
         deleted_at     = NOW(),
         updated_at     = NOW()
       WHERE id = $1 AND is_active = true
       RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    res.json({ success: true });
  } catch (err) { next(err); }
};
