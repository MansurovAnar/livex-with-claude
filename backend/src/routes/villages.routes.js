const router = require('express').Router();
const pool = require('../config/database');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

const validationError = (res, message) =>
  res.status(400).json({ success: false, error: { code: 'VALIDATION', message } });

const duplicateError = (res) =>
  res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'An active village with this name already exists' } });

const notFound = (res) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Village not found' } });

// Trim and collapse inner whitespace so "Qax  rayonu " and "Qax rayonu" are the same name
const cleanName = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

// List villages — active only for dropdowns; admin may add ?include_inactive=true
router.get('/', authorize('admin', 'telesales'), async (req, res, next) => {
  try {
    const includeInactive = req.user.role === 'admin' && req.query.include_inactive === 'true';
    const { rows } = await pool.query(
      `SELECT id, name, is_active, created_at, updated_at
       FROM villages
       ${includeInactive ? '' : 'WHERE is_active = true'}
       ORDER BY is_active DESC, name`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Create village
router.post('/', authorize('admin'), async (req, res, next) => {
  const name = cleanName(req.body.name);
  if (!name) return validationError(res, 'name is required');
  if (name.length > 255) return validationError(res, 'name must be at most 255 characters');
  try {
    const { rows } = await pool.query(
      `INSERT INTO villages (name, created_by, updated_by) VALUES ($1, $2, $2)
       RETURNING id, name, is_active, created_at, updated_at`,
      [name, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    next(err);
  }
});

// Rename village
router.put('/:id', authorize('admin'), async (req, res, next) => {
  const name = cleanName(req.body.name);
  if (!name) return validationError(res, 'name is required');
  if (name.length > 255) return validationError(res, 'name must be at most 255 characters');
  try {
    const { rows } = await pool.query(
      `UPDATE villages SET name = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, is_active, created_at, updated_at`,
      [name, req.user.id, req.params.id]
    );
    if (!rows.length) return notFound(res);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    if (err.code === '22P02') return notFound(res); // malformed UUID
    next(err);
  }
});

// Deactivate / reactivate village (soft delete)
router.patch('/:id/status', authorize('admin'), async (req, res, next) => {
  if (typeof req.body.is_active !== 'boolean') return validationError(res, 'is_active must be true or false');
  try {
    const { rows } = await pool.query(
      `UPDATE villages SET is_active = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, is_active, created_at, updated_at`,
      [req.body.is_active, req.user.id, req.params.id]
    );
    if (!rows.length) return notFound(res);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    if (err.code === '22P02') return notFound(res);
    next(err);
  }
});

module.exports = router;
