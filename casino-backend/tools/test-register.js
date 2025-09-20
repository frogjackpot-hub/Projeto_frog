// Script simples para testar o endpoint /api/auth/register
// Requer Node.js 18+ (fetch disponível)

const baseUrl = process.env.BASE_URL || 'http://localhost:3000/api';
const payload = {
  email: process.env.EMAIL || 'teste@casino.com',
  username: process.env.USERNAME || 'testuser',
  password: process.env.PASSWORD || 'Teste123!',
  firstName: 'Usuário',
  lastName: 'Teste'
};

async function run() {
  try {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Erro ao chamar API:', err);
  }
}

run();
