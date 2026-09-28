# Database Table Relations — examdb

```mermaid
erDiagram

    %% ── Core identity ───────────────────────────────────────────────
    users {
        UUID    id PK
        VARCHAR full_name
        VARCHAR email
        VARCHAR password_hash
        ENUM    role "admin|security|viewer|reception|partner"
        BOOLEAN is_active
        TSTZ    created_at
        TSTZ    updated_at
    }

    refresh_tokens {
        UUID id PK
        UUID user_id FK
        TEXT token
        TSTZ expires_at
        TSTZ created_at
    }

    %% ── Partner extension ────────────────────────────────────────────
    partner_profiles {
        UUID    id PK
        UUID    user_id FK
        VARCHAR school
        TEXT    school_address
        INTEGER number_of_students
        NUMERIC bonus_balance
        TSTZ    created_at
        TSTZ    updated_at
    }

    schools {
        UUID    id PK
        VARCHAR name
        TEXT    location
        INTEGER students_1_to_7
        INTEGER students_8_to_11
        VARCHAR director_name
        UUID    assigned_to FK "nullable"
        BOOLEAN is_active
        TSTZ    created_at
        TSTZ    updated_at
    }

    partner_bonus_payments {
        UUID    id PK
        UUID    partner_id FK
        NUMERIC amount
        TEXT    note
        UUID    paid_by FK "nullable"
        TSTZ    paid_at
    }

    %% ── Students ─────────────────────────────────────────────────────
    students {
        UUID     id PK
        VARCHAR  student_number
        VARCHAR  full_name
        VARCHAR  email
        VARCHAR  photo_url
        BOOLEAN  is_active
        UUID     partner_id FK "nullable"
        SMALLINT class_level
        VARCHAR  sector
        VARCHAR  language
        VARCHAR  mobile_number
        TSTZ     created_at
        TSTZ     updated_at
    }

    %% ── Exams ────────────────────────────────────────────────────────
    exams {
        UUID    id PK
        VARCHAR title
        VARCHAR subject_code
        TSTZ    scheduled_at
        INTEGER duration_mins
        TSTZ    entry_opens_at
        TSTZ    entry_closes_at
        ENUM    status "scheduled|ongoing|completed|cancelled"
        VARCHAR exam_location "school name or General"
        NUMERIC exam_cost
        NUMERIC commission_amount
        UUID    created_by FK
        BOOLEAN is_active
        TSTZ    created_at
        TSTZ    updated_at
    }

    %% ── Registrations ────────────────────────────────────────────────
    registrations {
        UUID    id PK
        UUID    exam_id FK
        UUID    student_id FK
        VARCHAR seat_number
        VARCHAR room_number
        TSTZ    registered_at
        UUID    registered_by FK
        NUMERIC amount_paid
        BOOLEAN bonus_awarded
    }

    %% ── Entry logs ───────────────────────────────────────────────────
    entry_logs {
        UUID id PK
        UUID exam_id FK
        UUID student_id FK
        UUID registration_id FK
        ENUM event_type "entry|exit"
        UUID checked_by FK
        VARCHAR device_info
        TEXT    notes
        TSTZ    logged_at
    }

    %% ── Legacy (orphaned after migration 008) ────────────────────────
    buildings {
        UUID    id PK
        VARCHAR name
        TEXT    address
        BOOLEAN is_active
        TSTZ    created_at
        TSTZ    updated_at
    }

    rooms {
        UUID    id PK
        UUID    building_id FK
        VARCHAR room_number
        INTEGER capacity
        BOOLEAN is_active
        TSTZ    created_at
        TSTZ    updated_at
    }

    schema_migrations {
        VARCHAR filename PK
        TSTZ    applied_at
    }

    %% ── Relationships ────────────────────────────────────────────────

    users ||--o{ refresh_tokens         : "owns (CASCADE)"
    users ||--o| partner_profiles       : "extends (CASCADE)"
    users ||--o{ schools                : "assigned_to (SET NULL)"
    users ||--o{ students               : "partner_id (SET NULL)"
    users ||--o{ exams                  : "created_by"
    users ||--o{ registrations          : "registered_by"
    users ||--o{ entry_logs             : "checked_by"
    users ||--o{ partner_bonus_payments : "partner_id (CASCADE)"
    users ||--o{ partner_bonus_payments : "paid_by (SET NULL)"

    exams          ||--o{ registrations : "exam_id (CASCADE)"
    students       ||--o{ registrations : "student_id (CASCADE)"
    exams          ||--o{ entry_logs    : "exam_id"
    students       ||--o{ entry_logs    : "student_id"
    registrations  ||--o{ entry_logs    : "registration_id"

    buildings ||--o{ rooms : "building_id (CASCADE)"
```

---

## Quick Reference: Foreign Keys

| Child Column | → Parent Table | On Delete |
|---|---|---|
| `refresh_tokens.user_id` | `users.id` | CASCADE |
| `partner_profiles.user_id` | `users.id` | CASCADE |
| `schools.assigned_to` | `users.id` | SET NULL |
| `students.partner_id` | `users.id` | SET NULL |
| `exams.created_by` | `users.id` | *(restrict)* |
| `registrations.exam_id` | `exams.id` | CASCADE |
| `registrations.student_id` | `students.id` | CASCADE |
| `registrations.registered_by` | `users.id` | *(restrict)* |
| `entry_logs.exam_id` | `exams.id` | *(restrict)* |
| `entry_logs.student_id` | `students.id` | *(restrict)* |
| `entry_logs.registration_id` | `registrations.id` | *(restrict)* |
| `entry_logs.checked_by` | `users.id` | *(restrict)* |
| `partner_bonus_payments.partner_id` | `users.id` | CASCADE |
| `partner_bonus_payments.paid_by` | `users.id` | SET NULL |
| `rooms.building_id` | `buildings.id` | CASCADE |

> `buildings` and `rooms` are **legacy** — `exams.room_id` was dropped in migration `008`. They remain in the database but are no longer referenced by any active table.

---

## Unique Constraints

| Table | Unique On |
|---|---|
| `users` | `email` |
| `refresh_tokens` | `token` |
| `students` | `student_number`, `email` |
| `partner_profiles` | `user_id` |
| `registrations` | `(exam_id, student_id)`, `(exam_id, seat_number)` |
| `rooms` | `(building_id, room_number)` |
