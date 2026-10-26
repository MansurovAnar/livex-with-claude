const pool = require('../config/database');

const ALLOWED_PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;
const STUDENT_COLS = 'id, student_number, full_name, email, mobile_number, class_level, sector, language, photo_url, created_at, '
  + 'is_course_student, discount_amount, is_free, discount_note';

// Paginated, searchable student list. `courseOnly` limits it to course students.
async function listStudents(req, res, next, { courseOnly = false } = {}) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = ALLOWED_PAGE_SIZES.includes(requestedLimit) ? requestedLimit : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;

    const conditions = ['is_active = true'];
    const values = [];
    if (courseOnly) conditions.push('is_course_student = true');
    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      conditions.push(`(full_name ILIKE $1 OR student_number ILIKE $1 OR email ILIKE $1 OR mobile_number ILIKE $1)`);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const { rows } = await pool.query(
      `SELECT ${STUDENT_COLS} FROM students ${whereClause}
       ORDER BY full_name LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM students ${whereClause}`, values);
    res.json({ success: true, data: rows, meta: { page, limit, total: parseInt(countRows[0].count, 10) } });
  } catch (err) { next(err); }
}

exports.list = (req, res, next) => listStudents(req, res, next);
exports.listCourse = (req, res, next) => listStudents(req, res, next, { courseOnly: true });

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
    const { student_number, full_name, email, mobile_number, class_level, sector, language, photo_url } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO students (student_number, full_name, email, mobile_number, class_level, sector, language, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${STUDENT_COLS}`,
      [student_number, full_name, email, mobile_number || null, class_level || null, sector || null, language || null, photo_url || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student number or email already exists' } });
    next(err);
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

// FREE overrides the discount amount, so store 0 to keep the two consistent
const normalizeDiscount = (body) => (body.is_free === true ? { ...body, discount_amount: 0 } : body);

exports.createCourse = async (req, res, next) => {
  try {
    const { student_number, full_name, email, mobile_number, class_level, sector, language, photo_url,
      discount_amount, is_free, discount_note } = normalizeDiscount(req.body);
    const { rows } = await pool.query(
      `INSERT INTO students (student_number, full_name, email, mobile_number, class_level, sector, language, photo_url,
                             is_course_student, discount_amount, is_free, discount_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11) RETURNING ${STUDENT_COLS}`,
      [student_number, full_name, email, mobile_number || null, class_level || null, sector || null, language || null,
        photo_url || null, discount_amount, is_free, discount_note || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Student number or email already exists' } });
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const body = normalizeDiscount(req.body);
    if (body.discount_note !== undefined) body.discount_note = body.discount_note || null;
    const allowed = ['student_number', 'full_name', 'email', 'mobile_number', 'class_level', 'sector', 'language', 'photo_url',
      'discount_amount', 'is_free', 'discount_note'];
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE students SET ${fields.join(', ')}
       WHERE id = $${i} AND is_active = true AND is_course_student = true RETURNING ${STUDENT_COLS}`,
      values
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course student not found' } });
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
