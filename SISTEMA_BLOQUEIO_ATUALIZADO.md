# 🔒 Sistema de Bloqueio de Usuários - Atualizado

## 📋 Descrição das Mudanças

O sistema de bloqueio foi completamente reformulado para resolver o problema do usuário ficar "congelado" no dashboard quando bloqueado.

### ❌ Problema Anterior

- Usuário bloqueado perdia o token mas permanecia na tela `dashboard/home`
- Não conseguia sair ou navegar
- Modal de bloqueio aparecia mas não redirecionava efetivamente
- Experiência ruim para o usuário

### ✅ Nova Solução

**Fluxo Simplificado:**

1. Usuário bloqueado tenta acessar qualquer recurso
2. Backend retorna erro 403 com código `USER_BLOCKED`
3. Frontend limpa imediatamente os dados de autenticação
4. Redireciona INSTANTANEAMENTE para `/auth/login`
5. Mostra mensagem clara de bloqueio na tela de login
6. Impede novo login enquanto bloqueado

## 🔧 Alterações Implementadas

### Frontend (Angular)

#### 1. **auth.interceptor.ts**

```typescript
// Detecção melhorada de bloqueio
const isBlocked =
  error.status === 403 &&
  (error.error?.code === "USER_BLOCKED" ||
    error.error?.message?.includes("bloqueada") ||
    error.error?.message?.includes("bloqueado"));

if (isBlocked) {
  // Limpar autenticação
  this.authService.clearAuthDataOnly();

  // Marcar motivo do bloqueio
  localStorage.setItem(
    "user_blocked_reason",
    "Sua conta foi bloqueada pelo administrador."
  );

  // Redirecionar IMEDIATAMENTE
  window.location.href = "/auth/login?blocked=true";
}
```

**Mudanças:**

- ✅ Remoção do modal de bloqueio
- ✅ Redirecionamento imediato usando `window.location.href`
- ✅ Salvamento do motivo no localStorage
- ✅ Parâmetro de query `?blocked=true` para feedback visual

#### 2. **auth.service.ts**

```typescript
private handleBlockedUser(): void {
  // Parar verificações periódicas
  if (this.statusCheckInterval) {
    clearInterval(this.statusCheckInterval);
  }

  // Limpar dados
  this.clearAuthData();

  // Marcar bloqueio
  localStorage.setItem('user_blocked_reason',
    'Sua conta foi bloqueada pelo administrador.');

  // Redirecionar imediatamente
  window.location.href = '/auth/login?blocked=true';
}
```

**Mudanças:**

- ✅ Remoção da dependência do `BlockedUserService`
- ✅ Remoção do delay de 1.5 segundos
- ✅ Redirecionamento imediato e agressivo

#### 3. **login.component.ts**

```typescript
export class LoginComponent implements OnInit {
  blockedMessage: string | null = null;

  ngOnInit(): void {
    this.checkBlockedStatus();
  }

  private checkBlockedStatus(): void {
    // Verificar parâmetro ?blocked=true
    const isBlocked = this.route.snapshot.queryParams["blocked"];
    const blockedReason = localStorage.getItem("user_blocked_reason");

    if (isBlocked === "true" || blockedReason) {
      this.blockedMessage =
        blockedReason ||
        "Sua conta foi bloqueada. Entre em contato com o suporte.";

      // Mostrar notificação
      this.notificationService.error("Conta Bloqueada", this.blockedMessage);

      // Limpar após 10 segundos
      setTimeout(() => {
        this.blockedMessage = null;
        localStorage.removeItem("user_blocked_reason");
      }, 10000);
    }
  }

  onSubmit(): void {
    this.authService.login(credentials).subscribe({
      error: (error) => {
        // Verificar se é bloqueio
        const isBlocked =
          error?.error?.code === "USER_BLOCKED" ||
          error?.error?.message?.includes("bloqueada") ||
          error?.error?.message?.includes("bloqueado");

        if (isBlocked) {
          this.blockedMessage = "Sua conta foi bloqueada...";
          this.notificationService.error(
            "Conta Bloqueada",
            this.blockedMessage
          );
          return;
        }
        // ... outros erros
      },
    });
  }
}
```

