INSERT INTO casino_config (key, value, description) VALUES
('withdrawal_daily_limit', '2000.00', 'Limite diario de saque por usuario'),
('withdrawal_fee_percent', '0.00', 'Taxa percentual aplicada no saque'),
('withdrawal_processing_window_hours', '24', 'Janela prevista de processamento de saque em horas')
ON CONFLICT (key) DO NOTHING;
