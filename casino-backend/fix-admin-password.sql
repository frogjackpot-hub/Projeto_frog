-- Atualizar senha do admin para: Admin@123
UPDATE users 
SET password = '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq' 
WHERE email = 'admin@casino.com';

-- Verificar
SELECT email, role, length(password) as pwd_length, is_active 
FROM users 
WHERE email = 'admin@casino.com';
