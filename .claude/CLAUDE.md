# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Exam Entrance Control System** — A full-stack web application for managing exam registrations and controlling physical entry to exam venues.

- **Backend**: Node.js/Express (CommonJS), PostgreSQL via `pg`, port 4000
- **Frontend**: React 18 + Vite (ESM), React Router v6, Axios, port 5173
- **Database**: PostgreSQL running in Docker (`livex-with-claude-postgres-1`, host port 5432)

## Commands

### Backend (`/backend`)
```bash
npm run dev       # Start with nodemon (auto-reload)
npm start         # Production start
npm run migrate   # Run SQL migrations (sequential, tracked in schema_migrations table)
npm run seed      # Seed default admin user
```

### Frontend (`/frontend`)
```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
```

### Database
```bash
# Connect to Docker Postgres container directly
docker exec -it livex-with-claude-postgres-1 psql -U examadmin -d examdb

# IMPORTANT: Never pass bcrypt hashes via shell — use a Node.js script instead
# (shell interpolates $ signs in hashes, corrupting them)
```

## Architecture

### Authentication Flow
- JWT access token stored in `localStorage` (short-lived) + refresh token in HTTP-only cookie
- `authenticate` middleware verifies Bearer token on every protected route
- `authorize(...roles)` middleware checks `req.user.role` against allowed roles
- Frontend `AuthContext` hydrates user on page load via `GET /api/auth/me`
- Login redirects by role: admin→`/admin`, security→`/security`, reception→`/reception`, partner→`/partner`, viewer→`/monitor`

### User Roles & Their Sections
| Role | Root Path | Key Capabilities |
|------|-----------|-----------------|
| `admin` | `/admin` | Full control: exams, students, users, partners, schools, monitoring |
| `reception` | `/reception` | Search/add students, register to exams, view partners, mark payments |
| `security` | `/security` | Scan students for entry at exam gate |
| `partner` | `/partner` | Manage own school's students, register to filtered exams, view payments/bonus |
| `viewer` | `/monitor/:examId` | Read-only live entry monitor |

### Backend Route Structure
All routes mounted in `backend/src/config/app.js` under `/api/`:
- `/api/auth` — login, logout, refresh, me
- `/api/users` — admin-only CRUD
- `/api/students` — admin+reception read/create; admin-only update/delete
- `/api/exams` — admin CRUD; shared read for security/reception
- `/api/exams/:examId/registrations` — register students, list registrants (admin+reception)
- `/api/registrations/:id` — payment update (PATCH), deregister (DELETE)
- `/api/entry` — security gate check-in
- `/api/monitor` — live entry data for viewer role
- `/api/partners` — admin+reception: list partners, view partner exams/students, bonus management
- `/api/partner` — partner self-service: own students, available exams, registration, payments
- `/api/schools` — admin-only school management

### Database Migrations
Files in `backend/src/db/migrations/` are named `NNN_description.sql` and applied in sort order. The `schema_migrations` table tracks which have been applied — never edit an applied migration, always create a new one.

Key tables and their notable columns:
- `users` — `role` (enum: admin/security/viewer/reception/partner), `is_active`
- `partner_profiles` — `user_id→users`, `school`, `school_address`, `number_of_students`, `bonus_balance`
- `students` — `partner_id→users` (null for reception-registered), `mobile_number`, `class_level`, `sector`, `language`
- `exams` — `exam_location` (school name or "General"), `exam_cost`, `commission_amount`, `status` (enum: scheduled/ongoing/completed/cancelled)
- `registrations` — `amount_paid`, `bonus_awarded` (bool, triggers partner bonus increment), `room_number`, `seat_number`
- `partner_bonus_payments` — tracks admin payouts to partners (decrements `bonus_balance`)
- `schools` — `assigned_to→users` (partner), soft-deleted via `is_active`

### Payment & Bonus Logic
When reception marks a registration as fully paid (`amount_paid >= exam_cost`):
- `registrations.controller.js` runs a transaction: sets `bonus_awarded = true` on the registration AND increments `partner_profiles.bonus_balance` by the exam's `commission_amount` — but only if the student has a `partner_id` and `bonus_awarded` was previously false.
- Admin can record bonus payouts via `POST /api/partners/:partnerId/bonus/payments` which decrements `bonus_balance` and inserts into `partner_bonus_payments`.

### Partner Exam Filtering
`GET /api/partner/exams` only returns exams where `exam_location = partner's school name OR exam_location = 'General'`. The school name is read from `partner_profiles` via a JOIN.

### Exam Location
`exam_location` is a string field — either `"General"` or a school name from the `schools` table. The New Exam form and Edit Exam modal both populate it from a dropdown of schools + "General" option.

