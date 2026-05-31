# 🎰 Casino Online - Render.com

Deploy rápido no Render.com em 3 passos!

## 🚀 Quick Start

### 1. Push para GitHub

```powershell
git add .
git commit -m "Deploy to Render"
git push origin main
```

### 2. Deploy no Render

1. Acesse: https://dashboard.render.com/
2. **New +** → **Blueprint**
3. Conecte repositório: `frogjackpot-hub/Projeto_frog`
4. **Apply**

### 3. Atualizar URL do Backend

Após deploy, atualize `casino-frontend/src/environments/environment.prod.ts`:

```typescript
apiUrl: "https://casino-backend-xyz.onrender.com/api";
```

Commit e push novamente.

## 📚 Documentação Completa

Veja [DEPLOY.md](./DEPLOY.md) para instruções detalhadas.

## 🔗 URLs (após deploy)

- Frontend: `https://casino-frontend.onrender.com`
- Backend: `https://casino-backend.onrender.com/api`
- Health: `https://casino-backend.onrender.com/api/health`

## ⚙️ Variáveis de Ambiente (Backend)

Configure no Render Dashboard:

- `NODE_ENV=production`
- `DATABASE_URL` (auto-preenchido)
- `JWT_SECRET` (gerar aleatório)
- `CORS_ORIGIN` (URL do frontend)

## 💰 Plano Gratuito

- ✅ Frontend: Ilimitado
- ✅ Backend: 750h/mês
- ⚠️ Database: 90 dias grátis

## 🐛 Troubleshooting

### Serviço dormindo?

Plano gratuito "dorme" após 15min. Primeiro acesso demora ~30s.

### Build falha?

```powershell
# Testar localmente
cd casino-frontend && npm ci && npm run build:prod
cd casino-backend && npm ci && npm start
```

### CORS Error?

Verifique `CORS_ORIGIN` no backend com URL exata do frontend.

---

**Dúvidas?** Consulte [DEPLOY.md](./DEPLOY.md)
