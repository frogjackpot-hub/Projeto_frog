Teste rápido do endpoint de registro

Pré-requisitos:

- Docker e Docker Compose instalados
- Porta 3000 livre

1. Subir serviços com Docker Compose

docker compose up --build

2. Executar migrações e seeds (dentro do container backend) se necessário

# dentro do container backend

npm run migrate; npm run seed

3. Testar endpoint de registro localmente

- Via HTTP client (Postman / REST Client):
  POST http://localhost:3000/api/auth/register
  Content-Type: application/json

  {
  "email": "teste@casino.com",
  "username": "testuser",
  "password": "Teste123!",
  "firstName": "Usuário",
  "lastName": "Teste"
  }

- Via script fornecido (Node 18+):
  Powershell:
  $env:BASE_URL='http://localhost:3000/api'; node tools/test-register.js

Observações:

- Se receber 409 com código DUPLICATE_EMAIL ou DUPLICATE_USERNAME, significa que o e-mail/username já existe.
- Logs estão em ./logs/combined.log e ./logs/error.log no host (o container também grava nesses caminhos montados).

Se quiser, posso rodar mais verificações ou ajustar mensagens adicionais na API.
