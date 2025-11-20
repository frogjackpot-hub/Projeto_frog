# 🐳 Guia Docker - Sistema Admin

## 🚀 Iniciar com Docker

```bash
# Subir todos os serviços
docker compose up --build

# Ou em modo detached (background)
docker compose up -d --build
```

## ⏱️ Tempo de Inicialização

- **Primeira vez:** ~2-3 minutos (build + download de imagens)
- **Próximas vezes:** ~30 segundos (apenas inicialização)

## 📦 O que acontece ao iniciar?

1. ✅ PostgreSQL sobe na porta `5432`
2. ✅ Backend executa migrações automaticamente
3. ✅ Backend executa seeds (cria usuário admin)
4. ✅ Backend inicia na porta `3000`
5. ✅ Frontend faz build e inicia na porta `4200`

## 🔐 Credenciais Admin

**URL:** http://localhost:4200/admin/login  
**Email:** admin@casino.com  
**Senha:** Admin@123

## 🌐 URLs Disponíveis

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000/api
- **Admin Login:** http://localhost:4200/admin/login
- **Admin Dashboard:** http://localhost:4200/admin/dashboard
- **Health Check:** http://localhost:3000/api/health

## 📝 Comandos Úteis

```bash
# Ver logs em tempo real
docker compose logs -f

# Ver logs apenas do backend
docker compose logs -f backend

# Ver logs apenas do frontend
docker compose logs -f frontend

# Ver logs do banco
docker compose logs -f db

# Parar todos os serviços
docker compose down

# Parar e remover volumes (limpa banco de dados)
docker compose down -v

# Reconstruir apenas um serviço
docker compose up -d --build backend

# Verificar status dos serviços
docker compose ps

# Acessar terminal do backend
docker compose exec backend sh

# Acessar terminal do banco de dados
docker compose exec db psql -U user -d casino_db
```

## 🔄 Recriar do Zero

Se precisar resetar tudo:

```bash
# Parar e remover tudo
docker compose down -v

# Limpar imagens antigas (opcional)
docker system prune -a

# Subir novamente
docker compose up --build
```

## 🐛 Problemas Comuns

### Porta já em uso?

```bash
# Ver o que está usando a porta
netstat -ano | findstr :3000
netstat -ano | findstr :4200
netstat -ano | findstr :5432

# Parar o serviço ou mudar a porta no docker-compose.yml
```

### Banco não conecta?

```bash
# Ver logs do banco
docker compose logs db

# Verificar saúde do banco
docker compose ps
```

### Backend com erro?

```bash
# Ver logs detalhados
docker compose logs backend

# Recriar apenas o backend
docker compose up -d --force-recreate backend
```

### Frontend não carrega?

```bash
# Ver logs do build
docker compose logs frontend

# Reconstruir frontend
docker compose up -d --build frontend
```

## ✅ Verificar se está funcionando

1. **Health Check:**

   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Testar Login Admin:**

   ```bash
   curl -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@casino.com","password":"Admin@123"}'
   ```

3. **Acessar Frontend:**
   - Abra: http://localhost:4200/admin/login

## 🎯 Fluxo Completo de Teste

```bash
# 1. Subir aplicação
docker compose up --build

# 2. Aguardar todos os serviços iniciarem (~2 min)
# Aguarde ver: "✅ Iniciando servidor..." nos logs

# 3. Acessar no navegador
# http://localhost:4200/admin/login

# 4. Fazer login
# Email: admin@casino.com
# Senha: Admin@123

# 5. Ver dashboard
# Você verá estatísticas e lista de usuários
```

## 🔒 Variáveis de Ambiente

Configuradas automaticamente no `docker-compose.yml`:

```yaml
ADMIN_EMAIL: admin@casino.com
ADMIN_PASSWORD: Admin@123
JWT_SECRET: supersecretjwtkey
DATABASE_URL: postgres://user:password@db:5432/casino_db
```

## 📊 Monitoramento

```bash
# Ver uso de recursos
docker stats

# Ver apenas serviços do projeto
docker compose stats
```

## 🎉 Pronto!

Após executar `docker compose up --build`, aguarde os logs mostrarem:

```
backend  | ✅ Iniciando servidor...
backend  | 🚀 Servidor rodando na porta 3000
frontend | * Listening on http://0.0.0.0:80
```

Então acesse: **http://localhost:4200/admin/login**

---

**Projeto Frog Casino** 🐸🎰
