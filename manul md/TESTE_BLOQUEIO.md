# 🧪 Guia de Teste - Sistema de Bloqueio

## 📋 Pré-requisitos

1. Backend rodando: `cd casino-backend && npm run dev`
2. Frontend rodando: `cd casino-frontend && npm start`
3. Navegador com console aberto (F12)

## ✅ Teste 1: Login Normal

### Objetivo

Verificar se login funciona corretamente

### Passos

1. Abrir `http://localhost:4200/auth/login`
2. Fazer login com usuário normal:
   - Email: `teste@exemplo.com`
   - Senha: `Teste@123`
3. ✅ Deve redirecionar para `/dashboard/home`
4. ✅ Deve carregar dados do dashboard sem erro 401

### Se der erro 401

- **Problema**: Não está logado corretamente
- **Solução**: Verificar se o token foi salvo no localStorage
  ```javascript
  // No console do navegador
  localStorage.getItem("accessToken");
  localStorage.getItem("currentUser");
  ```

## ✅ Teste 2: Acessar Dashboard sem Login

### Objetivo

Verificar se o guard bloqueia acesso não autenticado

### Passos

1. Abrir nova aba anônima
2. Ir direto para `http://localhost:4200/dashboard/home`
3. ✅ Deve redirecionar automaticamente para `/auth/login`
4. ✅ NÃO deve mostrar erro 401 (o guard bloqueia antes)

### Se mostrar erro 401

- **Problema**: O componente está carregando antes do guard agir
- **Isso é normal** - o Angular carrega o componente por um momento antes de redirecionar
- **Não é problema** - o importante é que redireciona

## ✅ Teste 3: Bloqueio de Usuário

### Objetivo

Verificar se bloqueio funciona corretamente

### Passos

1. **Aba 1 - Usuário Normal**

   - Login como `teste@exemplo.com`
   - Ficar no dashboard

2. **Aba 2 - Admin**

   - Abrir nova aba
   - Login como admin: `http://localhost:4200/admin/login`
   - Email: `admin@casino.com`
   - Senha: `Admin@123`

3. **Bloquear Usuário**

   - No painel admin, ir em "Usuários"
   - Buscar `teste@exemplo.com`
   - Clicar em "Bloquear Usuário"

4. **Voltar para Aba 1**
   - Tentar clicar em algo ou fazer qualquer ação
   - ✅ Deve redirecionar para `/auth/login`
   - ✅ Deve mostrar alerta de bloqueio

### Se não redirecionar

- Verificar console do navegador
- Deve mostrar: `❌ Usuário BLOQUEADO detectado`

## ✅ Teste 4: Tentar Login com Usuário Bloqueado

### Objetivo

Verificar se usuário bloqueado não consegue fazer login

### Passos

1. Na tela de login
2. Tentar login com usuário bloqueado:
   - Email: `teste@exemplo.com`
   - Senha: `Teste@123`
3. ✅ Deve mostrar alerta de conta bloqueada
4. ✅ NÃO deve entrar no sistema

## 🔧 Troubleshooting

### Erro 401 ao carregar dashboard

**Sintoma:**

```
GET http://localhost:4200/api/dashboard/stats 401 (Unauthorized)
```

**Possíveis causas:**

1. Não está logado
2. Token expirou
3. Token foi removido do localStorage

**Como verificar:**

```javascript
// Console do navegador
console.log("Token:", localStorage.getItem("accessToken"));
console.log("User:", localStorage.getItem("currentUser"));
```

**Se token está presente:**

- Verificar se não expirou
- Copiar o token e decodificar em https://jwt.io
- Verificar o campo `exp` (tempo de expiração)

**Se token não está presente:**

- Fazer login novamente
- O sistema deve limpar e redirecionar automaticamente

### Redirecionamento não funciona

**Sintoma:**

- Fica preso no dashboard mesmo após bloqueio

**Solução:**

1. Limpar localStorage manualmente:
   ```javascript
   localStorage.clear();
   ```
2. Recarregar página (F5)
3. Fazer login novamente

### Modal de bloqueio não aparece

**Isso é esperado!**

- O novo sistema NÃO usa modal
- Redireciona direto para login
- Mostra alerta na tela de login

## 📝 Logs Importantes

### Login bem-sucedido

```
✅ Login bem-sucedido
✅ Token salvo no localStorage
→ Redirecionando para /dashboard
```

### Detecção de bloqueio

```
❌ Usuário BLOQUEADO detectado - Redirecionando para login
🔄 Redirecionando para tela de login...
```

### Erro 401

```
⛔ 401 DETECTADO - Limpando sessão e redirecionando...
→ Redirecionando para /auth/login
```

## 🎯 Fluxo Esperado

### Usuário Logado → Bloqueado

```
1. Usuário fazendo ação no dashboard
2. Backend detecta usuário bloqueado
3. Backend retorna 403 + USER_BLOCKED
4. Frontend interceptor detecta bloqueio
5. Frontend limpa localStorage
6. Frontend redireciona para /auth/login
7. Login mostra alerta de bloqueio
```

### Acesso Direto sem Login

```
1. Usuário acessa /dashboard/home
2. AuthGuard verifica autenticação
3. isAuthenticated$ retorna false
4. AuthGuard redireciona para /auth/login
5. (Pode mostrar erro 401 por breve momento)
```

## ✅ Checklist Final

- [ ] Login funciona
- [ ] Dashboard carrega sem erro 401 quando logado
- [ ] Bloqueio redireciona para login
- [ ] Alerta de bloqueio aparece no login
- [ ] Usuário bloqueado não consegue fazer login novamente
- [ ] Logout funciona corretamente

---

**Última atualização:** 22 de novembro de 2025
