// Script para verificar se a senha Admin@123 bate com o hash no banco
const bcrypt = require('bcryptjs');

const password = 'Admin@123';
const hashNoSeed = '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq';

async function testarSenha() {
  console.log('=== TESTE DE SENHA DO ADMIN ===\n');
  
  console.log('Senha testada:', password);
  console.log('Hash no seed:', hashNoSeed);
  console.log();
  
  // Testar se a senha bate com o hash
  const senhaCorreta = await bcrypt.compare(password, hashNoSeed);
  console.log('Senha correta?', senhaCorreta);
  
  if (!senhaCorreta) {
    console.log('\n❌ A senha não bate com o hash!');
    console.log('Gerando novo hash...\n');
    
    const novoHash = await bcrypt.hash(password, 12);
    console.log('Novo hash gerado:');
    console.log(novoHash);
    console.log();
    
    // Testar novo hash
    const novoHashFunciona = await bcrypt.compare(password, novoHash);
    console.log('Novo hash funciona?', novoHashFunciona);
  } else {
    console.log('\n✅ A senha está correta!');
  }
}

testarSenha().catch(console.error);
