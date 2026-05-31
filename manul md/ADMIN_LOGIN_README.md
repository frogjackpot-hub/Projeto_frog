# Sistema de Login de Administrador - Projeto Frog 🎰

Sistema completo de autenticação administrativa implementado para o projeto Frog Casino.

## 📋 Estrutura Criada

### Backend (Node.js/Express)

#### Novos Arquivos:

- `src/controllers/adminController.js` - Controller com lógica de admin
- `src/routes/admin.js` - Rotas administrativas
- `tools/generate-admin-hash.js` - Script para gerar hash de senha

#### Arquivos Modificados:

- `src/middleware/auth.js` - Adicionado middleware `requireAdmin`
- `src/routes/index.js` - Registradas rotas admin
- `.env.example` - Adicionadas variáveis de ambiente de admin
- `database/seeds/001_initial_data.sql` - Atualizado usuário admin

### Frontend (Angular)

#### Novos Arquivos:

- `src/app/core/services/admin.service.ts` - Serviço de administração
- `src/app/core/guards/admin.guard.ts` - Guard de proteção de rotas
- `src/app/features/admin/components/admin-login/` - Componente de login
- `src/app/features/admin/components/admin-dashboard/` - Painel administrativo
- `src/app/features/admin/admin.routes.ts` - Rotas admin

#### Arquivos Modificados:

- `src/app/app.routes.ts` - Adicionadas rotas admin

## 🚀 Como Usar

### 1. Configurar Backend

#### Atualizar variáveis de ambiente:

```bash
# Copie o .env.example para .env (se ainda não tiver)
cd casino-backend
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
ADMIN_EMAIL=admin@casino.com
ADMIN_PASSWORD=Admin@123
JWT_SECRET=seu-secret-super-seguro
```

#### Gerar hash da senha (opcional):

Se quiser usar uma senha diferente:

```bash
cd casino-backend
ADMIN_PASSWORD="SuaSenhaSegura" node tools/generate-admin-hash.js
```

Copie o hash gerado e atualize no arquivo `database/seeds/001_initial_data.sql`.

#### Executar migrações e seeds:

```bash
cd casino-backend
npm run migrate
npm run seed
```

#### Iniciar o servidor:

```bash
npm run dev
```

### 2. Configurar Frontend

```bash
cd casino-frontend
npm install
npm start
```

### 3. Acessar o Painel Admin

1. Abra o navegador em: `http://localhost:4200/admin/login`
2. Use as credenciais:
   - **Email:** `admin@casino.com`
   - **Senha:** `Admin@123` (ou a senha configurada)
3. Você será redirecionado para: `http://localhost:4200/admin/dashboard`

## 🔒 Rotas da API (Backend)

### Públicas:

- `POST /api/admin/login` - Login de administrador

### Protegidas (requerem token de admin):

- `POST /api/admin/logout` - Logout
- `GET /api/admin/profile` - Perfil do admin
- `GET /api/admin/users` - Listar todos os usuários
- `GET /api/admin/stats` - Estatísticas do sistema

### Exemplo de requisição (login):

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@casino.com",
    "password": "Admin@123"
  }'
```

### Exemplo de requisição autenticada:

```bash
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🎨 Rotas do Frontend

- `/admin/login` - Página de login administrativo
- `/admin/dashboard` - Painel principal (protegida)
- `/admin` - Redireciona para dashboard

## 🔐 Segurança

### Backend:

- ✅ Senhas hasheadas com bcrypt
- ✅ Autenticação via JWT
- ✅ Middleware de proteção em rotas admin
- ✅ Validação de role (apenas usuários com `role: 'admin'`)
- ✅ Logs de tentativas de acesso

### Frontend:

- ✅ Token armazenado no localStorage
- ✅ Guard para proteger rotas administrativas
- ✅ Redirecionamento automático se não autenticado
- ✅ Limpeza de dados ao fazer logout

## 📊 Funcionalidades do Painel

### Dashboard Admin:

- Visualização de estatísticas do sistema
- Total de usuários cadastrados
- Total de transações
- Volume financeiro
- Lista completa de usuários
- Status de cada usuário (ativo/inativo/verificado)
- Saldo de cada usuário
- Botão de logout

## 🧪 Testes

### Testar login via terminal:

```bash
cd casino-backend
node tools/test-register.js
```

### Testar via REST Client (requests.http):

```http
### Login Admin
POST http://localhost:3000/api/admin/login
Content-Type: application/json

{
  "email": "admin@casino.com",
  "password": "Admin@123"
}
```

## ⚠️ IMPORTANTE - Segurança

1. **Altere a senha padrão** após o primeiro login
2. **Nunca commite** o arquivo `.env` com credenciais reais
3. **Use HTTPS** em produção
4. **Configure CORS** adequadamente para produção
5. **Implemente rate limiting** para prevenir ataques de força bruta

## 🔄 Fluxo de Autenticação

### Login:

1. Usuário acessa `/admin/login`
2. Preenche email e senha
3. Frontend envia POST para `/api/admin/login`
4. Backend valida credenciais e verifica se é admin
5. Backend gera token JWT
6. Frontend armazena token no localStorage
7. Redireciona para `/admin/dashboard`

### Acesso a Rotas Protegidas:

1. Guard verifica se existe token
2. Guard verifica se usuário é admin
3. Se não estiver autenticado, redireciona para login
4. Se autenticado, permite acesso

### Logout:

1. Usuário clica em "Sair"
2. Frontend envia POST para `/api/admin/logout`
3. Frontend limpa token do localStorage
4. Redireciona para `/admin/login`

## 🐛 Solução de Problemas

### "Credenciais inválidas":

- Verifique se rodou os seeds: `npm run seed`
- Confirme o email: `admin@casino.com`
- Confirme a senha: `Admin@123`
- Verifique se o usuário tem `role: 'admin'` no banco

### "Token inválido":

- Verifique se o JWT_SECRET é o mesmo no .env
- Limpe o localStorage do navegador
- Faça login novamente

### Erros de CORS:

- Verifique se o backend está rodando
- Confirme a configuração de CORS em `src/app.js`

## 📝 Próximos Passos Sugeridos

1. Adicionar funcionalidade de alteração de senha
2. Implementar recuperação de senha
3. Criar logs de auditoria de ações admin
4. Adicionar mais estatísticas no dashboard
5. Implementar gerenciamento de jogos
6. Adicionar controle de transações
7. Implementar blacklist de tokens (logout forçado)

## 📚 Documentação Adicional

- Backend: Ver `casino-backend/README_TESTING.md`
- Frontend: Ver `casino-frontend/README.md`
- Deploy: Ver `DEPLOY.md` e `RENDER_QUICKSTART.md`

---

**Desenvolvido para o Projeto Frog Casino** 🐸🎰
