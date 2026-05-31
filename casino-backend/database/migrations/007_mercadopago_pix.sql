ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS external_reference VARCHAR(120),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS provider_metadata JSONB,
  ADD COLUMN IF NOT EXISTS webhook_payload JSONB,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_payment_id ON transactions(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_reference ON transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_provider ON transactions(payment_provider);
