const pool = require('../config/database');
const parsePagination = require('../utils/pagination');

const notFound = (res) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });

const digitsOf = (phone) => phone.replace(/\D/g, '');

// Full lead with school / village names, author names and phones (primary first, then in entry order)
const LEAD_DETAIL_SQL = `
  SELECT l.*,
         s.name AS school_name,
         v.name AS village_name,
         cu.full_name AS created_by_name,
         uu.full_name AS updated_by_name,
         COALESCE(
           (SELECT json_agg(json_build_object(
                     'id', p.id, 'phone_number', p.phone_number,
                     'owner_label', p.owner_label, 'is_primary', p.is_primary)
                   ORDER BY p.is_primary DESC, p.created_at)
            FROM lead_phones p WHERE p.lead_id = l.id),
           '[]'::json) AS phones
  FROM telesales_leads l
  JOIN schools s ON s.id = l.school_id
  LEFT JOIN villages v ON v.id = l.village_id
  LEFT JOIN users cu ON cu.id = l.created_by
  LEFT JOIN users uu ON uu.id = l.updated_by
  WHERE l.id = $1`;

const LEAD_COLUMNS = [
  'first_name', 'last_name', 'father_name', 'parent_name', 'parent_relation',
  'school_id', 'village_id', 'class_level', 'sector', 'language', 'income_source',
  'extra_info', 'another_student_class', 'extra_info_other',
  'knows_hedef_student', 'hedef_student_name',
];

// Returns a 409 response if one of the phones already belongs to another lead
async function rejectDuplicatePhone(client, res, phones, leadId) {
  const { rows } = await client.query(
    `SELECT p.phone_digits, l.id, l.first_name, l.last_name
     FROM lead_phones p
     JOIN telesales_leads l ON l.id = p.lead_id
     WHERE p.phone_digits = ANY($1::text[])
       AND ($2::uuid IS NULL OR p.lead_id <> $2::uuid)
     LIMIT 1`,
    [phones.map(p => digitsOf(p.phone_number)), leadId]
  );
  if (!rows.length) return false;
  const typed = phones.find(p => digitsOf(p.phone_number) === rows[0].phone_digits).phone_number;
  res.status(409).json({
    success: false,
    error: {
      code: 'DUPLICATE_PHONE',
      message: `Phone number ${typed} already belongs to ${rows[0].first_name} ${rows[0].last_name}`,
      details: { lead_id: rows[0].id },
    },
  });
  return true;
}

async function insertPhones(client, leadId, phones) {
  for (let i = 0; i < phones.length; i++) {
    // clock_timestamp() keeps the entry order (NOW() is the same for the whole transaction)
    await client.query(
      `INSERT INTO lead_phones (lead_id, phone_number, owner_label, is_primary, created_at)
       VALUES ($1, $2, $3, $4, clock_timestamp())`,
      [leadId, phones[i].phone_number, phones[i].owner_label, i === 0]
    );
  }
}

function handleWriteError(err, res, next) {
  if (err.code === '23505' && err.constraint === 'lead_phones_phone_digits_key') {
    return res.status(409).json({ success: false, error: { code: 'DUPLICATE_PHONE', message: 'This phone number already belongs to another lead' } });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Selected school or village no longer exists' } });
  }
  return next(err);
}

