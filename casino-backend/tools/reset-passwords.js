const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  const hash = await bcrypt.hash('Teste123!', 12);
  console.log('Hash gerado:', hash);
  
  const result = await db.query(
    'UPDATE users SET password = $1 WHERE username = ANY($2) RETURNING username, email',
    [hash, ['bardoze', 'jogador1']]
  );
  
  console.log('Atualizados:', result.rows);
  
  // Testar login
  const check = await db.query('SELECT password FROM users WHERE username = $1', ['bardoze']);
  const match = await bcrypt.compare('Teste123!', check.rows[0].password);
  console.log('Teste de senha:', match ? 'OK' : 'FALHOU');
  
  process.exit(0);
}

resetPasswords().catch(e => { console.error(e); process.exit(1); });
