const pool = require('../config/database');

const leadNotFound = (res) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });

const CALL_SELECT = `
  SELECT c.id, c.lead_id, c.called_at, c.note, c.created_at,
         c.answer_id, o.label AS answer,
         c.called_by, u.full_name AS called_by_name
  FROM lead_calls c
  JOIN call_answer_options o ON o.id = c.answer_id
  LEFT JOIN users u ON u.id = c.called_by`;

// GET /api/telesales/answer-options — answers shared by all telesales users
exports.listAnswerOptions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, label FROM call_answer_options ORDER BY LOWER(label)'
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/telesales/leads/:id/calls — full call history, newest first
exports.listCalls = async (req, res, next) => {
  try {
    const { rows: lead } = await pool.query('SELECT 1 FROM telesales_leads WHERE id = $1', [req.params.id]);
    if (!lead.length) return leadNotFound(res);
    const { rows } = await pool.query(
      `${CALL_SELECT}
       WHERE c.lead_id = $1
       ORDER BY c.called_at DESC, c.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    if (err.code === '22P02') return leadNotFound(res); // malformed UUID
    next(err);
  }
};

// POST /api/telesales/leads/:id/calls — log a call. A typed answer that matches
// no existing option (case-insensitive) is saved as a new shared option.
exports.createCall = async (req, res, next) => {
  const { answer_id, answer, note, called_at } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: lead } = await client.query('SELECT 1 FROM telesales_leads WHERE id = $1', [req.params.id]);
    if (!lead.length) {
      await client.query('ROLLBACK');
      return leadNotFound(res);
    }

    let answerId = answer_id;
    let answerCreated = false;
    if (!answerId) {
      const { rows: inserted } = await client.query(
        `INSERT INTO call_answer_options (label, created_by)
         VALUES ($1, $2)
         ON CONFLICT (LOWER(BTRIM(label))) DO NOTHING
         RETURNING id`,
        [answer, req.user.id]
      );
      if (inserted.length) {
        answerId = inserted[0].id;
        answerCreated = true;
      } else {
        const { rows: existing } = await client.query(
          'SELECT id FROM call_answer_options WHERE LOWER(BTRIM(label)) = LOWER(BTRIM($1))',
          [answer]
        );
        answerId = existing[0].id;
      }
    }

    const { rows } = await client.query(
      `INSERT INTO lead_calls (lead_id, called_by, called_at, answer_id, note)
       VALUES ($1, $2, COALESCE($3::timestamptz, NOW()), $4, $5)
       RETURNING id`,
      [req.params.id, req.user.id, called_at, answerId, note]
    );
    const { rows: full } = await client.query(`${CALL_SELECT} WHERE c.id = $1`, [rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { ...full[0], answer_created: answerCreated } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '22P02') return leadNotFound(res);
    if (err.code === '23503') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Selected answer no longer exists' } });
    }
    next(err);
  } finally {
    client.release();
  }
};
