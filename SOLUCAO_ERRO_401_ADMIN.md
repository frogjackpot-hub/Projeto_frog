# Solução para Erro 401 - Login Admin no Render

## 🔴 Problema

Erro **401 (Unauthorized)** ao tentar fazer login no painel administrativo:

```
POST https://casino-backend-5y4k.onrender.com/api/admin/login 401
```

## 🔍 Diagnóstico

O erro ocorre porque:

1. O usuário admin pode não existir no banco de dados do Render
2. As migrations/seeds podem não ter sido executadas corretamente
3. O banco pode estar vazio

## ✅ Solução

### Opção 1: Executar via Dashboard do Render (RECOMENDADO)

1. **Acesse o Dashboard do Render:**

   - Vá para: https://dashboard.render.com
   - Selecione seu banco de dados PostgreSQL

2. **Conecte ao banco via Web Shell:**

   - Clique na aba "Shell" ou "Connect"
   - Ou use a opção "psql" para conectar

3. **Execute os comandos SQL:**

```sql
-- Verificar se o usuário admin existe
SELECT id, email, username, role, is_active
FROM users
WHERE email = 'admin@casino.com';
```

Se não retornar nada, execute:

```sql
-- Criar usuário admin
INSERT INTO users (
    id,
    email,
    username,
    password,
    first_name,
    last_name,
    balance,
    role,
    is_verified,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@casino.com',
    'admin',
    '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq',
    'Administrador',
    'Sistema',
    10000.00,
    'admin',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password = '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq',
    role = 'admin',
    is_active = true,
    is_verified = true;
```

4. **Verificar se foi criado:**

```sql
SELECT id, email, username, role, is_active
FROM users
WHERE email = 'admin@casino.com';
```

### Opção 2: Reexecutar Seeds via Backend

Se você tiver acesso SSH ao backend do Render:

```bash
# Conectar ao shell do backend
cd /app
npm run seed
```

### Opção 3: Usar arquivo SQL preparado

Use o arquivo `fix-admin-render.sql` que foi criado:

1. Acesse o banco no Render
2. Copie o conteúdo do arquivo `casino-backend/fix-admin-render.sql`
3. Cole e execute no console SQL do Render

## 🔐 Credenciais de Acesso

Após executar os comandos acima:

- **Email:** `admin@casino.com`
- **Senha:** `Admin@123`
- **URL:** `https://casino-frontend-39ni.onrender.com/admin/login`

## ✅ Verificação

Após executar os comandos:

1. Abra o console do navegador (F12)
2. Tente fazer login novamente
3. O login deve funcionar sem erro 401

## 🔧 Comandos Úteis

### Verificar estrutura da tabela users:

```sql
\d users
```

### Ver todos os usuários:

```sql
SELECT email, role, is_active FROM users;
```

### Ver todas as tabelas:

```sql
\dt
```

## 📝 Notas Importantes

- O hash da senha foi testado localmente e está correto
- A senha `Admin@123` corresponde ao hash no banco
- O problema é apenas que o usuário não existe no banco do Render

---

**Status:** Aguardando execução dos comandos SQL no banco do Render
