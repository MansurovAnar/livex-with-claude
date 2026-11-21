const pool = require('../config/database');
const { capitalizeName } = require('../services/studentEmail.service');

// Exams open for public applications: scheduled and not in the past (LV#81)
const OPEN_EXAM_SQL = `e.is_active = true AND e.status = 'scheduled' AND e.scheduled_at >= date_trunc('day', NOW())`;

const NOT_FOUND = { success: false, error: { code: 'NOT_FOUND', message: 'Application not found or already moved' } };

// Public: upcoming exam schedule for the landing page (no login)
exports.listPublicExams = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.scheduled_at, e.duration_mins, e.exam_location, e.exam_cost, et.name AS exam_type_name
       FROM exams e
       LEFT JOIN exam_types et ON et.id = e.exam_type_id
       WHERE ${OPEN_EXAM_SQL}
       ORDER BY e.scheduled_at`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// Public: submit an application from the landing page form (no login)
exports.createPublic = async (req, res, next) => {
  try {
    const { exam_id, class_level, sector, language, mobile_number } = req.body;
    const [firstName, lastName, fatherName] = [req.body.first_name, req.body.last_name, req.body.father_name]
      .map(v => capitalizeName(v.replace(/\s+/g, ' ')));

    const { rows: exams } = await pool.query(`SELECT e.id FROM exams e WHERE e.id = $1 AND ${OPEN_EXAM_SQL}`, [exam_id]);
    if (!exams[0]) {
      return res.status(400).json({ success: false, error: { code: 'EXAM_NOT_OPEN', message: 'This exam is not open for registration' } });
    }

    const { rows: dup } = await pool.query(
      `SELECT 1 FROM exam_applications
       WHERE exam_id = $1 AND mobile_number = $2 AND lower(first_name) = lower($3) AND lower(last_name) = lower($4)`,
      [exam_id, mobile_number, firstName, lastName]
    );
    if (dup[0]) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'You have already applied for this exam' } });
    }

    await pool.query(
      `INSERT INTO exam_applications (exam_id, first_name, last_name, father_name, class_level, sector, language, mobile_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [exam_id, firstName, lastName, fatherName, class_level, sector, language, mobile_number]
    );
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
};

// Reception/admin: all applications, newest first (the page splits them by status)
exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.exam_id, a.first_name, a.last_name, a.father_name, a.class_level, a.sector, a.language,
              a.mobile_number, a.status, a.created_at, a.moved_at,
              e.title AS exam_title, e.scheduled_at AS exam_scheduled_at, u.full_name AS moved_by_name
       FROM exam_applications a
       JOIN exams e ON e.id = a.exam_id
       LEFT JOIN users u ON u.id = a.moved_by
       ORDER BY a.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// Reception/admin: "Added to Exam" moves the application to "Students moved to exam".
// It does not create a student or a registration (the user asked to handle that later).
exports.markMoved = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE exam_applications SET status = 'moved', moved_at = NOW(), moved_by = $2
       WHERE id = $1 AND status = 'new'
       RETURNING id, status, moved_at`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json(NOT_FOUND);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json(NOT_FOUND); // not a UUID
    next(err);
  }
};
