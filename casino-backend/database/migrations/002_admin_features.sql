-- Criação da tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Criação da tabela de configurações do cassino
CREATE TABLE IF NOT EXISTS casino_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criação da tabela de bônus
CREATE TABLE IF NOT EXISTS bonuses (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'no_deposit', 'cashback', 'free_spins')),
    value DECIMAL(10, 2) NOT NULL,
    min_deposit DECIMAL(10, 2) DEFAULT 0,
    max_bonus DECIMAL(10, 2),
    wager_requirement DECIMAL(5, 2) DEFAULT 1,
    expires_at TIMESTAMP,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bonuses_code ON bonuses(code);
CREATE INDEX IF NOT EXISTS idx_bonuses_is_active ON bonuses(is_active);

-- Inserir configurações padrão do cassino
INSERT INTO casino_config (key, value, description) VALUES
('min_bet', '1.00', 'Valor mínimo de aposta global'),
('max_bet', '1000.00', 'Valor máximo de aposta global'),
('jackpot_percentage', '0.01', 'Porcentagem que vai para o jackpot (1%)'),
('min_withdrawal', '50.00', 'Valor mínimo de saque'),
('max_withdrawal', '10000.00', 'Valor máximo de saque por transação'),
('house_edge', '0.03', 'Vantagem da casa (3%)'),
('welcome_bonus', '{"enabled": true, "percentage": 100, "max_amount": 500}', 'Configurações do bônus de boas-vindas'),
('maintenance_mode', 'false', 'Modo de manutenção ativado')
ON CONFLICT (key) DO NOTHING;

-- Adicionar campo game_id na tabela de transações caso não exista
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'game_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_transactions_game_id ON transactions(game_id);
    END IF;
END $$;

-- Adicionar campo description na tabela de transações caso não exista
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'description'
    ) THEN
        ALTER TABLE transactions ADD COLUMN description TEXT;
    END IF;
END $$;
