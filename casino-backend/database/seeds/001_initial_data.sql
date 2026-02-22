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
),
(
    'd4e5f6a7-b8c9-4123-9efa-111111111111',
    'FrogJackpot',
    'frogjackpot',
    1.00,
    10000.00,
    92.00,
    'Escolha 6 cores e veja quantas acerta! Quanto mais acertos, maior o prêmio. Jackpot de 50x no 6/6!',
    '{"totalColors": 12, "selections": 6, "multipliers": {"0": 0, "1": 1, "2": 2, "3": 5, "4": 10, "5": 20, "6": 50}}'
)
ON CONFLICT (id) DO NOTHING;

-- Inserir usuários administradores
-- IMPORTANTE: Altere as senhas após o primeiro login!

-- Admin Principal
-- Email: admin@casino.com
-- Senha: Admin@123
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified) VALUES
(
    'd4e5f6a7-b8c9-0123-defa-456789012345',
    'admin@casino.com',
    'admin',
    '$2a$12$SrpZG8Qu9Ws/FWBz/GcDA.6P2gKU6EVG0Zii4ItGB8Owlkid8NhGq',
    'Administrador',
    'Sistema',
    10000.00,
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- Admin Azul
-- Email: pontadeflexaAzul@casino.com
-- Senha: CA9312206#d
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified) VALUES
(
    'e5f6a7b8-c9d0-1234-efab-567890123456',
    'pontadeflexaAzul@casino.com',
    'pontadeflexaAzul',
    '$2a$12$AF3m3NoQt5f5ZEJeS3zrDeoyDJ9AyoUyXFZpNXBtOHtn0SGLClbDe',
    'Ponta de Flexa',
    'Azul',
    10000.00,
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- Admin Branco
-- Email: pontadeflexaBranco@casino.com
-- Senha: Ti43!@#$
INSERT INTO users (id, email, username, password, first_name, last_name, balance, role, is_verified) VALUES
(
    'f6a7b8c9-d0e1-2345-fabc-678901234567',
    'pontadeflexaBranco@casino.com',
    'pontadeflexaBranco',
    '$2a$12$wyQXtCvcFw6cApXSiDHp3.7vhrycrTM0hKfRqXS0wAfbleEQBqEVK',
    'Ponta de Flexa',
    'Branco',
    10000.00,
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;