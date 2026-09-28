# Deployment Plan: task-database-restructuring

## Changes Overview

| Change | File | Type |
|--------|------|------|
| Add `deleted_at` column | migration 020 | DB schema |
| Anonymize PII on delete | `students.controller.js` | Behavior + data |
| Bonus revocation on payment reduction | `registrations.controller.js` | Behavior |
| `student_number` max length 50→7 | `student.validator.js` | Validation |
| `mobile_number` max length 20→10 | `student.validator.js` | Validation |

---

## Identified Risks

### 1. Irreversible PII wipe on student delete — HIGH
Previously `DELETE` just set `is_active = false`, preserving all data. Now it **permanently overwrites** `full_name`, `email`, `student_number`, `mobile_number`, `class_level`, `sector`, `language`, `partner_id` with placeholder values. Any student "deleted" after this deploy **cannot be recovered** unless a backup exists.

### 2. Existing students with `student_number` longer than 7 characters — HIGH
The DB column is `VARCHAR(50)` and existing production rows may have values up to 50 chars. The new `EditStudentModal` always sends all fields including `student_number`. The validator now rejects anything > 7 chars, so **any admin attempt to edit such a student will fail with a validation error** — the student becomes un-editable.

**Check to run before deploy:**
```sql
SELECT id, student_number FROM students
WHERE length(student_number) > 7 AND is_active = true;
```

### 3. Existing students with `mobile_number` longer than 10 characters — MEDIUM
Same issue: the validator drops max from 20→10, but the DB column remains `VARCHAR(20)`. Students with longer numbers become un-editable.

**Check to run before deploy:**
```sql
SELECT id, mobile_number FROM students
WHERE length(mobile_number) > 10 AND is_active = true;
```

### 4. Bonus revocation changes partner financial balances — MEDIUM
Previously, marking a registration paid was a one-way ratchet (bonus only ever increased). Now, if a receptionist reduces a payment below `exam_cost`, the partner's `bonus_balance` is **decremented**. This is intentional behavior, but it means any payment edits on existing `bonus_awarded = true` registrations will now affect real partner balances.

### 5. Migration 020 — SAFE
`ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ` is purely additive, nullable, and idempotent. Zero risk.

---

## Deployment Steps

### Step 1 — Pre-deploy backup + audit (before any code goes out)

```bash
# Full DB backup
docker exec livex-with-claude-postgres-1 \
  pg_dump -U examadmin examdb > backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql

# Audit student_number lengths
docker exec livex-with-claude-postgres-1 psql -U examadmin -d examdb -c "
  SELECT student_number, length(student_number) AS len
  FROM students WHERE length(student_number) > 7 AND is_active = true
  ORDER BY len DESC;"

# Audit mobile_number lengths
docker exec livex-with-claude-postgres-1 psql -U examadmin -d examdb -c "
  SELECT mobile_number, length(mobile_number) AS len
  FROM students WHERE length(mobile_number) > 10 AND is_active = true
  ORDER BY len DESC;"
```

### Step 2 — Resolve student_number conflicts (only if Step 1 found rows)

Two options:
- **Option A** (preferred if data is clean): manually correct the offending student numbers in prod before deploy so they fit in 7 chars.
- **Option B** (if you want to keep long numbers): raise the validator max back to match the actual data, or skip sending `student_number` in the edit modal if it hasn't changed.

### Step 3 — Deploy migration first, backend second, frontend last

```bash
# 1. Apply migration (safe, no downtime)
npm run migrate          # from /backend

# 2. Deploy backend (new controller + validator)
# 3. Deploy frontend
```

This order matters: the migration adds the column the new delete logic writes to. Deploying backend before migration would cause SQL errors on delete.

### Step 4 — Post-deploy smoke tests

- [ ] Edit an active student → modal saves without error
- [ ] Delete a student → confirm data is anonymized:
  ```sql
  SELECT * FROM students WHERE is_active = false ORDER BY deleted_at DESC LIMIT 1;
  ```
- [ ] Verify deleted student's `student_number` is unique (`DELETED_<uuid>`)
- [ ] Reduce a paid registration's amount below `exam_cost` → confirm partner `bonus_balance` decremented correctly
- [ ] Confirm no existing `bonus_awarded = true` registrations are accidentally touched (no payment edits were made)

### Step 5 — Rollback plan (if something breaks)

The migration is additive and safe to leave in place. Backend + frontend can be reverted to the previous `master` branch commit. The only un-reversible action is a student deletion made after deploy — those rows will have had PII wiped. The pre-deploy backup from Step 1 is the only recovery path for those records.
