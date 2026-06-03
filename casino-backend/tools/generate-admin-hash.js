// Script para gerar hash de senha para administrador
// Execute com: node tools/generate-admin-hash.js

const bcrypt = require('bcryptjs');

const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Erro: defina ADMIN_PASSWORD no ambiente antes de executar o script.');
  console.error('Exemplo (PowerShell): $env:ADMIN_PASSWORD="SuaSenhaSegura"; node tools/generate-admin-hash.js');
  process.exit(1);
}

async function generateHash() {
  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('\n=== Hash gerado com sucesso ===');
    console.log('Senha:', password);
    console.log('Hash:', hash);
    console.log('\nUse este hash no arquivo de seed (001_initial_data.sql)');
    console.log('ou crie um novo usuário admin no banco com este hash.\n');
  } catch (error) {
    console.error('Erro ao gerar hash:', error);
    process.exit(1);
  }
}

generateHash();
