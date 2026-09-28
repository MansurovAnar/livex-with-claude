# Backend Dev Skill — backend-dev

You are a backend developer working on the **Exam Entrance Control System** — a Node.js/Express API.

## Dev Server

```bash
cd backend && npm run dev     # nodemon, auto-reload on change (port 4000)
cd backend && npm start       # production
cd backend && npm run migrate # apply pending SQL migrations
cd backend && npm run seed    # seed default admin user
```

## Stack & Constraints

- **Node.js / Express** — CommonJS (`require`/`module.exports`) throughout — never use ESM `import`
- **PostgreSQL** via `pg` pool (`backend/src/config/database.js`) — raw SQL only, no ORM
- **Zod** for request body validation (`backend/src/validators/`)
- **JWT** — access token (Bearer) + refresh token (HTTP-only cookie) via `jsonwebtoken`
- **bcrypt** — never pass hashes through the shell ($ interpolation corrupts them); use a Node.js script
- **No test files** — do not create `*.test.js` or `*.spec.js` files

## File Layout

```
backend/src/
  config/
    app.js          # Express app, all routes mounted here
    database.js     # pg Pool singleton
    jwt.js          # access/refresh secrets + expiry
  controllers/      # One file per resource: exams.controller.js, students.controller.js, ...
  routes/           # One file per resource: exams.routes.js, ...
  middleware/
    authenticate.js # Verifies Bearer JWT → sets req.user
    authorize.js    # Role gate: authorize('admin', 'reception')
    validate.js     # Zod middleware: validate(schema)
    errorHandler.js # Last-resort error handler
  validators/       # Zod schemas: exam.validator.js, student.validator.js, ...
  services/         # Complex business logic extracted from controllers
  utils/
    pagination.js   # parsePagination(req.query) → { page, limit, offset }
    logger.js
  db/
    migrations/     # NNN_description.sql — applied in sort order
    seeds/          # run.js
  sockets/
    entrySocket.js  # WebSocket server, authenticated via ?token=
```

## Response Envelope

All responses follow this shape — never deviate:

```js
// Success
res.json({ success: true, data: rows[0] });
res.status(201).json({ success: true, data: rows[0] });
res.json({ success: true, data: rows, meta: { page, limit } });

// Error (never throw in a controller — use next(err) or inline)
res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '...', details: {} } });
res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: '...' } });
```

## Controller Pattern

```js
const pool = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows } = await pool.query(
      `SELECT * FROM things WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ success: true, data: rows, meta: { page, limit } });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM things WHERE id = $1 AND is_active = true`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Thing not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;  // already validated by Zod middleware
    const { rows } = await pool.query(
      `INSERT INTO things (name, created_by) VALUES ($1, $2) RETURNING *`,
      [name, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'description'];
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE things SET ${fields.join(', ')} WHERE id = $${i} AND is_active = true RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Thing not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.query('UPDATE things SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};
```

**Soft-delete convention**: set `is_active = false`, never `DELETE` rows unless the table has no `is_active` column (e.g., `registrations`).

## Transaction Pattern

Use `pool.connect()` for multi-statement transactions. Always release the client in `finally`.

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const { rows } = await client.query(`UPDATE things SET ... WHERE id = $1 RETURNING *`, [id]);
  await client.query(`UPDATE other_table SET ... WHERE id = $1`, [otherId]);
  await client.query('COMMIT');
  res.json({ success: true, data: rows[0] });
} catch (err) {
  await client.query('ROLLBACK');
  next(err);
} finally {
  client.release();
}
```

## Handling Postgres Constraint Errors

```js
} catch (err) {
  if (err.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Already exists' } });
  next(err);
}
```

Common pg error codes: `23505` unique violation, `23503` foreign key violation, `23502` not null violation.

## Route Pattern

```js
const router = require('express').Router();
const ctrl = require('../controllers/things.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createThingSchema, updateThingSchema } = require('../validators/thing.validator');

router.use(authenticate);                                       // all routes require auth
router.get('/', authorize('admin', 'reception'), ctrl.list);
router.get('/:id', authorize('admin', 'reception'), ctrl.get);
router.post('/', authorize('admin'), validate(createThingSchema), ctrl.create);
router.put('/:id', authorize('admin'), validate(updateThingSchema), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
```

Register in `backend/src/config/app.js`:
```js
const thingRoutes = require('../routes/things.routes');
app.use('/api/things', thingRoutes);
```

## Validator Pattern (Zod)

```js
const { z } = require('zod');

exports.createThingSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  cost: z.number().min(0).default(0),
  scheduled_at: z.string().datetime(),
});

exports.updateThingSchema = exports.createThingSchema.partial();
```

`validate(schema)` replaces `req.body` with `result.data` (Zod-coerced), so defaults and transforms are applied before the controller runs.

## Auth & Roles

```js
// In a controller, req.user is set by authenticate middleware:
req.user.id    // UUID of the authenticated user
req.user.role  // 'admin' | 'reception' | 'security' | 'partner' | 'viewer'
```

Role capabilities:
| Role | Key access |
|------|-----------|
| `admin` | Full CRUD on all resources |
| `reception` | Read students/exams, register, mark payments |
| `security` | Entry gate check-in only |
| `partner` | Own students + filtered exams only |
| `viewer` | Read-only monitor |

## Pagination

```js
const parsePagination = require('../utils/pagination');

const { page, limit, offset } = parsePagination(req.query);
// page: min 1, limit: 1–100 (default 20), offset computed
// Pass limit/offset to SQL, return meta: { page, limit } in response
```

## Dynamic Filter Queries

Build conditions array to avoid SQL injection when filters are optional:

```js
const conditions = ['is_active = true'];
const values = [];
let i = 1;
if (req.query.status) { conditions.push(`status = $${i++}`); values.push(req.query.status); }
if (req.query.date)   { conditions.push(`scheduled_at::date = $${i++}`); values.push(req.query.date); }
const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
values.push(limit, offset);
await pool.query(`SELECT * FROM things ${where} LIMIT $${i++} OFFSET $${i}`, values);
```

## Adding a New Resource

1. Create `backend/src/validators/thing.validator.js` with Zod schemas
2. Create `backend/src/controllers/things.controller.js` with CRUD handlers
3. Create `backend/src/routes/things.routes.js` with authenticate + authorize + validate
4. Mount in `backend/src/config/app.js`: `app.use('/api/things', require('../routes/things.routes'))`
5. If schema changes needed: add a new migration file in `backend/src/db/migrations/` and run `npm run migrate`

## WebSocket (Entry Monitor)

`backend/src/sockets/entrySocket.js` — attached to the HTTP server in `backend/src/server.js`.
- Auth: `?token=<accessToken>` query param on upgrade
- Client subscribes: `{ type: 'subscribe', exam_id }`
- Entry events broadcast to exam room subscribers when security scans a student

To emit from a controller: import and call the broadcast helper from `entrySocket.js`.
