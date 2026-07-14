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