const router = require('express').Router();
const pool = require('../config/database');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin'));

const validationError = (res, message) =>
  res.status(400).json({ success: false, error: { code: 'VALIDATION', message } });

const duplicateError = (res) =>
  res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'An exam type with this name already exists' } });

// Normalize body into { name, description, extra_details } or return an error message
function parseBody(body) {
  const name = (body.name || '').trim();
  const description = (body.description || '').trim() || null;
  if (!name) return { error: 'name is required' };

  const raw = body.extra_details ?? [];
  if (!Array.isArray(raw)) return { error: 'extra_details must be an array' };
  const seen = new Set();
  const extra_details = [];
  for (const item of raw) {
    if (typeof item !== 'string') return { error: 'extra_details must contain only strings' };
    const value = item.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    extra_details.push(value);
  }
  return { name, description, extra_details };
}

// List exam types
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, extra_details, created_at, updated_at
       FROM exam_types
       WHERE is_active = true
       ORDER BY name`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Create exam type
router.post('/', async (req, res, next) => {
  const parsed = parseBody(req.body);
  if (parsed.error) return validationError(res, parsed.error);
  try {
    const { rows } = await pool.query(
      `INSERT INTO exam_types (name, description, extra_details) VALUES ($1, $2, $3) RETURNING *`,
      [parsed.name, parsed.description, parsed.extra_details]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    next(err);
  }
});

// Update exam type
router.put('/:id', async (req, res, next) => {
  const parsed = parseBody(req.body);
  if (parsed.error) return validationError(res, parsed.error);
  try {
    const { rows } = await pool.query(
      `UPDATE exam_types
       SET name = $1, description = $2, extra_details = $3, updated_at = NOW()
       WHERE id = $4 AND is_active = true
       RETURNING *`,
      [parsed.name, parsed.description, parsed.extra_details, req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam type not found' } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    if (err.code === '22P02') return validationError(res, 'Invalid exam type id');
    next(err);
  }
});

// Delete exam type (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE exam_types SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam type not found' } });
    }
    res.json({ success: true });
  } catch (err) {
    if (err.code === '22P02') return validationError(res, 'Invalid exam type id');
    next(err);
  }
});

module.exports = router;
