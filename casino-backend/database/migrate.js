const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigrations() {
  try {
    console.log('Iniciando migrações...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();
    
    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Executando migração: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.query(sql);
        console.log(`Migração ${file} executada com sucesso`);
      }
    }
    
    console.log('Todas as migrações foram executadas com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();