-- Inserir logs de auditoria de exemplo
-- Nota: Substitua o admin_id pelo UUID do seu admin real

-- Buscar o ID do admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Pegar o ID do usuário admin
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- Se encontrou um admin, inserir logs de exemplo
    IF admin_user_id IS NOT NULL THEN
        -- Log de login
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'ADMIN_LOGIN',
            'auth',
            admin_user_id,
            '{"success": true, "method": "password"}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '2 hours'
        );
        
        -- Log de atualização de usuário
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'UPDATE_USER',
            'user',
            (SELECT id FROM users WHERE role = 'player' LIMIT 1),
            '{"field": "balance", "old_value": 100, "new_value": 150}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '1 hour 30 minutes'
        );
        
        -- Log de adição de saldo
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'ADD_BALANCE',
            'user',
            (SELECT id FROM users WHERE role = 'player' LIMIT 1),
            '{"amount": 500, "reason": "Bônus administrativo"}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '1 hour'
        );
        
        -- Log de atualização de jogo
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'UPDATE_GAME',
            'game',
            (SELECT id FROM games LIMIT 1),
            '{"field": "rtp", "old_value": 96.5, "new_value": 97.0}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '45 minutes'
        );
        
        -- Log de atualização de configuração
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'UPDATE_CONFIG',
            'config',
            NULL,
            '{"key": "min_bet", "old_value": "1.00", "new_value": "2.00"}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '30 minutes'
        );
        
        -- Log de bloqueio de usuário
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'BLOCK_USER',
            'user',
            (SELECT id FROM users WHERE role = 'player' LIMIT 1 OFFSET 1),
            '{"reason": "Suspeita de fraude", "duration": "permanent"}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '15 minutes'
        );
        
        -- Log de criação de bônus
        INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        VALUES (
            gen_random_uuid(),
            admin_user_id,
            'CREATE_BONUS',
            'bonus',
            gen_random_uuid(),
            '{"code": "WELCOME100", "type": "deposit", "value": 100}',
            '127.0.0.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            NOW() - INTERVAL '10 minutes'
        );
        
        RAISE NOTICE 'Logs de auditoria de exemplo inseridos com sucesso!';
    ELSE
        RAISE NOTICE 'Nenhum usuário admin encontrado. Execute as seeds de usuários primeiro.';
    END IF;
END $$;
