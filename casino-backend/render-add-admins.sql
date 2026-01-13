-- Script para adicionar os novos administradores no Render
-- Execute este script no Console do PostgreSQL no Render

-- Verificar usuários admin existentes
SELECT email, username, role, is_active, is_verified 
FROM users 
WHERE role = 'admin';

-- Admin Azul
-- Email: pontadeflexaAzul@casino.com
-- Senha: CA9312206#d
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified, is_active, created_at, updated_at) 
VALUES (
    'e5f6a7b8-c9d0-1234-efab-567890123456',
    'pontadeflexaAzul@casino.com',
    'pontadeflexaAzul',
    '$2a$12$SOjMOpVsZNnnvAxFJZiYdu/sE0lX007EFUHVCDmJsIp7KUJRzQcLW',
    'Ponta de Flexa',
    'Azul',
    10000.00,
    'admin',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password = '$2a$12$SOjMOpVsZNnnvAxFJZiYdu/sE0lX007EFUHVCDmJsIp7KUJRzQcLW',
    role = 'admin',
    is_active = true,
    is_verified = true,
    updated_at = NOW();

-- Admin Branco
-- Email: pontadeflexaBranco@casino.com
-- Senha: Ti43!@#$
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified, is_active, created_at, updated_at) 
VALUES (
    'f6a7b8c9-d0e1-2345-fabc-678901234567',
    'pontadeflexaBranco@casino.com',
    'pontadeflexaBranco',
    '$2a$12$v2/7GuWs8yXCUJ7hjx/Lw.ch5fWgKjNx2DggGWwLCl5BYSwUt6L.W',
    'Ponta de Flexa',
    'Branco',
    10000.00,
    'admin',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password = '$2a$12$v2/7GuWs8yXCUJ7hjx/Lw.ch5fWgKjNx2DggGWwLCl5BYSwUt6L.W',
    role = 'admin',
    is_active = true,
    is_verified = true,
    updated_at = NOW();

-- Verificar se os usuários foram criados corretamente
SELECT email, username, role, is_active, is_verified, 
       CASE WHEN length(password) > 50 THEN 'Hash válido' ELSE 'Hash inválido' END as status_senha,
       created_at
FROM users 
WHERE role = 'admin'
ORDER BY created_at;