require('dotenv').config();

module.exports = {
  accessSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTTL: parseInt(process.env.ACCESS_TOKEN_TTL, 10) || 900,
  refreshTTL: parseInt(process.env.REFRESH_TOKEN_TTL, 10) || 604800,
};