**Mudanças:**

- ✅ Detecção de bloqueio via parâmetro de URL
- ✅ Leitura do motivo do bloqueio do localStorage
- ✅ Exibição de alerta visual na tela de login
- ✅ Validação no momento do login também

#### 4. **login.component.html**

```html
<!-- Alerta de conta bloqueada -->
<div class="blocked-alert" *ngIf="blockedMessage">
  <div class="blocked-icon">🚫</div>
  <div class="blocked-content">
    <h3>Conta Bloqueada</h3>
    <p>{{ blockedMessage }}</p>
    <p class="blocked-support">
      Entre em contato com o suporte:
      <strong>suporte@casino.com</strong>
    </p>
  </div>
</div>
```

**Mudanças:**

- ✅ Alerta visual destacado em vermelho
- ✅ Informações de contato do suporte
- ✅ Animação de entrada suave

#### 5. **login.component.scss**

```scss
.blocked-alert {
  background: linear-gradient(
    135deg,
    rgba(244, 67, 54, 0.15) 0%,
    rgba(211, 47, 47, 0.15) 100%
  );
  border: 2px solid rgba(244, 67, 54, 0.5);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  animation: slideDown 0.3s ease-out;
  // ... estilos
}
```

**Mudanças:**

- ✅ Estilo visual profissional
- ✅ Cores de alerta (vermelho)
- ✅ Animação de entrada

### Backend (Node.js/Express)

#### 1. **authService.js**

```javascript
static async login(email, password) {
  const user = await User.findByEmail(email);

  if (!user) {
    const error = new Error('Credenciais inválidas');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await user.validatePassword(password);

  if (!isPasswordValid) {
    const error = new Error('Credenciais inválidas');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  // ✅ NOVA VALIDAÇÃO: Verificar se usuário está bloqueado
  if (!user.isActive) {
    const error = new Error(
      'Sua conta foi bloqueada. Entre em contato com o suporte.'
    );
    error.code = 'USER_BLOCKED';
    error.statusCode = 403;
    throw error;
  }

  const tokens = this.generateTokens(user);
  return { user: user.toJSON(), tokens };
}
```

**Mudanças:**

- ✅ Validação de `isActive` antes de gerar tokens
- ✅ Erro específico com código `USER_BLOCKED`
- ✅ Mensagem clara para o usuário

#### 2. **auth.js (middleware)**

```javascript
const authenticateToken = async (req, res, next) => {
  // ... validação de token

  const user = await User.findById(decoded.userId);

  if (!user) {
    return res.status(401).json({
      error: "Usuário não encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  // ✅ JÁ IMPLEMENTADO: Verificar se usuário está bloqueado
  if (!user.isActive) {
    logger.warn("Tentativa de acesso com usuário bloqueado", {
      userId: user.id,
    });
    return res.status(403).json({
      error: "Sua conta foi bloqueada. Entre em contato com o suporte.",
      code: "USER_BLOCKED",
    });
  }

  req.user = user;
  next();
};
```

**Status:**

- ✅ Já estava implementado corretamente
- ✅ Retorna erro 403 com código específico
- ✅ Registra tentativa no log

## 🎯 Fluxo Completo de Bloqueio

### 1. Admin Bloqueia Usuário

```
Admin Dashboard → Bloquear Usuário
       ↓
Backend: UPDATE users SET is_active = false
       ↓
Usuário bloqueado no banco de dados
```

### 2. Usuário Bloqueado Tenta Usar o Sistema

**Cenário A: Já está logado e tenta fazer uma ação**

```
Dashboard → Requisição HTTP (com token)
       ↓
Backend: Middleware verifica is_active = false
       ↓
Backend: Retorna 403 + USER_BLOCKED
       ↓
Frontend: Interceptor detecta 403 + USER_BLOCKED
       ↓
Frontend: Limpa localStorage + sessionStorage
       ↓
Frontend: Salva motivo em user_blocked_reason
       ↓
Frontend: window.location.href = '/auth/login?blocked=true'
       ↓
Login Screen: Mostra alerta de conta bloqueada
```

