# 🚀 Guia Rápido - Login Administrativo

## ⚡ Início Rápido (5 minutos)

### 1. Preparar Backend

```bash
cd casino-backend

# Executar migrações e seeds
npm run migrate
npm run seed

# Iniciar servidor
npm run dev
```

### 2. Preparar Frontend

```bash
cd casino-frontend

# Iniciar aplicação
npm start
```

### 3. Acessar Painel Admin

1. Abra: http://localhost:4200/admin/login
2. Email: `admin@casino.com`
3. Senha: `Admin@123`

## ✅ Credenciais Padrão

**Email:** admin@casino.com  
**Senha:** Admin@123

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## 🎯 O que foi criado

### Backend (7 arquivos)

✅ Controller de admin com 5 endpoints  
✅ Rotas de admin protegidas  
✅ Middleware de autenticação admin  
✅ Variáveis de ambiente  
✅ Seeds atualizados com usuário admin  
✅ Script gerador de hash  
✅ Documentação completa

### Frontend (8 arquivos)

✅ Serviço de administração  
✅ Guard de proteção de rotas  
✅ Componente de login com validação  
✅ Dashboard administrativo  
✅ Rotas configuradas  
✅ Interceptor atualizado  
✅ Estilos responsivos

## 📡 Endpoints da API

### Público

- `POST /api/admin/login` - Login

### Protegido (token necessário)

- `GET /api/admin/profile` - Perfil
- `GET /api/admin/users` - Listar usuários
- `GET /api/admin/stats` - Estatísticas
- `POST /api/admin/logout` - Logout

## 🧪 Testar no Terminal

### Gerar hash de senha

```bash
cd casino-backend
node tools/generate-admin-hash.js
```

### Testar login

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@casino.com","password":"Admin@123"}'
```

## 🎨 Páginas Frontend

- `/admin/login` - Login administrativo
- `/admin/dashboard` - Painel (protegido)

## 🔐 Segurança Implementada

✅ Senhas hasheadas com bcrypt (salt 12)  
✅ JWT para autenticação  
✅ Middleware de verificação de role  
✅ Guard no frontend  
✅ Token no localStorage  
✅ Logs de tentativas de acesso  
✅ Validação de formulários

## 🐛 Problemas Comuns

### Não consegue fazer login?

1. Verifique se rodou `npm run seed`
2. Confirme que o backend está rodando na porta 3000
3. Limpe o localStorage do navegador
4. Verifique o console para erros

### Erro 401?

- Token pode estar expirado
- Faça logout e login novamente
- Verifique se JWT_SECRET é o mesmo no backend

### Página em branco?

- Verifique o console do navegador
- Confirme que o frontend está rodando
- Limpe o cache do navegador

## 📚 Documentação Completa

Ver: `ADMIN_LOGIN_README.md`

## 🎉 Pronto!

Seu sistema de login administrativo está funcionando!

Acesse: http://localhost:4200/admin/login

---

**Projeto Frog Casino** 🐸🎰
