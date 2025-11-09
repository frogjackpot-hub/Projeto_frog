# 🚀 Guia de Deploy no Render.com

Este guia explica como fazer deploy completo do Casino Online no Render.com (Frontend + Backend + Database).

## 📋 Pré-requisitos

- ✅ Conta no [Render.com](https://render.com) (gratuita)
- ✅ Repositório no GitHub com o código atualizado
- ✅ Git instalado localmente

---

## 🎯 Visão Geral

O deploy incluirá:

1. **PostgreSQL Database** (90 dias gratuitos, renovável)
2. **Backend API** (Node.js/Express)
3. **Frontend** (Angular - Static Site)

---

## 📦 Método 1: Deploy Automático com Blueprint (Recomendado)

### Passo 1: Push do código para GitHub

```powershell
# Adicionar todos os arquivos
git add .

# Commitar as mudanças
git commit -m "Configuração para deploy no Render.com"

# Push para o repositório
git push origin main
```

### Passo 2: Deploy via Blueprint

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em **"New +"** → **"Blueprint"**
3. Conecte seu repositório GitHub (`frogjackpot-hub/Projeto_frog`)
4. O Render detectará automaticamente o arquivo `render.yaml`
5. Clique em **"Apply"**

O Render criará automaticamente:

- ✅ Database PostgreSQL
- ✅ Backend Web Service
- ✅ Frontend Static Site

### Passo 3: Aguardar o Deploy

- O processo leva cerca de 5-10 minutos
- Você verá os logs em tempo real
- Aguarde até todos os serviços mostrarem "Live" (verde)

### Passo 4: Atualizar URLs

Após o deploy, você receberá URLs como:

- Backend: `https://casino-backend-xyz.onrender.com`
- Frontend: `https://casino-frontend-xyz.onrender.com`

**Importante:** Atualize o arquivo `environment.prod.ts` com a URL real do backend:

```typescript
export const environment = {
  production: true,
  apiUrl: "https://casino-backend-xyz.onrender.com/api", // URL real aqui
  appName: "Casino Online",
  version: "1.0.0",
};
```

Depois faça commit e push:

```powershell
git add casino-frontend/src/environments/environment.prod.ts
git commit -m "Atualizar URL do backend"
git push origin main
```

O Render fará re-deploy automático do frontend.

---

## 📦 Método 2: Deploy Manual (Alternativo)

### 1. Criar Database

1. No Render Dashboard, clique em **"New +"** → **"PostgreSQL"**
2. Preencha:
   - **Name:** `casino-db`
   - **Database:** `casino_db`
   - **User:** `casino_user`
   - **Region:** Oregon (mais próximo)
   - **Plan:** Free
3. Clique em **"Create Database"**
4. Copie a **Internal Database URL** (usaremos no backend)

### 2. Criar Backend

1. Clique em **"New +"** → **"Web Service"**
2. Conecte o repositório GitHub
3. Configure:

   - **Name:** `casino-backend`
   - **Region:** Oregon
   - **Branch:** main
   - **Root Directory:** `.` (raiz)
   - **Runtime:** Node
   - **Build Command:** `cd casino-backend && npm ci && npm run migrate`
   - **Start Command:** `cd casino-backend && npm start`
   - **Plan:** Free

4. **Environment Variables:**

   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=[colar URL do database]
   JWT_SECRET=[gerar uma chave segura aleatória]
   CORS_ORIGIN=https://casino-frontend-xyz.onrender.com
   ```

5. Clique em **"Create Web Service"**

### 3. Criar Frontend

1. Clique em **"New +"** → **"Static Site"**
2. Conecte o mesmo repositório
3. Configure:

   - **Name:** `casino-frontend`
   - **Region:** Oregon
   - **Branch:** main
   - **Root Directory:** `.`
   - **Build Command:** `cd casino-frontend && npm ci && npm run build:prod`
   - **Publish Directory:** `casino-frontend/dist/casino-frontend/browser`

4. **Routes (SPA):** Adicione regra de rewrite para Angular:

   - Em **Settings** → **Redirects/Rewrites**
   - Add Rule: `/*` → `/index.html` (Rewrite)

5. Clique em **"Create Static Site"**

---

## ⚙️ Configurações Importantes

### CORS

O backend precisa aceitar requests do frontend. Já está configurado em `casino-backend/src/config/index.js`:

```javascript
cors: {
  origin: process.env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
}
```

No Render, adicione a variável `CORS_ORIGIN` com a URL do frontend.

### Health Check

O backend tem endpoint de health check em `/api/health`. O Render usa isso para monitorar o serviço.

### Migrations

As migrations rodam automaticamente no deploy (via `postinstall` no `package.json`).

---

## 🔄 Auto-Deploy

O Render está configurado para fazer deploy automático quando você fizer push para a branch `main`.

```powershell
# Fazer alterações no código
git add .
git commit -m "Sua mensagem"
git push origin main

# O Render detecta e faz deploy automaticamente
```

---

## 🐛 Troubleshooting

### Backend não inicia

1. Verifique os logs no Dashboard do Render
2. Confirme que `DATABASE_URL` está configurada
3. Verifique se as migrations rodaram (logs de build)

```powershell
# Ver logs em tempo real
# No Dashboard → Seu serviço → Logs
```

### Frontend não carrega API

1. Verifique se a URL em `environment.prod.ts` está correta
2. Confirme que o CORS está configurado no backend
3. Teste o backend diretamente: `https://casino-backend-xyz.onrender.com/api/health`

### Database - "Connection refused"

1. Verifique se o banco está "Available" (verde)
2. Confirme que a `DATABASE_URL` está correta no backend
3. Aguarde 2-3 minutos após criar o banco (provisionamento)

### Build falha

**Frontend:**

```powershell
# Testar build localmente
cd casino-frontend
npm ci
npm run build:prod
```

**Backend:**

```powershell
# Testar localmente
cd casino-backend
npm ci
npm run migrate
npm start
```

### Serviço "dormindo" (Free Tier)

O plano gratuito do Render "dorme" após 15 minutos de inatividade. O primeiro acesso após dormir demora ~30 segundos para acordar.

**Soluções:**

- Usar um serviço de "ping" (ex: UptimeRobot) para manter ativo
- Upgrade para plano pago ($7/mês por serviço)

---

## 💰 Custos

### Plano Gratuito

- **Static Sites:** Ilimitados ✅
- **Web Services:** 750h/mês (suficiente para 1 serviço 24/7) ✅
- **PostgreSQL:** 90 dias grátis, depois expira ⚠️

### Após 90 dias (Database)

- **Opção 1:** Criar novo database e migrar dados (renovar trial)
- **Opção 2:** Upgrade para PostgreSQL pago ($7/mês)
- **Opção 3:** Migrar database para outro serviço (ElephantSQL, Neon, Supabase)

---

## 🔐 Segurança

### Variáveis de Ambiente

❌ **NUNCA** commite arquivos `.env` com secrets reais:

```powershell
# Já está no .gitignore
.env
.env.production
.env.local
```

### JWT Secret

Gere uma chave forte:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use essa chave na variável `JWT_SECRET` no Render.

### HTTPS

Render fornece SSL/HTTPS automático e gratuito. Todos os serviços usam HTTPS.

---

## 📊 Monitoramento

### Logs

Acesse logs em tempo real no Dashboard:

- **Backend:** Dashboard → casino-backend → Logs
- **Frontend:** Dashboard → casino-frontend → Logs

### Métricas

O Render mostra:

- CPU/Memory usage
- Request count
- Response times
- Deploy history

---

## 🚀 Comandos Úteis

### Local Development

```powershell
# Frontend
cd casino-frontend
npm install
npm start

# Backend
cd casino-backend
npm install
npm run dev
```

### Build de Produção Local

```powershell
# Frontend
cd casino-frontend
npm run build:prod

# Backend (verificar)
cd casino-backend
npm ci
npm run migrate
npm start
```

### Git

```powershell
# Ver status
git status

# Add + Commit + Push
git add .
git commit -m "Deploy to Render"
git push origin main
```

---

## 🔗 Links Úteis

- [Render Docs](https://render.com/docs)
- [Render Blueprints](https://render.com/docs/blueprint-spec)
- [Render Free Tier](https://render.com/docs/free)
- [PostgreSQL on Render](https://render.com/docs/databases)

---

## ✅ Checklist de Deploy

- [ ] Código commitado e pushed para GitHub
- [ ] `render.yaml` na raiz do repositório
- [ ] Blueprint aplicado no Render
- [ ] Database criado e "Available"
- [ ] Backend com status "Live" (verde)
- [ ] Frontend com status "Live" (verde)
- [ ] URL do backend atualizada em `environment.prod.ts`
- [ ] Teste: Acessar frontend e fazer login/registro
- [ ] CORS configurado corretamente
- [ ] Health check funcionando: `/api/health`

---

## 🎉 Pronto!

Seu Casino Online está no ar! 🎰

**URLs:**

- Frontend: `https://casino-frontend.onrender.com`
- Backend API: `https://casino-backend.onrender.com/api`
- Health Check: `https://casino-backend.onrender.com/api/health`

**Próximos Passos:**

1. Testar todas as funcionalidades
2. Configurar domínio customizado (opcional)
3. Adicionar analytics (Google Analytics, Sentry, etc.)
4. Configurar backup do database
5. Otimizar performance (cache, CDN, etc.)

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no Render Dashboard
2. Consulte a [documentação do Render](https://render.com/docs)
3. Teste localmente primeiro (`npm run dev`)

---

**Desenvolvido com ❤️ para Render.com**
