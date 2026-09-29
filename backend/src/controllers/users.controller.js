const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { isValidStudentNumber } = require('../services/studentNumber.service');

const INITIAL_NUMBER_CONSTRAINT = 'partner_profiles_initial_student_number_key';

const invalidInitialNumber = res => res.status(400).json({
  success: false,
  error: { code: 'VALIDATION', message: 'Starting student number must be 1-7 digits' },
});
const initialNumberTaken = res => res.status(409).json({
  success: false,
  error: { code: 'DUPLICATE', message: 'Starting student number already used by another partner' },
});

exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.created_at,
             pp.school, pp.school_address, pp.number_of_students, pp.initial_student_number
      FROM users u
      LEFT JOIN partner_profiles pp ON pp.user_id = u.id
      ORDER BY u.full_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const { full_name, email, password, role, school, school_address, number_of_students } = req.body;
  const initial_student_number = req.body.initial_student_number != null ? String(req.body.initial_student_number).trim() : '';
  if (role === 'partner' && !isValidStudentNumber(initial_student_number)) return invalidInitialNumber(res);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, full_name, email, role, created_at',
      [full_name, email, hash, role]
    );
    const user = rows[0];

    if (role === 'partner') {
      await client.query(
        'INSERT INTO partner_profiles (user_id, school, school_address, number_of_students, initial_student_number) VALUES ($1,$2,$3,$4,$5)',
        [user.id, school, school_address, Number(number_of_students) || 0, initial_student_number]
      );
      user.school = school;
      user.school_address = school_address;
      user.number_of_students = Number(number_of_students) || 0;
      user.initial_student_number = initial_student_number;
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === INITIAL_NUMBER_CONSTRAINT) return initialNumberTaken(res);
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Email already in use' } });
    next(err);
  } finally {
    client.release();
  }
};

exports.update = async (req, res, next) => {
  const { full_name, email, role, is_active } = req.body;
  const hasInitial = req.body.initial_student_number !== undefined;
  const initial_student_number = hasInitial ? String(req.body.initial_student_number ?? '').trim() : null;
  if (hasInitial && !isValidStudentNumber(initial_student_number)) return invalidInitialNumber(res);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5 RETURNING id, full_name, email, role, is_active`,
      [full_name, email, role, is_active, req.params.id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    const user = rows[0];

    if (hasInitial) {
      const { rows: prof } = await client.query(
        `UPDATE partner_profiles SET initial_student_number = $1, updated_at = NOW()
         WHERE user_id = $2 RETURNING initial_student_number`,
        [initial_student_number, req.params.id]
      );
      if (!prof[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: { code: 'NOT_PARTNER', message: 'User has no partner profile' } });
      }
      user.initial_student_number = prof[0].initial_student_number;
    }

    await client.query('COMMIT');
    res.json({ success: true, data: user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === INITIAL_NUMBER_CONSTRAINT) return initialNumberTaken(res);
    if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Email already in use' } });
    next(err);
  } finally {
    client.release();
  }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};
