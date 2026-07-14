-- Default admin user: admin@exam.local / Admin1234!
-- Password hash is bcrypt of 'Admin1234!'
INSERT INTO users (full_name, email, password_hash, role)
VALUES (
  'System Admin',
  'admin@exam.local',
  '$2a$12$7/o/D.oG.wNvJngBSxndM.iH5qb6VL7.tHBsd5ldHvuU0.A6BCbGW',
  'admin'
)
ON CONFLICT (email) DO NOTHING;
