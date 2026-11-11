const pool = require('../config/database');
const { getExamPayments } = require('../services/examPayments.service');

exports.examMonitor = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const { rows: examRows } = await pool.query(
      `SELECT * FROM exams WHERE id = $1`,
      [examId]
    );
    if (!examRows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM registrations WHERE exam_id = $1 AND removed_at IS NULL', [examId]
    );

    // currently inside = students whose last event is 'entry'
    const { rows: insideRows } = await pool.query(
      `SELECT COUNT(DISTINCT el.student_id)
       FROM entry_logs el
       WHERE el.exam_id = $1
         AND el.event_type = 'entry'
         AND NOT EXISTS (
           SELECT 1 FROM entry_logs el2
           WHERE el2.exam_id = el.exam_id AND el2.student_id = el.student_id
             AND el2.logged_at > el.logged_at AND el2.event_type = 'exit'
         )`,
      [examId]
    );

    const { rows: recentLogs } = await pool.query(
      `SELECT el.event_type, el.logged_at, el.notes, r.seat_number, r.room_number,
              s.full_name AS student_name, s.student_number,
              u.full_name AS checked_by_name
       FROM entry_logs el
       JOIN students s ON s.id = el.student_id
       JOIN registrations r ON r.id = el.registration_id
       JOIN users u ON u.id = el.checked_by
       WHERE el.exam_id = $1
       ORDER BY el.logged_at DESC LIMIT 50`,
      [examId]
    );

    // Money figures are admin-only; viewers get the same response without them
    const payments = req.user.role === 'admin' ? await getExamPayments(examId) : undefined;

    // Exam-paper breakdown (admin + reception): active registrants per (detail,) class, sector, language
    let paper_breakdown;
    if (req.user.role === 'admin' || req.user.role === 'reception') {
      const { rows: typeRows } = await pool.query(
        `SELECT COALESCE(cardinality(et.extra_details), 0) > 0 AS has_details
         FROM exams e LEFT JOIN exam_types et ON et.id = e.exam_type_id
         WHERE e.id = $1`,
        [examId]
      );
      const { rows: breakdownRows } = await pool.query(
        `SELECT NULLIF(r.extra_detail, '') AS extra_detail, s.class_level,
                NULLIF(s.sector, '') AS sector, NULLIF(s.language, '') AS language,
                COUNT(*)::int AS count
         FROM registrations r
         JOIN students s ON s.id = r.student_id
         WHERE r.exam_id = $1 AND r.removed_at IS NULL
         GROUP BY 1, 2, 3, 4
         ORDER BY 1 NULLS LAST, 2 NULLS LAST, 3 NULLS LAST, 4 NULLS LAST`,
        [examId]
      );
      paper_breakdown = {
        has_extra_details: !!typeRows[0]?.has_details || breakdownRows.some(r => r.extra_detail),
        rows: breakdownRows,
      };
    }

    res.json({
      success: true,
      data: {
        exam: examRows[0],
        payments,
        paper_breakdown,
        registered_count: parseInt(countRows[0].count, 10),
        currently_inside: parseInt(insideRows[0].count, 10),
        recent_logs: recentLogs,
      },
    });
  } catch (err) { next(err); }
};

exports.todayDashboard = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, status, scheduled_at, exam_location,
              (SELECT COUNT(*) FROM registrations WHERE exam_id = e.id AND removed_at IS NULL) AS registered_count
       FROM exams e
       WHERE e.scheduled_at::date = CURRENT_DATE AND e.is_active = true
       ORDER BY e.scheduled_at`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
