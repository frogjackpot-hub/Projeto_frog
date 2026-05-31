# 📋 Checklist de Deploy - Render.com

Use este checklist para garantir que tudo está pronto para o deploy.

## ✅ Pré-Deploy

- [x] `render.yaml` criado na raiz
- [x] Scripts de build adicionados no `package.json`
- [x] `environment.prod.ts` configurado
- [x] CORS configurado no backend
- [x] `.env.production` criado (template)
- [x] `.gitignore` protege arquivos `.env`
- [x] Migrations configuradas para rodar automaticamente

## 📝 Passos do Deploy

### 1. Preparação Local

```powershell
# Testar build do frontend
cd casino-frontend
npm ci
npm run build:prod
cd ..

# Testar backend
cd casino-backend
npm ci
npm test
cd ..
```

### 2. Git Push

```powershell
git add .
git commit -m "Configuração para deploy no Render.com"
git push origin main
```

### 3. Deploy no Render

1. Acesse: https://dashboard.render.com/
2. Clique em **"New +"** → **"Blueprint"**
3. Conecte o repositório: `frogjackpot-hub/Projeto_frog`
4. Clique em **"Apply"**
5. Aguarde deploy (~5-10 minutos)

### 4. Pós-Deploy

1. Copie a URL do backend (ex: `https://casino-backend-xyz.onrender.com`)
2. Atualize `casino-frontend/src/environments/environment.prod.ts`:
   ```typescript
   apiUrl: "https://casino-backend-xyz.onrender.com/api";
   ```
3. Commit e push:
   ```powershell
   git add casino-frontend/src/environments/environment.prod.ts
   git commit -m "Atualizar URL do backend em produção"
   git push origin main
   ```
4. Aguarde re-deploy automático do frontend

### 5. Configurar Variáveis (se não auto-configuradas)

No Render Dashboard → Backend Service → Environment:

- `NODE_ENV=production`
- `DATABASE_URL` (auto-preenchido)
- `JWT_SECRET` (gerar com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `CORS_ORIGIN` (URL do frontend, ex: `https://casino-frontend-xyz.onrender.com`)

### 6. Verificar

- [ ] Database: Status "Available" (verde)
- [ ] Backend: Status "Live" (verde)
- [ ] Frontend: Status "Live" (verde)
- [ ] Health check: `https://casino-backend-xyz.onrender.com/api/health`
- [ ] Frontend acessível: `https://casino-frontend-xyz.onrender.com`

### 7. Testes

- [ ] Abrir frontend no navegador
- [ ] Fazer registro de novo usuário
- [ ] Fazer login
- [ ] Testar navegação (Dashboard, Games, Wallet)
- [ ] Verificar console do navegador (sem erros CORS)

## 🐛 Troubleshooting Rápido

### Backend não inicia

```powershell
# Ver logs no Render Dashboard
# Verificar:
# - DATABASE_URL está configurada?
# - Migrations rodaram? (ver logs de build)
```

### CORS Error

```powershell
# No Render Dashboard → Backend → Environment
# Verificar CORS_ORIGIN tem URL EXATA do frontend
CORS_ORIGIN=https://casino-frontend-xyz.onrender.com
```

### Frontend retorna 404

```powershell
# No Render Dashboard → Frontend → Redirects/Rewrites
# Adicionar regra:
# Source: /*
# Destination: /index.html
# Action: Rewrite
```

### Database Connection Error

```powershell
# Aguardar 2-3 minutos após criar banco
# Verificar DATABASE_URL no backend
# Checar logs do backend
```

## 📊 Monitoramento

### URLs importantes

- Frontend: `https://casino-frontend-xyz.onrender.com`
- Backend: `https://casino-backend-xyz.onrender.com/api`
- Health: `https://casino-backend-xyz.onrender.com/api/health`
- Dashboard Render: https://dashboard.render.com/

### Logs em tempo real

1. Render Dashboard
2. Selecione o serviço (backend ou frontend)
3. Tab "Logs"

## 🎉 Deploy Concluído!

Se todos os checkboxes estão marcados, parabéns! 🎰

**Próximos passos:**

1. Compartilhar URLs com equipe
2. Configurar domínio customizado (opcional)
3. Adicionar analytics
4. Configurar backup do database
5. Monitorar performance

---

**Documentação completa:** [DEPLOY.md](./DEPLOY.md)  
**Quick Start:** [RENDER_QUICKSTART.md](./RENDER_QUICKSTART.md)
