-- Configuração de caixa operacional da casa (separado do saldo dos usuários)
INSERT INTO casino_config (key, value, description)
VALUES (
  'house_operational_balance',
  '10000.00',
  'Caixa operacional real da casa para cobertura de operações (não inclui passivo de saldo dos usuários)'
)
ON CONFLICT (key) DO NOTHING;
