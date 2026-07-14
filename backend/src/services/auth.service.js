const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const jwtConfig = require('../config/jwt');

async function login(email, password) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
  const user = rows[0];
  if (!user) throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };

  const payload = { id: user.id, email: user.email, role: user.role, full_name: user.full_name };
  const accessToken = jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessTTL });
  const refreshToken = jwt.sign({ id: user.id }, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshTTL });

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + $3 * interval \'1 second\')',
    [user.id, refreshToken, jwtConfig.refreshTTL]
  );

  return { accessToken, refreshToken, user: payload };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch {
    throw { status: 401, code: 'INVALID_TOKEN', message: 'Refresh token invalid or expired' };
  }

  const { rows } = await pool.query(
    'SELECT rt.*, u.email, u.role, u.full_name FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = $1 AND rt.expires_at > NOW()',
    [refreshToken]
  );
  if (!rows[0]) throw { status: 401, code: 'INVALID_TOKEN', message: 'Refresh token not found or expired' };

  const user = rows[0];
  const newPayload = { id: user.user_id, email: user.email, role: user.role, full_name: user.full_name };
  const accessToken = jwt.sign(newPayload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessTTL });

  return { accessToken, user: newPayload };
}

async function logout(refreshToken) {
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
}

module.exports = { login, refresh, logout };
