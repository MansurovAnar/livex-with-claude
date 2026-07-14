const router = require('express').Router();
const pool = require('../config/database');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin'));

// List all schools
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.name, s.location, s.students_1_to_7, s.students_8_to_11,
             s.director_name, s.created_at,
             u.id AS assigned_to_id, u.full_name AS assigned_to_name
      FROM schools s
      LEFT JOIN users u ON u.id = s.assigned_to
      WHERE s.is_active = true
      ORDER BY s.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Create school
router.post('/', async (req, res, next) => {
  try {
    const { name, location, students_1_to_7, students_8_to_11, director_name, assigned_to } = req.body;
    if (!name || !location || !director_name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'name, location and director_name are required' } });
    }
    const { rows } = await pool.query(
      `INSERT INTO schools (name, location, students_1_to_7, students_8_to_11, director_name, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, location, students_1_to_7 || 0, students_8_to_11 || 0, director_name, assigned_to || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// Delete school
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('UPDATE schools SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
