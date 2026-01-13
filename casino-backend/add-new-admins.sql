-- Script para adicionar os novos administradores
-- Execute este script no banco de dados do Render ou local

-- Admin Azul
-- Email: pontadeflexaAzul@casino.com
-- Senha: CA9312206#d
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified, is_active) 
VALUES (
    'e5f6a7b8-c9d0-1234-efab-567890123456',
    'pontadeflexaAzul@casino.com',
    'pontadeflexaAzul',
    '$2a$12$AF3m3NoQt5f5ZEJeS3zrDeoyDJ9AyoUyXFZpNXBtOHtn0SGLClbDe',
    'Ponta de Flexa',
    'Azul',
    10000.00,
    'admin',
    true,
    true
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    role = 'admin',
    is_active = true,
    is_verified = true;

-- Admin Branco
-- Email: pontadeflexaBranco@casino.com
-- Senha: Ti43!@#$
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified, is_active) 
VALUES (
    'f6a7b8c9-d0e1-2345-fabc-678901234567',
    'pontadeflexaBranco@casino.com',
    'pontadeflexaBranco',
    '$2a$12$wyQXtCvcFw6cApXSiDHp3.7vhrycrTM0hKfRqXS0wAfbleEQBqEVK',
    'Ponta de Flexa',
    'Branco',
    10000.00,
    'admin',
    true,
    true
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    role = 'admin',
    is_active = true,
    is_verified = true;

-- Verificar os admins criados
SELECT id, email, username, role, is_active, is_verified, created_at 
FROM users 
WHERE role = 'admin';
