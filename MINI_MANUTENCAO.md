# Mini guia de manutencao

## Subir tudo e validar

No PowerShell, na raiz do projeto:

```powershell
.\dev-up-health.ps1
```

Esse comando:

- sobe os containers com build
- valida backend na porta 3000
- valida frontend na porta 4200
- testa o health check da API

## URLs locais

- Frontend: http://localhost:4200
- Backend health: http://localhost:3000/api/health
- Dashboard: http://localhost:4200/dashboard
- Login: http://localhost:4200/auth/login

## Ver status dos containers

```powershell
docker compose ps
```

## Ver logs

Logs gerais:

```powershell
docker compose logs -f
```

Logs so do backend:

```powershell
docker compose logs -f backend
```

Logs so do frontend:

```powershell
docker compose logs -f frontend
```

## Parar tudo

```powershell
docker compose down
```

## Reiniciar tudo

```powershell
docker compose down
docker compose up -d --build
```

## Quando localhost:4200 nao abrir

Checklist rapido:

1. Rode `.\dev-up-health.ps1`.
2. Confira se o container `frontend` aparece no `docker compose ps`.
3. Se nao aparecer, veja `docker compose logs -f frontend`.
4. Se a porta 4200 estiver fechada, o frontend nao terminou de subir.

## Quando localhost:3000 nao responder

1. Rode `.\dev-up-health.ps1`.
2. Confira se o container `backend` aparece no `docker compose ps`.
3. Veja `docker compose logs -f backend`.
4. Confira se o banco esta `healthy` no `docker compose ps`.

## Observacoes importantes

- O frontend usa Dockerfile proprio em `casino-frontend/Dockerfile`.
- O script `dev-up-health.ps1` ja faz retry no health check do backend para evitar falso erro logo apos reiniciar.
- Se mudar dependencias do frontend ou backend, rode build de novo com `docker compose up -d --build`.

## Arquivos uteis

- Script principal de subida e teste: `dev-up-health.ps1`
- Compose do projeto: `docker-compose.yml`
- Docker do frontend: `casino-frontend/Dockerfile`
- Docker do backend: `casino-backend/Dockerfile`

## Comando mais importante

Se estiver em duvida, use sempre:

```powershell
.\dev-up-health.ps1
```
