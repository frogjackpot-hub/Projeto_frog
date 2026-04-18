-- ============================================
-- Niveis de parceiro (manual + automatico)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'partners' AND column_name = 'partner_level'
    ) THEN
        ALTER TABLE partners ADD COLUMN partner_level VARCHAR(20) DEFAULT 'bronze';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'partners' AND column_name = 'level_mode'
    ) THEN
        ALTER TABLE partners ADD COLUMN level_mode VARCHAR(20) DEFAULT 'auto';
    END IF;
END $$;

ALTER TABLE partners
    DROP CONSTRAINT IF EXISTS chk_partners_level;

ALTER TABLE partners
    ADD CONSTRAINT chk_partners_level
    CHECK (partner_level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));

ALTER TABLE partners
    DROP CONSTRAINT IF EXISTS chk_partners_level_mode;

ALTER TABLE partners
    ADD CONSTRAINT chk_partners_level_mode
    CHECK (level_mode IN ('auto', 'manual'));

UPDATE partners
SET partner_level = 'bronze'
WHERE partner_level IS NULL;

UPDATE partners
SET level_mode = 'auto'
WHERE level_mode IS NULL;