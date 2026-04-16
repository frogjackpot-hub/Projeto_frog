/**
 * Script para sincronizar o banco Neon (produção)
 * - Aplica migração 004 (partner system) se não existir
 * - Reseta senhas dos usuários de teste
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const NEON_URL = process.env.NEON_URL || process.argv[2];

if (!NEON_URL) {
  console.error('Uso: node tools/sync-neon.js <NEON_DATABASE_URL>');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  
  try {
    // 1. Verificar se tabela migrations existe
    const migCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      )
    `);
    
    if (!migCheck.rows[0].exists) {
      console.log('Tabela migrations não existe, criando...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }
    
    // 2. Verificar migrações aplicadas
    const applied = await client.query('SELECT name FROM migrations ORDER BY id');
    console.log('Migrações já aplicadas:', applied.rows.map(r => r.name));
    
    // 3. Verificar se 004 já foi aplicada
    const has004 = applied.rows.some(r => r.name === '004_partner_system.sql');
    
    if (!has004) {
      console.log('\n=== Aplicando migração 004_partner_system.sql ===');
      const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '004_partner_system.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query("INSERT INTO migrations (name) VALUES ('004_partner_system.sql')");
      await client.query('COMMIT');
      console.log('Migração 004 aplicada com sucesso!');
    } else {
      console.log('Migração 004 já aplicada, pulando.');
    }
    
    // 4. Verificar se os usuários de teste existem no Neon
    const users = await client.query(
      "SELECT id, username, email, is_active FROM users WHERE username IN ('bardoze', 'jogador1')"
    );
    console.log('\nUsuários encontrados no Neon:', users.rows);
    
    if (users.rows.length > 0) {
      // 5. Resetar senhas
      const hash = await bcrypt.hash('Teste123!', 12);
      const result = await client.query(
        "UPDATE users SET password = $1, is_active = true WHERE username = ANY($2) RETURNING username",
        [hash, ['bardoze', 'jogador1']]
      );
      console.log('Senhas resetadas:', result.rows.map(r => r.username));
      
      // 6. Testar comparação
      const check = await client.query("SELECT password FROM users WHERE username = 'bardoze'");
      if (check.rows.length > 0) {
        const match = await bcrypt.compare('Teste123!', check.rows[0].password);
        console.log('Teste de senha (bardoze):', match ? 'OK ✅' : 'FALHOU ❌');
      }
    } else {
      console.log('Usuários bardoze/jogador1 NÃO existem no Neon. Eles precisam ser criados pela interface ou API.');
    }
    
    // 7. Verificar parceiros
    const partnerCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partners')"
    );
    console.log('\nTabela partners existe:', partnerCheck.rows[0].exists);
    
    if (partnerCheck.rows[0].exists) {
      const partners = await client.query('SELECT id, referral_code, is_active FROM partners');
      console.log('Parceiros no Neon:', partners.rows);
    }
    
    console.log('\n✅ Sincronização concluída!');
    
  } catch (err) {
    console.error('ERRO:', err.message);
    try { await client.query('ROLLBACK'); } catch(e) {}
  } finally {
    client.release();
    await pool.end();
  }
}

run();
