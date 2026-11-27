const pool = require('../config/database');

// "Another student at home" opens the class picker in the lead form, so it can't be deactivated
const LOCKED_KEYS = ['another_student_at_home'];

// Every query that returns options passes LOCKED_KEYS as $1
const OPTION_COLUMNS = 'id, key, label, label_az, sort_order, is_active, (key = ANY($1::text[])) AS is_locked';

const validationError = (res, message) =>
  res.status(400).json({ success: false, error: { code: 'VALIDATION', message } });

const notFound = (res) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Option not found' } });

const duplicateError = (res) =>
  res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'An active option with this label already exists' } });

// Trim and collapse inner whitespace
const cleanText = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

// Reads { label, label_az } from the body; returns an error message or the cleaned values
function readLabels(body) {
  const label = cleanText(body?.label);
  const labelAz = cleanText(body?.label_az) || null;
  if (!label) return { error: 'Label is required' };
  if (label.length > 150) return { error: 'Label must be at most 150 characters' };
  if (labelAz && labelAz.length > 150) return { error: 'Azerbaijani label must be at most 150 characters' };
  return { label, labelAz };
}

// GET /api/telesales/extra-info-options — every option (inactive ones too, so leads that
// already have one can still show its label); the lead form offers only active ones
exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${OPTION_COLUMNS} FROM lead_extra_info_options ORDER BY sort_order, label`,
      [LOCKED_KEYS]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/telesales/extra-info-options — admin; new option goes to the end of the list
exports.create = async (req, res, next) => {
  const { error, label, labelAz } = readLabels(req.body);
  if (error) return validationError(res, error);
  try {
    const { rows } = await pool.query(
      `INSERT INTO lead_extra_info_options (label, label_az, sort_order, created_by, updated_by)
       VALUES ($2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM lead_extra_info_options), $4, $4)
       RETURNING ${OPTION_COLUMNS}`,
      [LOCKED_KEYS, label, labelAz, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    next(err);
  }
};

// PUT /api/telesales/extra-info-options/:id — admin; rename (the key stays, so leads keep the option)
exports.update = async (req, res, next) => {
  const { error, label, labelAz } = readLabels(req.body);
  if (error) return validationError(res, error);
  try {
    const { rows } = await pool.query(
      `UPDATE lead_extra_info_options
       SET label = $2, label_az = $3, updated_by = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING ${OPTION_COLUMNS}`,
      [LOCKED_KEYS, label, labelAz, req.user.id, req.params.id]
    );
    if (!rows.length) return notFound(res);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    if (err.code === '22P02') return notFound(res); // malformed UUID
    next(err);
  }
};

// PATCH /api/telesales/extra-info-options/:id/status — admin; { is_active } (soft delete)
exports.setActive = async (req, res, next) => {
  if (typeof req.body?.is_active !== 'boolean') return validationError(res, 'is_active must be true or false');
  try {
    const { rows: current } = await pool.query('SELECT key FROM lead_extra_info_options WHERE id = $1', [req.params.id]);
    if (!current.length) return notFound(res);
    if (!req.body.is_active && LOCKED_KEYS.includes(current[0].key)) {
      return validationError(res, 'This option cannot be deactivated');
    }
    const { rows } = await pool.query(
      `UPDATE lead_extra_info_options
       SET is_active = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING ${OPTION_COLUMNS}`,
      [LOCKED_KEYS, req.body.is_active, req.user.id, req.params.id]
    );
    if (!rows.length) return notFound(res);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return duplicateError(res);
    if (err.code === '22P02') return notFound(res);
    next(err);
  }
};

// PATCH /api/telesales/extra-info-options/:id/move — admin; { direction: 'up' | 'down' }
// swaps the option with its neighbour and renumbers the whole list 1..n
exports.move = async (req, res, next) => {
  const direction = req.body?.direction;
  if (direction !== 'up' && direction !== 'down') return validationError(res, 'direction must be up or down');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: list } = await client.query(
      'SELECT id FROM lead_extra_info_options ORDER BY sort_order, label FOR UPDATE'
    );
    const ids = list.map(r => r.id);
    const from = ids.indexOf(req.params.id);
    if (from === -1) {
      await client.query('ROLLBACK');
      return notFound(res);
    }
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to >= 0 && to < ids.length) {
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await client.query(
        `UPDATE lead_extra_info_options o
         SET sort_order = n.pos, updated_by = $2, updated_at = NOW()
         FROM unnest($1::uuid[]) WITH ORDINALITY AS n(id, pos)
         WHERE o.id = n.id AND o.sort_order IS DISTINCT FROM n.pos`,
        [ids, req.user.id]
      );
    }
    const { rows } = await client.query(
      `SELECT ${OPTION_COLUMNS} FROM lead_extra_info_options ORDER BY sort_order, label`,
      [LOCKED_KEYS]
    );
    await client.query('COMMIT');
    res.json({ success: true, data: rows });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// Used by the lead create/update handlers: every key must be an active option, except keys the
// lead already had (an option deactivated later stays on the lead). Returns the unknown keys.
exports.findInvalidExtraInfo = async (client, keys, leadId) => {
  if (!keys.length) return [];
  const { rows } = await client.query(
    `SELECT k
     FROM unnest($1::text[]) AS k
     WHERE NOT EXISTS (SELECT 1 FROM lead_extra_info_options o WHERE o.key = k AND o.is_active)
       AND NOT (k = ANY(COALESCE((SELECT l.extra_info FROM telesales_leads l WHERE l.id = $2::uuid), '{}'::text[])))`,
    [keys, leadId]
  );
  return rows.map(r => r.k);
};
