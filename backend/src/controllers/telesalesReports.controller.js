const pool = require('../config/database');

// Report days are cut on Baku time, whatever the server's time zone is
const TZ = 'Asia/Baku';
const MAX_RANGE_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const badRequest = (res, message) =>
  res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } });

const isRealDate = (s) => {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// null user ids (user removed) are grouped under '' so they still add up
const key = (id) => id || '';

/**
 * GET /api/telesales/reports?from=YYYY-MM-DD&to=YYYY-MM-DD[&agent_id=<uuid>][&group=day|week]
 * Admin only. `from`/`to` are inclusive Baku-time days. `agent_id` limits every section to one
 * user (calls made, leads added, invalid marks, callbacks owned). `group` adds a per-day or
 * per-week breakdown of calls.
 */
exports.report = async (req, res, next) => {
  const { from, to } = req.query;
  const agentId = req.query.agent_id || null;
  const group = req.query.group || null;

  if (!isRealDate(from || '') || !isRealDate(to || '')) return badRequest(res, 'Choose a valid date range');
  if (from > to) return badRequest(res, 'The start date must be before the end date');
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  if (days > MAX_RANGE_DAYS) return badRequest(res, 'The date range can be at most 366 days');
  if (agentId && !UUID_RE.test(agentId)) return badRequest(res, 'Unknown agent');
  if (group && group !== 'day' && group !== 'week') return badRequest(res, 'Group must be day or week');

  try {
    const { rows: [bounds] } = await pool.query(
      `SELECT ($1::date)::timestamp AT TIME ZONE '${TZ}' AS start_at,
              ($2::date + 1)::timestamp AT TIME ZONE '${TZ}' AS end_at,
              ((NOW() AT TIME ZONE '${TZ}')::date + 1)::timestamp AT TIME ZONE '${TZ}' AS today_end`,
      [from, to]
    );
    const range = [bounds.start_at, bounds.end_at, agentId];

    const [agentsQ, callTotalsQ, callAnswersQ, periodsQ, leadsQ, statusQ, invalidNowQ, openCbQ, rangeCbQ] = await Promise.all([
      // Everyone who can appear in the report: telesales users + anyone else with telesales activity
      pool.query(
        `SELECT u.id, u.full_name, u.role, u.is_active
         FROM users u
         WHERE u.role = 'telesales'
            OR EXISTS (SELECT 1 FROM lead_calls c WHERE c.called_by = u.id)
            OR EXISTS (SELECT 1 FROM telesales_leads l WHERE l.created_by = u.id)
            OR EXISTS (SELECT 1 FROM lead_callbacks cb WHERE cb.scheduled_by = u.id)
            OR EXISTS (SELECT 1 FROM lead_phone_status_events e WHERE e.changed_by = u.id)
         ORDER BY u.full_name`
      ),
      // Calls per agent + the overall row (GROUPING = 1), so distinct counts are exact for the total too
      pool.query(
        `SELECT GROUPING(c.called_by) AS is_total, c.called_by AS agent_id,
                COUNT(*)::int AS calls,
                COUNT(DISTINCT c.lead_id)::int AS leads_called,
                COUNT(DISTINCT (c.called_at AT TIME ZONE '${TZ}')::date)::int AS days_active
         FROM lead_calls c
         WHERE c.called_at >= $1 AND c.called_at < $2 AND ($3::uuid IS NULL OR c.called_by = $3)
         GROUP BY GROUPING SETS ((c.called_by), ())`,
        range
      ),
      // Agent × answer matrix
      pool.query(
        `SELECT c.called_by AS agent_id, c.answer_id, o.label, COUNT(*)::int AS calls
         FROM lead_calls c
         JOIN call_answer_options o ON o.id = c.answer_id
         WHERE c.called_at >= $1 AND c.called_at < $2 AND ($3::uuid IS NULL OR c.called_by = $3)
         GROUP BY c.called_by, c.answer_id, o.label`,
        range
      ),
      // Calls per agent per day / week (weeks start on Monday)
      group
        ? pool.query(
          `SELECT to_char(date_trunc('${group}', c.called_at AT TIME ZONE '${TZ}'), 'YYYY-MM-DD') AS period_start,
                  c.called_by AS agent_id, c.answer_id, COUNT(*)::int AS calls
           FROM lead_calls c
           WHERE c.called_at >= $1 AND c.called_at < $2 AND ($3::uuid IS NULL OR c.called_by = $3)
           GROUP BY 1, c.called_by, c.answer_id`,
          range
        )
        : Promise.resolve({ rows: [] }),
      // Leads added per agent
      pool.query(
        `SELECT l.created_by AS agent_id, COUNT(*)::int AS leads_added
         FROM telesales_leads l
         WHERE l.created_at >= $1 AND l.created_at < $2 AND ($3::uuid IS NULL OR l.created_by = $3)
         GROUP BY l.created_by`,
        range
      ),
      // Marked invalid / restored per agent
      pool.query(
        `SELECT e.changed_by AS agent_id,
                COUNT(*) FILTER (WHERE e.is_phone_invalid)::int AS marked_invalid,
                COUNT(*) FILTER (WHERE NOT e.is_phone_invalid)::int AS restored
         FROM lead_phone_status_events e
         WHERE e.changed_at >= $1 AND e.changed_at < $2 AND ($3::uuid IS NULL OR e.changed_by = $3)
         GROUP BY e.changed_by`,
        range
      ),
      // Leads in "Phone numbers are invalid" right now (not tied to the range or agent)
      pool.query('SELECT COUNT(*)::int AS n FROM telesales_leads WHERE is_phone_invalid'),
      // Open callbacks as of now, per owner (same rule as the Callbacks tab: invalid leads hidden)
      pool.query(
        `SELECT cb.scheduled_by AS agent_id,
                COUNT(*) FILTER (WHERE cb.due_at < NOW())::int AS overdue,
                COUNT(*) FILTER (WHERE cb.due_at >= NOW() AND cb.due_at < $1)::int AS due_today,
                COUNT(*) FILTER (WHERE cb.due_at >= $1)::int AS upcoming
         FROM lead_callbacks cb
         JOIN telesales_leads l ON l.id = cb.lead_id
         WHERE cb.completed_at IS NULL AND NOT l.is_phone_invalid
           AND ($2::uuid IS NULL OR cb.scheduled_by = $2)
         GROUP BY cb.scheduled_by`,
        [bounds.today_end, agentId]
      ),
      // Callbacks scheduled within the range, per owner: completed vs still open
      pool.query(
        `SELECT cb.scheduled_by AS agent_id,
                COUNT(*)::int AS scheduled,
                COUNT(*) FILTER (WHERE cb.completed_at IS NOT NULL)::int AS completed,
                COUNT(*) FILTER (WHERE cb.completed_at IS NULL)::int AS still_open
         FROM lead_callbacks cb
         WHERE cb.created_at >= $1 AND cb.created_at < $2 AND ($3::uuid IS NULL OR cb.scheduled_by = $3)
         GROUP BY cb.scheduled_by`,
        range
      ),
    ]);

    const agents = agentsQ.rows;
    const byId = new Map(agents.map(a => [a.id, a]));
    if (agentId && !byId.has(agentId)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown agent' } });
    }

    // One row per agent; rows are created on demand so anyone with activity shows up
    const rows = new Map();
    const row = (id) => {
      const k = key(id);
      if (!rows.has(k)) {
        const a = byId.get(id);
        rows.set(k, {
          agent_id: id || null, agent_name: a ? a.full_name : null, role: a ? a.role : null, is_active: a ? a.is_active : null,
          calls: 0, leads_called: 0, days_active: 0, avg_per_day: 0, answers: {},
          leads_added: 0, marked_invalid: 0, restored: 0,
          callbacks_overdue: 0, callbacks_due_today: 0, callbacks_upcoming: 0,
          callbacks_scheduled: 0, callbacks_completed: 0, callbacks_still_open: 0,
        });
      }
      return rows.get(k);
    };

    // Agents with no activity are still listed: every active telesales user, or the chosen agent
    if (agentId) row(agentId);
    else agents.filter(a => a.role === 'telesales' && a.is_active).forEach(a => row(a.id));

    const totals = { calls: 0, leads_called: 0, days_active: 0 };
    callTotalsQ.rows.forEach(r => {
      if (r.is_total) { Object.assign(totals, { calls: r.calls, leads_called: r.leads_called, days_active: r.days_active }); return; }
      Object.assign(row(r.agent_id), {
        calls: r.calls, leads_called: r.leads_called, days_active: r.days_active,
        avg_per_day: r.days_active ? Math.round((r.calls / r.days_active) * 10) / 10 : 0,
      });
    });

    const answerTotals = new Map();
    callAnswersQ.rows.forEach(r => {
      row(r.agent_id).answers[r.answer_id] = r.calls;
      const a = answerTotals.get(r.answer_id) || { id: r.answer_id, label: r.label, count: 0 };
      a.count += r.calls;
      answerTotals.set(r.answer_id, a);
    });
    const answers = [...answerTotals.values()]
      .map(a => ({ ...a, pct: totals.calls ? Math.round((a.count / totals.calls) * 1000) / 10 : 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    leadsQ.rows.forEach(r => { row(r.agent_id).leads_added = r.leads_added; });
    statusQ.rows.forEach(r => Object.assign(row(r.agent_id), { marked_invalid: r.marked_invalid, restored: r.restored }));
    openCbQ.rows.forEach(r => Object.assign(row(r.agent_id), {
      callbacks_overdue: r.overdue, callbacks_due_today: r.due_today, callbacks_upcoming: r.upcoming,
    }));
    rangeCbQ.rows.forEach(r => Object.assign(row(r.agent_id), {
      callbacks_scheduled: r.scheduled, callbacks_completed: r.completed, callbacks_still_open: r.still_open,
    }));

    const perAgent = [...rows.values()].sort((a, b) =>
      b.calls - a.calls || (a.agent_name || '￿').localeCompare(b.agent_name || '￿'));

    const sum = (field) => perAgent.reduce((s, r) => s + r[field], 0);

    // Per-period rows: one per (period, agent), newest period first
    const periodMap = new Map();
    periodsQ.rows.forEach(r => {
      const start = r.period_start;
      const k = `${start}|${key(r.agent_id)}`;
      if (!periodMap.has(k)) {
        const a = byId.get(r.agent_id);
        periodMap.set(k, { period_start: start, agent_id: r.agent_id || null, agent_name: a ? a.full_name : null, calls: 0, answers: {} });
      }
      const p = periodMap.get(k);
      p.calls += r.calls;
      p.answers[r.answer_id] = r.calls;
    });
    const periods = [...periodMap.values()].sort((a, b) =>
      b.period_start.localeCompare(a.period_start) || b.calls - a.calls);

    res.json({
      success: true,
      data: {
        range: { from, to, timezone: TZ, group, agent_id: agentId },
        agents,
        summary: {
          calls: totals.calls,
          leads_called: totals.leads_called,
          days_active: totals.days_active,
          leads_added: sum('leads_added'),
          marked_invalid: sum('marked_invalid'),
          restored: sum('restored'),
          invalid_now: invalidNowQ.rows[0].n,
          callbacks_overdue: sum('callbacks_overdue'),
          callbacks_due_today: sum('callbacks_due_today'),
          callbacks_upcoming: sum('callbacks_upcoming'),
          callbacks_scheduled: sum('callbacks_scheduled'),
          callbacks_completed: sum('callbacks_completed'),
          callbacks_still_open: sum('callbacks_still_open'),
        },
        answers,
        per_agent: perAgent,
        periods,
      },
    });
  } catch (err) { next(err); }
};
