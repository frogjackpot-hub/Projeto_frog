-- ============================================
-- Sistema de Parceiros / Afiliados
-- ============================================

-- Tabela de parceiros (perfil de afiliado vinculado a um usuário)
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    commission_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' ou 'fixed'
    commission_value NUMERIC(10,2) DEFAULT 5.00, -- % ou valor fixo em R$
    commission_threshold NUMERIC(10,2) DEFAULT 0.00, -- valor mínimo de perda para gerar comissão (para tipo fixed)
    is_active BOOLEAN DEFAULT true,
    total_referred_users INTEGER DEFAULT 0,
    total_commissions_earned NUMERIC(12,2) DEFAULT 0.00,
    commission_balance NUMERIC(12,2) DEFAULT 0.00, -- saldo disponível para saque
    pending_commission NUMERIC(12,2) DEFAULT 0.00, -- comissões aguardando validação
    validation_period_hours INTEGER DEFAULT 24, -- período de validação em horas
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de comissões (histórico detalhado de cada comissão)
CREATE TABLE IF NOT EXISTS partner_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id),
    referred_user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id),
    bet_amount NUMERIC(10,2) NOT NULL,
    loss_amount NUMERIC(10,2) NOT NULL, -- perda líquida do jogador nessa rodada
    commission_amount NUMERIC(10,2) NOT NULL,
    commission_type VARCHAR(20) NOT NULL, -- tipo usado no cálculo
    commission_value NUMERIC(10,2) NOT NULL, -- valor/% usado no cálculo
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'cancelled'
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de solicitações de saque de comissões
CREATE TABLE IF NOT EXISTS partner_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id),
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by UUID REFERENCES users(id), -- admin que aprovou/rejeitou
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar campo de referência na tabela de usuários
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'referred_by'
    ) THEN
        ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES partners(id);
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_referred_user ON partner_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_created_at ON partner_commissions(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_withdrawals_partner_id ON partner_withdrawals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_withdrawals_status ON partner_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_withdrawals_updated_at ON partner_withdrawals;
CREATE TRIGGER update_partner_withdrawals_updated_at BEFORE UPDATE ON partner_withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