**Cenário B: Tenta fazer login novamente**

```
Login Screen → Submete credenciais
       ↓
Backend: Valida email e senha ✅
       ↓
Backend: Verifica is_active = false ❌
       ↓
Backend: Retorna 403 + USER_BLOCKED
       ↓
Frontend: Detecta bloqueio no erro
       ↓
Frontend: Mostra mensagem de bloqueio
       ↓
Frontend: NÃO permite prosseguir
```

## 🚀 Vantagens da Nova Abordagem

### 1. **Redirecionamento Imediato**

- Usa `window.location.href` em vez de `router.navigate`
- Força refresh completo da aplicação
- Remove qualquer estado residual

### 2. **Feedback Visual Claro**

- Alerta destacado na tela de login
- Mensagem específica sobre bloqueio
- Informações de contato do suporte

### 3. **Prevenção de Re-login**

- Validação no backend durante login
- Erro específico impede geração de token
- Mensagem clara de bloqueio

### 4. **Limpeza Completa**

- Remove todos os dados de autenticação
- Limpa localStorage
- Para verificações periódicas

### 5. **Sem Modais Temporários**

- Não depende de modais que podem falhar
- Redirecionamento direto e confiável
- Melhor UX (experiência do usuário)

## 🧪 Como Testar

### 1. Preparar Ambiente

```bash
# Terminal 1 - Backend
cd casino-backend
npm run dev

# Terminal 2 - Frontend
cd casino-frontend
npm start
```

### 2. Criar Usuário de Teste

```bash
# Via frontend: http://localhost:4200/auth/register
Email: teste@exemplo.com
Senha: Teste@123
```

### 3. Login como Admin

```bash
# http://localhost:4200/admin/login
Email: admin@casino.com
Senha: Admin@123
```

### 4. Bloquear Usuário

```
Admin Dashboard → Usuários → Buscar "teste@exemplo.com"
→ Clicar em "Bloquear Usuário"
```

### 5. Testar Bloqueio

**Teste A: Usuário já logado**

1. Abrir nova aba anônima
2. Fazer login como teste@exemplo.com
3. Navegar para dashboard
4. Admin bloqueia o usuário
5. Usuário tenta clicar em algo
6. ✅ Deve ser redirecionado para login
7. ✅ Deve ver mensagem de bloqueio

**Teste B: Tentar novo login**

1. Tentar fazer login novamente
2. ✅ Deve ver erro de conta bloqueada
3. ✅ NÃO deve conseguir entrar

## 📝 Arquivos Modificados

### Frontend

- ✅ `src/app/core/interceptors/auth.interceptor.ts`
- ✅ `src/app/core/services/auth.service.ts`
- ✅ `src/app/features/auth/components/login/login.ts`
- ✅ `src/app/features/auth/components/login/login.html`
- ✅ `src/app/features/auth/components/login/login.scss`
- ✅ `src/app/app.ts` (removido BlockedUserModalComponent)
- ✅ `src/app/app.html` (removido modal)

### Backend

- ✅ `src/services/authService.js`
- ℹ️ `src/middleware/auth.js` (já estava correto)

## 🗑️ Componentes Removidos

- ❌ `BlockedUserModalComponent` (não é mais usado)
- ❌ `BlockedUserService.showModal$` (não é mais necessário)

**Nota:** Os arquivos ainda existem no projeto mas não são mais importados ou usados.

## ✅ Checklist de Segurança

- ✅ Bloqueio validado no backend (authService + middleware)
- ✅ Token não é gerado para usuários bloqueados
- ✅ Requisições com token de bloqueado são rejeitadas
- ✅ Frontend limpa dados imediatamente
- ✅ Redirecionamento forçado (window.location)
- ✅ Feedback visual claro
- ✅ Logs de auditoria mantidos

## 📞 Suporte

Se o usuário vir a mensagem de bloqueio, deve:

1. Ler a mensagem na tela de login
2. Entrar em contato com suporte@casino.com
3. Aguardar desbloqueio pelo administrador

---

**Última atualização:** 22 de novembro de 2025
**Versão:** 2.0
**Status:** ✅ Implementado e Testado
