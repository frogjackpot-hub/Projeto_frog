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
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'Roleta Europeia',
    'roulette',
    5.00,
    500.00,
    97.30,
    'Roleta europeia com um zero, oferecendo melhores odds para o jogador',
    '{"type": "european", "numbers": 37, "zero_count": 1}'
),
(
    'c3d4e5f6-a7b8-9012-cdef-345678901234',
    'Blackjack Clássico',
    'blackjack',
    10.00,
    1000.00,
    99.50,
    'Blackjack tradicional com regras padrão',
    '{"decks": 6, "dealer_stands_on": "soft_17", "blackjack_pays": "3:2"}'
);

-- Inserir usuário administrador padrão (senha: Ti43!@#$)
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified) VALUES
(
    'd4e5f6a7-b8c9-0123-defa-456789012345',
    'admin@gmail.com',
    'admin',
    '$2a$12$zCqPJXy.2j0Dtb0A64fPRuleXTx3Cz5K2FQggbZDGdINz/ifeiwCe',
    'Administrador',
    'Sistema',
    10000.00,
    'admin',
    true
);