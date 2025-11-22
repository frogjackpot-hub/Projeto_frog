#!/bin/sh

echo "🌱 Executando seed de logs de auditoria..."

# Caminho do banco de dados
DB_PATH="/app/database/seeds/002_audit_logs_sample.sql"

# Executar o seed usando node
node -e "
const fs = require('fs');
const db = require('./src/config/database');

async function runSeed() {
  try {
    const sql = fs.readFileSync('$DB_PATH', 'utf8');
    await db.query(sql);
    console.log('✅ Logs de auditoria de exemplo inseridos com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inserir logs:', error.message);
    process.exit(1);
  }
}

runSeed();
"
