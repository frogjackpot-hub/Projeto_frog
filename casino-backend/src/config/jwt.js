require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'supersecretjwtkey',
  expiresIn: '24h',
  refreshExpiresIn: '7d',
};