// GET /api/telesales/leads — paginated list with the latest call; ?q= searches name, phone or school; ?class_level, ?sector, ?language filter.
// Leads marked "phone number is not valid" are left out of the main list; ?invalid=true lists only those.
exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const invalid = req.query.invalid === 'true';
    const conditions = [`l.is_phone_invalid = ${invalid ? 'TRUE' : 'FALSE'}`];
    const values = [];
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      values.push(`%${q}%`);
      const like = `$${values.length}`;
      let phoneCond = '';
      const digits = digitsOf(q);
      if (digits) {
        values.push(`%${digits}%`);
        phoneCond = ` OR EXISTS (SELECT 1 FROM lead_phones sp WHERE sp.lead_id = l.id AND sp.phone_digits LIKE $${values.length})`;
      }
      conditions.push(`(l.first_name || ' ' || l.last_name ILIKE ${like} OR l.last_name || ' ' || l.first_name ILIKE ${like} OR s.name ILIKE ${like}${phoneCond})`);
    }
    const classLevel = parseInt(req.query.class_level, 10);
    if (classLevel >= 1 && classLevel <= 11) {
      values.push(classLevel);
      conditions.push(`l.class_level = $${values.length}`);
    }
    for (const field of ['sector', 'language']) {
      const v = typeof req.query[field] === 'string' ? req.query[field].trim() : '';
      if (v) {
        values.push(v);
        conditions.push(`l.${field} = $${values.length}`);
      }
    }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM telesales_leads l JOIN schools s ON s.id = l.school_id ${where}`,
      values
    );
    const { rows } = await pool.query(
      `SELECT l.id, l.first_name, l.last_name, l.class_level, l.sector, l.language,
              l.is_phone_invalid, l.created_at, l.updated_at,
              s.name AS school_name,
              p.phone_number AS primary_phone, p.owner_label AS primary_phone_owner,
              lc.called_at AS last_call_at, lc.answer AS last_answer,
              (SELECT COUNT(*)::int FROM lead_calls cc WHERE cc.lead_id = l.id) AS calls_count
       FROM telesales_leads l
       JOIN schools s ON s.id = l.school_id
       LEFT JOIN lead_phones p ON p.lead_id = l.id AND p.is_primary
       LEFT JOIN LATERAL (
         SELECT c.called_at, o.label AS answer
         FROM lead_calls c
         JOIN call_answer_options o ON o.id = c.answer_id
         WHERE c.lead_id = l.id
         ORDER BY c.called_at DESC, c.created_at DESC
         LIMIT 1
       ) lc ON true
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    const { rows: invalidRows } = await pool.query('SELECT COUNT(*) FROM telesales_leads WHERE is_phone_invalid');
    res.json({
      success: true,
      data: rows,
      meta: { page, limit, total: parseInt(countRows[0].count, 10), invalid_total: parseInt(invalidRows[0].count, 10) },
    });
  } catch (err) { next(err); }
};

// PATCH /api/telesales/leads/:id/phone-invalid — { is_phone_invalid: true } moves the lead to the
// "Phone numbers are invalid" section; false restores it to the main list
exports.setPhoneInvalid = async (req, res, next) => {
  const flag = req.body?.is_phone_invalid;
  if (typeof flag !== 'boolean') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'is_phone_invalid must be true or false' } });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE telesales_leads
       SET is_phone_invalid = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, first_name, last_name, is_phone_invalid`,
      [flag, req.user.id, req.params.id]
    );
    if (!rows.length) return notFound(res);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '22P02') return notFound(res); // malformed UUID
    next(err);
  }
};

// GET /api/telesales/leads/:id
exports.get = async (req, res, next) => {
  try {
    const { rows } = await pool.query(LEAD_DETAIL_SQL, [req.params.id]);
    if (!rows.length) return notFound(res);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '22P02') return notFound(res); // malformed UUID
    next(err);
  }
};

// POST /api/telesales/leads
exports.create = async (req, res, next) => {
  const lead = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (await rejectDuplicatePhone(client, res, lead.phones, null)) {
      await client.query('ROLLBACK');
      return;
    }
    const cols = [...LEAD_COLUMNS, 'created_by', 'updated_by'];
    const vals = [...LEAD_COLUMNS.map(c => lead[c]), req.user.id, req.user.id];
    const { rows } = await client.query(
      `INSERT INTO telesales_leads (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      vals
    );
    await insertPhones(client, rows[0].id, lead.phones);
    const { rows: full } = await client.query(LEAD_DETAIL_SQL, [rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: full[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleWriteError(err, res, next);
  } finally {
    client.release();
  }
};

// PUT /api/telesales/leads/:id — replaces the lead's fields and phone list
exports.update = async (req, res, next) => {
  const lead = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sets = LEAD_COLUMNS.map((c, i) => `${c} = $${i + 1}`);
    const { rows } = await client.query(
      `UPDATE telesales_leads
       SET ${sets.join(', ')}, updated_by = $${LEAD_COLUMNS.length + 1}, updated_at = NOW()
       WHERE id = $${LEAD_COLUMNS.length + 2}
       RETURNING id`,
      [...LEAD_COLUMNS.map(c => lead[c]), req.user.id, req.params.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return notFound(res);
    }
    if (await rejectDuplicatePhone(client, res, lead.phones, req.params.id)) {
      await client.query('ROLLBACK');
      return;
    }
    await client.query('DELETE FROM lead_phones WHERE lead_id = $1', [req.params.id]);
    await insertPhones(client, req.params.id, lead.phones);
    const { rows: full } = await client.query(LEAD_DETAIL_SQL, [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, data: full[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '22P02') return notFound(res);
    handleWriteError(err, res, next);
  } finally {
    client.release();
  }
};
