-- Script para verificar e corrigir usuário admin no banco de dados
-- Execute este script no banco de dados do Render

-- 1. Verificar se o usuário admin existe
SELECT 
    id, 
    email, 
    username, 
    role, 
    is_active,
    is_verified,
    length(password) as password_length,
    created_at
FROM users 
WHERE email = 'admin@casino.com' OR role = 'admin';

-- Se não existir, criar o usuário admin:
-- (Descomente as linhas abaixo se o usuário não existir)

/*
INSERT INTO users (
    id, 
    email, 
    username, 
    password, 
    first_name, 
    last_name, 
    balance, 
    role, 
    is_verified,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@casino.com',
    'admin',
    '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq',
    'Administrador',
    'Sistema',
    10000.00,
    'admin',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password = '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq',
    role = 'admin',
    is_active = true,
    is_verified = true;
*/

-- 2. Se o usuário existir mas a senha estiver errada, atualizar:
/*
UPDATE users 
SET password = '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq',
    role = 'admin',
    is_active = true,
    is_verified = true
WHERE email = 'admin@casino.com';
*/

-- 3. Verificar novamente após a atualização
SELECT 
    id, 
    email, 
    username, 
    role, 
    is_active,
    is_verified,
    length(password) as password_length
FROM users 
WHERE email = 'admin@casino.com';

-- Credenciais:
-- Email: admin@casino.com
-- Senha: Admin@123
