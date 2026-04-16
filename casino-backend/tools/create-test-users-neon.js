/**
 * Script para criar os usuários de teste no Neon
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const NEON_URL = process.argv[2];
if (!NEON_URL) { console.error('Uso: node tools/create-test-users-neon.js <URL>'); process.exit(1); }

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash('Teste123!', 12);
    
    const users = [
      { username: 'bardoze', email: 'bardoze@test.com', firstName: 'Bar', lastName: 'Silva' },
      { username: 'jogador1', email: 'jogador1@test.com', firstName: 'Jogador', lastName: 'Um' }
    ];
    
    for (const u of users) {
      // Verificar se já existe
      const exists = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [u.email, u.username]);
      if (exists.rows.length > 0) {
        console.log(`${u.username} já existe, atualizando senha...`);
        await client.query('UPDATE users SET password = $1, is_active = true WHERE id = $2', [hash, exists.rows[0].id]);
      } else {
        const id = uuidv4();
        await client.query(
          `INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 1000, 'player', true, NOW(), NOW())`,
          [id, u.email, u.username, hash, u.firstName, u.lastName]
        );
        console.log(`${u.username} criado com sucesso! (ID: ${id})`);
      }
    }
    
    // Verificar
    const check = await client.query("SELECT username, email, is_active, balance FROM users WHERE username IN ('bardoze', 'jogador1')");
    console.log('\nUsuários no Neon:', check.rows);
    
    // Testar login
    const test = await client.query("SELECT password FROM users WHERE username = 'bardoze'");
    const match = await bcrypt.compare('Teste123!', test.rows[0].password);
    console.log('Teste de senha (bardoze):', match ? '✅ OK' : '❌ FALHOU');
    
    console.log('\n✅ Pronto! Agora pode logar no Render com:');
    console.log('  bardoze@test.com / Teste123!');
    console.log('  jogador1@test.com / Teste123!');
    
  } catch (err) {
    console.error('ERRO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