### WebSocket (Live Entry Monitor)
`backend/src/sockets/entrySocket.js` — authenticated via `?token=` query param on `/ws`. Clients subscribe to an exam room via `{ type: 'subscribe', exam_id }`. Entry events are broadcast to all room subscribers when security scans a student.

### Frontend Shared Pages
Some pages are reused across roles with role-aware behavior:
- `ExamStudentsPage` — used at `/admin/exams/:id/students` and `/reception/exams/:id/students`
- `PartnersPage` — used at `/admin/partners` and `/reception/partners`
- `PartnerExamsPage` — used at `/admin/partners/:partnerId/exams` and `/reception/partners/:partnerId/exams`; Bonus column and modal only visible to admin
- `PartnerExamStudentsPage` — paid/payment feature only available to reception (not admin)

### Frontend API Layer
All API calls go through `frontend/src/api/apiClient.js` (Axios instance with `Authorization: Bearer <token>` header injected from `localStorage`). Individual resource files: `auth.api.js`, `exams.api.js`, `students.api.js`, `registrations.api.js`.

## Mobile Responsiveness Rules

Every page must be usable in any mobile browser (≥ 320px wide) with **no horizontal page scroll**. Desktop (> 768px) layout and behavior must stay exactly as it is — mobile rules are additive and only apply at or below the breakpoint.

### Context
- The frontend styles almost entirely with inline `style={{}}` objects (no CSS files, no Tailwind, no CSS modules). Inline styles cannot use `@media`, so responsive behavior comes from (a) a single global stylesheet and (b) a `useIsMobile()` hook.
- `frontend/index.html` already has `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` — never remove it or add `user-scalable=no`.

### Mechanism
- **Single breakpoint: `768px`** (mobile = `max-width: 768px`). Do not introduce other breakpoints without updating this file.
- Global responsive rules live in one file, `frontend/src/styles/responsive.css`, imported once in `main.jsx`. Give elements a `className` (e.g. `app-sidebar`, `table-scroll`, `form-grid`) and target it inside `@media (max-width: 768px)`. Use `!important` there only to override inline styles.
- For layout changes that must be decided in JS (e.g. sidebar → hamburger drawer), use a shared hook `frontend/src/hooks/useIsMobile.js` (`window.matchMedia('(max-width: 768px)')`). Don't re-implement it per component.
- Never wrap or change existing desktop styles to satisfy mobile; add mobile overrides instead. Verify desktop at ≥ 1024px after every change.

### Rules
1. **Nothing wider than the viewport.** Global: `html, body { max-width: 100%; overflow-x: hidden }`, `*, *::before, *::after { box-sizing: border-box }`, `img, video, canvas { max-width: 100%; height: auto }`. Never use fixed pixel `width` on containers/cards/inputs on mobile — use `width: 100%`, `max-width`, `min-width: 0`.
2. **Layouts (`components/layout/*Layout.jsx`).** Sidebars collapse on mobile into a top bar with a hamburger toggle and slide-over drawer; main content is full width with reduced padding (12–16px). Desktop keeps the fixed sidebar.
3. **Tables.** Every `<table>` is wrapped in a container with `overflow-x: auto` (`className="table-scroll"`) so only the table scrolls, never the page. Prefer hiding low-value columns on mobile (`hide-mobile` class) over shrinking text. Keep action buttons reachable.
4. **Grids/flex rows.** Multi-column grids (`gridTemplateColumns: 'repeat(n, …)'`) and side-by-side flex rows collapse to a single column on mobile; flex rows that can overflow get `flex-wrap: wrap`. Toolbars (search + filters + buttons) stack vertically with inputs at `width: 100%`.
5. **Modals/dialogs.** `width: min(<desktop width>, 100vw - 24px)`, `max-height: 90vh` with `overflow-y: auto`. No fixed-width modals.
6. **Forms.** Inputs/selects/buttons `width: 100%` on mobile, font-size ≥ 16px (prevents iOS zoom-on-focus), touch targets ≥ 44px tall.
7. **Long content.** Emails, school names, IDs, and URLs use `overflow-wrap: anywhere` / `word-break: break-word` so they wrap instead of stretching the layout.
8. **Security scan / entry page and Live Monitor** are the most likely to be used on phones — keep them single-column, large-tap, and free of horizontal scroll (including the student ticket in `StudentTicket.jsx`).
9. **New code.** Any new page or component must ship with its mobile behavior (classNames + rules in `responsive.css`) in the same change; no fixed widths, and wrap any new table in `table-scroll`.

### Verification checklist (before finishing any UI change)
- Open DevTools device mode at 320px, 375px, and 414px width: `document.documentElement.scrollWidth <= window.innerWidth` must hold on every route for every role.
- Check modals, tables, and the sidebar/drawer on those widths.
- Re-check desktop (≥ 1024px): visually unchanged from before.
