# 🗄️ Criando Novo Banco PostgreSQL no Render

## 📋 Passo a Passo Completo

### Etapa 1: Acessar Dashboard do Render

1. Acesse: [dashboard.render.com](https://dashboard.render.com)
2. Faça login com sua conta
3. Você verá sua lista de serviços

### Etapa 2: Criar Novo Banco de Dados

1. Clique no botão **"+ New"** (canto superior direito)
2. Selecione **"PostgreSQL"**

### Etapa 3: Configurar o Banco

Preencha os campos:

| Campo                  | Valor Sugerido    | Descrição                   |
| ---------------------- | ----------------- | --------------------------- |
| **Name**               | `casino-database` | Nome do seu banco no Render |
| **Database**           | `casino_db`       | Nome da database interna    |
| **User**               | `casino_user`     | Usuário do banco            |
| **Region**             | `Ohio (US East)`  | Mesma região do backend     |
| **PostgreSQL Version** | `15` (padrão)     | Versão mais recente         |
| **Datadog API Key**    | (deixar vazio)    | Não precisa                 |

### Etapa 4: Escolher Plano

- **Free**: $0/mês - ⚠️ Suspende após 90 dias de inatividade
- **Starter**: $7/mês - Não suspende, melhor para produção

**Recomendação**: Free para teste, Starter para produção.

### Etapa 5: Criar Banco

1. Clique em **"Create Database"**
2. ⏳ Aguarde 2-3 minutos para criação
3. Status mudará de "Creating" para "Available"

### Etapa 6: Copiar Credenciais

Quando criado, você verá:

- **Hostname**: `dpg-xxxxxxxxx-a.ohio-postgres.render.com`
- **Database**: `casino_db`
- **Username**: `casino_user`
- **Password**: (gerada automaticamente)
- **Port**: `5432`

### Etapa 7: Copiar URLs de Conexão

Você verá duas URLs importantes:

#### 🔒 Internal Database URL (USE ESTA)

```
postgres://casino_user:senha_aqui@dpg-xxxxxxxxx-a/casino_db
```

#### 🌐 External Database URL (não usar no backend)

```
postgres://casino_user:senha_aqui@dpg-xxxxxxxxx-a.ohio-postgres.render.com:5432/casino_db
```

⚠️ **IMPORTANTE**: Use sempre a **Internal URL** para conectar do backend!

---

## 🔧 Etapa 8: Atualizar Backend

### 8.1: Configurar Variável de Ambiente

1. Vá para seu serviço **casino-backend** no Render
2. Clique na aba **"Environment"**
3. Encontre a variável `DATABASE_URL`
4. **Substitua** o valor pela nova **Internal Database URL**
5. Clique em **"Save Changes"**

### 8.2: Aguardar Redeploy

- O Render fará redeploy automático
- ⏳ Aguarde 2-3 minutos
- Logs mostrarão "Build successful" e depois "Live"

---

## ✅ Etapa 9: Verificar se Funcionou

### 9.1: Verificar Logs do Backend

No seu serviço `casino-backend`:

1. Vá na aba **"Logs"**
2. Procure por:
   - ✅ "Migrações executadas com sucesso"
   - ✅ "Seeds executados com sucesso"
   - ✅ "Servidor rodando na porta 3000"

### 9.2: Testar Conexão

Se os logs mostrarem sucesso, teste:

1. Acesse seu frontend
2. Tente fazer login admin
3. Deve funcionar normalmente

---

## 🚨 Se Der Erro Ainda

### Erro comum: "relation does not exist"

```bash
# Significa que as tabelas não foram criadas
# Solução: Rodar migrações manualmente
```

### Como rodar migrações manualmente:

1. No serviço `casino-backend`, vá em **"Shell"**
2. Clique em **"Launch Shell"**
3. Execute:

```bash
npm run migrate
npm run seed
```

---

## 📝 Resumo das Credenciais

Anote suas informações (substitua pelos valores reais):

```env
DATABASE_URL=postgres://casino_user:SUA_SENHA@dpg-XXXXXXXX-a/casino_db
```

**Outras variáveis importantes que devem estar configuradas:**

```env
TELEGRAM_BOT_TOKEN=<SEU_TELEGRAM_BOT_TOKEN>
TELEGRAM_CHAT_ID=<SEU_TELEGRAM_CHAT_ID>
JWT_SECRET=sua-chave-secreta-jwt
NODE_ENV=production
CORS_ORIGIN=https://seu-frontend.onrender.com
```

---

## ❓ Precisa de Ajuda?

Se encontrar algum problema:

1. ✅ Verifique se a `DATABASE_URL` está correta
2. ✅ Verifique se o banco está "Available" no Render
3. ✅ Verifique os logs do backend para erros específicos

**Próximo passo**: Depois que o banco estiver funcionando, poderemos testar as notificações do Telegram!
