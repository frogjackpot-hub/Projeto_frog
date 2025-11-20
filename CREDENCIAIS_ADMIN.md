# 🔐 Credenciais de Acesso

## Usuário Administrador

**Email:** admin@casino.com  
**Senha:** Admin@123

**Painel Admin:** http://localhost:4200/admin/login

---

## Importante

- Não use o mesmo navegador/aba para login de usuário comum e admin
- Sempre faça logout antes de trocar entre usuário comum e admin
- Se tiver problemas de autenticação, limpe o localStorage do navegador (F12 → Application → Local Storage → Clear)

---

## Resetar senha do admin

Se precisar resetar a senha do admin, execute:

```bash
Get-Content casino-backend/fix-admin-password.sql | docker compose exec -T db psql -U user -d casino_db
```
