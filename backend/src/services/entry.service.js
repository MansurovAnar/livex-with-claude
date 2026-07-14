const pool = require('../config/database');
const { broadcast } = require('../sockets/entrySocket');

async function verifyAndLog({ exam_id, student_number, event_type, device_info, notes, checked_by }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch exam
    const { rows: examRows } = await client.query(
      'SELECT * FROM exams WHERE id = $1 AND is_active = true',
      [exam_id]
    );
    const exam = examRows[0];
    if (!exam) {
      return { allowed: false, reason: 'EXAM_NOT_FOUND' };
    }
    if (exam.status === 'cancelled') {
      return { allowed: false, reason: 'EXAM_CANCELLED' };
    }

    const now = new Date();
    if (now < new Date(exam.entry_opens_at) || now > new Date(exam.entry_closes_at)) {
      return { allowed: false, reason: 'ENTRY_WINDOW_CLOSED' };
    }

    // 2. Fetch student + registration
    const { rows: studentRows } = await client.query(
      `SELECT s.*, r.id AS registration_id, r.seat_number
       FROM students s
       JOIN registrations r ON r.student_id = s.id AND r.exam_id = $1
       WHERE s.student_number = $2 AND s.is_active = true`,
      [exam_id, student_number]
    );
    const student = studentRows[0];
    if (!student) {
      await client.query('ROLLBACK');
      return { allowed: false, reason: 'NOT_REGISTERED' };
    }

    // 3. Check current presence from last log event
    const { rows: lastLog } = await client.query(
      `SELECT event_type FROM entry_logs
       WHERE exam_id = $1 AND student_id = $2
       ORDER BY logged_at DESC LIMIT 1`,
      [exam_id, student.id]
    );
    const lastEvent = lastLog[0]?.event_type;

    if (event_type === 'entry' && lastEvent === 'entry') {
      await client.query('ROLLBACK');
      return { allowed: false, reason: 'ALREADY_INSIDE', student };
    }
    if (event_type === 'exit' && lastEvent !== 'entry') {
      await client.query('ROLLBACK');
      return { allowed: false, reason: 'NOT_INSIDE', student };
    }

    // 4. Log the event
    const { rows: logRows } = await client.query(
      `INSERT INTO entry_logs (exam_id, student_id, registration_id, event_type, checked_by, device_info, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, logged_at`,
      [exam_id, student.id, student.registration_id, event_type, checked_by, device_info || null, notes || null]
    );

    await client.query('COMMIT');

    const logEntry = logRows[0];

    // 5. Broadcast via WebSocket
    broadcast(exam_id, {
      type: 'entry_event',
      data: {
        student_name: student.full_name,
        seat_number: student.seat_number,
        event_type,
        logged_at: logEntry.logged_at,
      },
    });

    return {
      allowed: true,
      reason: 'OK',
      student: {
        full_name: student.full_name,
        photo_url: student.photo_url,
        seat_number: student.seat_number,
      },
      entry_log_id: logEntry.id,
      logged_at: logEntry.logged_at,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { verifyAndLog };
