-- Inserir jogos iniciais
INSERT INTO games (id, name, type, min_bet, max_bet, rtp, description, rules) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Slot Clássico',
    'slot',
    1.00,
    100.00,
    95.50,
    'Um slot machine clássico com 3 rolos e símbolos tradicionais',
    '{"paylines": 1, "reels": 3, "symbols": ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"]}'
),
(
    'b2c3d4e5-f6g7-8901-bcde-f23456789012',
    'Roleta Europeia',
    'roulette',
    5.00,
    500.00,
    97.30,
    'Roleta europeia com um zero, oferecendo melhores odds para o jogador',
    '{"type": "european", "numbers": 37, "zero_count": 1}'
),
(
    'c3d4e5f6-g7h8-9012-cdef-345678901234',
    'Blackjack Clássico',
    'blackjack',
    10.00,
    1000.00,
    99.50,
    'Blackjack tradicional com regras padrão',
    '{"decks": 6, "dealer_stands_on": "soft_17", "blackjack_pays": "3:2"}'
);

-- Inserir usuário administrador padrão (senha: Admin123!)
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified) VALUES
(
    'd4e5f6g7-h8i9-0123-defg-456789012345',
    'admin@casino.com',
    'admin',
    '$2a$12$LQv3c1yqBw2jo6H1PAmi/.jigocJ9cxHljs8J/RCBbkUbdwQr19hS',
    'Administrador',
    'Sistema',
    10000.00,
    'admin',
    true
);