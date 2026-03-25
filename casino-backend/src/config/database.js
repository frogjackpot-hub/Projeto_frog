const { Pool } = require('pg');
require('dotenv').config();

// Neon requer SSL mesmo em desenvolvimento
const isNeon = process.env.DATABASE_URL?.includes('.neon.tech');
const useSSL = process.env.NODE_ENV === 'production' || isNeon;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

// Teste de conexão
pool.on('connect', () => {
  console.log('Conectado ao banco de dados PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erro na conexão com o banco de dados:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};