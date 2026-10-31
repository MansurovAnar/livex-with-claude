const pool = require('../config/database');

const leadNotFound = (res) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });

const CALL_SELECT = `
  SELECT c.id, c.lead_id, c.called_at, c.note, c.created_at,
         c.answer_id, o.label AS answer,
         c.called_by, u.full_name AS called_by_name,
         cb.due_at AS callback_at, cb.completed_at AS callback_completed_at
  FROM lead_calls c
  JOIN call_answer_options o ON o.id = c.answer_id
  LEFT JOIN users u ON u.id = c.called_by
  LEFT JOIN lead_callbacks cb ON cb.call_id = c.id`;

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
// The call closes the lead's open callback (whoever scheduled it); an optional
// callback_at schedules a new one owned by the caller.
exports.createCall = async (req, res, next) => {
  const { answer_id, answer, note, called_at, callback_at } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Row lock: two calls logged at once for the same lead are serialised, so its callbacks stay consistent
    const { rows: lead } = await client.query('SELECT 1 FROM telesales_leads WHERE id = $1 FOR UPDATE', [req.params.id]);
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
    const callId = rows[0].id;
    const { rowCount: callbacksCompleted } = await client.query(
      `UPDATE lead_callbacks SET completed_at = NOW(), completed_call_id = $2
       WHERE lead_id = $1 AND completed_at IS NULL`,
      [req.params.id, callId]
    );
    if (callback_at) {
      await client.query(
        `INSERT INTO lead_callbacks (lead_id, call_id, scheduled_by, due_at)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, callId, req.user.id, callback_at]
      );
    }
    const { rows: full } = await client.query(`${CALL_SELECT} WHERE c.id = $1`, [callId]);
    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      data: { ...full[0], answer_created: answerCreated, callbacks_completed: callbacksCompleted },
    });
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

const CALLBACK_SELECT = `
  SELECT cb.id, cb.lead_id, cb.due_at, cb.created_at,
         cb.scheduled_by, su.full_name AS scheduled_by_name,
         l.first_name, l.last_name, l.class_level, s.name AS school_name,
         p.phone_number AS primary_phone, p.owner_label AS primary_phone_owner,
         o.label AS answer, c.note
  FROM lead_callbacks cb
  JOIN telesales_leads l ON l.id = cb.lead_id
  JOIN schools s ON s.id = l.school_id
  LEFT JOIN lead_phones p ON p.lead_id = l.id AND p.is_primary
  LEFT JOIN users su ON su.id = cb.scheduled_by
  LEFT JOIN lead_calls c ON c.id = cb.call_id
  LEFT JOIN call_answer_options o ON o.id = c.answer_id`;

// Leads in the "phone numbers are invalid" section can't be called, so their callbacks wait until restored
const OPEN_CALLBACK = 'cb.completed_at IS NULL AND NOT l.is_phone_invalid';

// GET /api/telesales/callbacks — open callbacks of all telesales users, soonest first
// (the client groups them into overdue / today / upcoming in its own time zone). ?mine=true → only the caller's.
exports.listCallbacks = async (req, res, next) => {
  try {
    const values = [];
    let where = OPEN_CALLBACK;
    if (req.query.mine === 'true') {
      values.push(req.user.id);
      where += ` AND cb.scheduled_by = $${values.length}`;
    }
    const { rows } = await pool.query(
      `${CALLBACK_SELECT} WHERE ${where} ORDER BY cb.due_at, l.last_name, l.first_name LIMIT 500`,
      values
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/telesales/callbacks/count?until=<ISO> — open callbacks due by `until` (the end of the
// caller's day: overdue + due today) for the sidebar badge. Defaults to now (overdue only).
exports.countDueCallbacks = async (req, res, next) => {
  try {
    const until = new Date(typeof req.query.until === 'string' ? req.query.until : NaN);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM lead_callbacks cb JOIN telesales_leads l ON l.id = cb.lead_id
       WHERE ${OPEN_CALLBACK} AND cb.due_at <= COALESCE($1::timestamptz, NOW())`,
      [Number.isNaN(until.getTime()) ? null : until.toISOString()]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
