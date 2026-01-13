-- Script para atualizar senhas dos administradores
-- Execute este script para corrigir os hashes das senhas

-- Admin Azul - CA9312206#d
UPDATE users 
SET password = '$2a$12$SOjMOpVsZNnnvAxFJZiYdu/sE0lX007EFUHVCDmJsIp7KUJRzQcLW'
WHERE email = 'pontadeflexaAzul@casino.com';

-- Admin Branco - Ti43!@#$  
UPDATE users 
SET password = '$2a$12$v2/7GuWs8yXCUJ7hjx/Lw.ch5fWgKjNx2DggGWwLCl5BYSwUt6L.W'
WHERE email = 'pontadeflexaBranco@casino.com';

-- Verificar as atualizações
SELECT email, username, role, 
       CASE WHEN length(password) > 50 THEN 'Hash válido' ELSE 'Hash inválido' END as status_senha
FROM users 
WHERE role = 'admin';