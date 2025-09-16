const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runSeeds() {
  try {
    console.log('Iniciando seeds...');
    
    const seedsDir = path.join(__dirname, 'seeds');
    const seedFiles = fs.readdirSync(seedsDir).sort();
    
    for (const file of seedFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Executando seed: ${file}`);
        const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
        await db.query(sql);
        console.log(`Seed ${file} executado com sucesso`);
      }
    }
    
    console.log('Todos os seeds foram executados com sucesso!');
  } catch (error) {
    console.error('Erro ao executar seeds:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runSeeds();